// Backend API integration helpers for event creation
import { EventFormData, VenueTicketConfig, CreateEventResponse, KycStatus } from "../types/event";

// Cloud Function URLs from environment
const UPSERT_EVENT_URL = process.env.NEXT_PUBLIC_UPSERT_EVENT_URL || "";
const GET_KYC_STATUS_URL = process.env.NEXT_PUBLIC_GET_KYC_STATUS_URL || "";
const GET_EVENT_URL = process.env.NEXT_PUBLIC_GET_EVENT_URL || "";

/**
 * Helper to get authentication headers from cookies
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const sessionId = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sessionId="))
    ?.split("=")[1];
  
  const sessionKey = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sessionKey="))
    ?.split("=")[1];

  return {
    "Content-Type": "application/json",
    "x-session-id": sessionId || "",
    "x-session-key": sessionKey || "",
  };
}

/**
 * Helper to format event data for backend
 */
function formatEventForBackend(formData: Partial<EventFormData>, ticketConfigs: VenueTicketConfig[]) {
  return {
    basicDetails: {
      title: formData.title || "",
      description: formData.description || "",
      genres: formData.genres || [],
      languages: formData.languages || [],
      ageLimit: formData.ageLimit || "",
      durationMinutes: formData.durationUnit === "hours" 
        ? (formData.duration || 0) * 60 
        : (formData.duration || 0),
      termsAccepted: formData.termsAccepted || false,
      termsText: formData.termsText || "",
      coverWideUrl: formData.coverPhotoWide || "",
      coverPortraitUrl: formData.coverPhotoPortrait || "",
    },
    schedule: {
      locations: formData.locations || [],
    },
    tickets: {
      venueConfigs: ticketConfigs,
    },
  };
}

/**
 * Save event as draft using upsertEvent function
 */
export async function saveEventDraft(
  formData: Partial<EventFormData>,
  ticketConfigs: VenueTicketConfig[],
  eventId?: string
): Promise<{ success: boolean; eventId: string; lastSaved: Date }> {
  console.log("🔵 saveEventDraft called", { eventId, hasTitle: !!formData.title });
  
  if (!UPSERT_EVENT_URL) {
    console.error("❌ UPSERT_EVENT_URL is not defined!");
    throw new Error("API endpoint not configured. Check NEXT_PUBLIC_UPSERT_EVENT_URL in .env.local");
  }
  
  const headers = await getAuthHeaders();
  const headersObj = headers as Record<string, string>;
  console.log("🔵 Headers prepared", { 
    hasSessionId: !!headersObj["x-session-id"], 
    hasSessionKey: !!headersObj["x-session-key"] 
  });
  
  const payload = {
    mode: "draft" as const,
    eventId,
    ...formatEventForBackend(formData, ticketConfigs),
  };
  
  console.log("🔵 Sending request to:", UPSERT_EVENT_URL);
  console.log("🔵 Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(UPSERT_EVENT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log("🔵 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.message || `Failed to save draft (${response.status})`);
      } catch (e) {
        throw new Error(`Failed to save draft: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("✅ Draft saved successfully:", data);
    
    return {
      success: true,
      eventId: data.eventId,
      lastSaved: new Date(data.lastSaved || new Date()),
    };
  } catch (error) {
    console.error("❌ saveEventDraft error:", error);
    throw error;
  }
}

/**
 * Host event (publish) using upsertEvent function
 */
export async function hostEvent(
  formData: Partial<EventFormData>,
  ticketConfigs: VenueTicketConfig[],
  eventId?: string
): Promise<CreateEventResponse> {
  console.log("🟢 hostEvent called", { eventId });
  
  if (!UPSERT_EVENT_URL) {
    console.error("❌ UPSERT_EVENT_URL is not defined!");
    throw new Error("API endpoint not configured. Check NEXT_PUBLIC_UPSERT_EVENT_URL in .env.local");
  }
  
  const headers = await getAuthHeaders();
  const payload = {
    mode: "publish" as const,
    eventId,
    ...formatEventForBackend(formData, ticketConfigs),
  };
  
  console.log("🟢 Sending publish request to:", UPSERT_EVENT_URL);

  try {
    const response = await fetch(UPSERT_EVENT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    
      console.log("🟢 Response status:", response.status);

    const data = await response.json();
    console.log("🟢 Response data:", data);

    // Handle KYC not verified
    if (data.error === "KYC_NOT_VERIFIED") {
      console.log("⚠️ KYC not verified, saved as draft");
      return {
        success: false,
        status: "kyc_required",
        message: data.message,
        errors: [],
        eventId: data.eventId,
      };
    }

    // Handle validation errors
    if (data.error === "VALIDATION_FAILED") {
      console.log("⚠️ Validation failed:", data.details);
      // Convert backend error format to frontend format
      const errors = Object.entries(data.details || {}).map(([field, message]) => ({
        field,
        message: message as string,
        step: getStepFromField(field),
      }));

      return {
        success: false,
        status: "draft",
        message: data.message,
        errors,
      };
    }

    // Handle other errors
    if (!response.ok) {
      console.error("❌ Host event failed:", data);
      throw new Error(data.message || "Failed to host event");
    }

    console.log("✅ Event hosted successfully");
    return {
      success: true,
      eventId: data.eventId,
      status: "hosted",
    };
  } catch (error) {
    console.error("❌ hostEvent error:", error);
    throw error;
  }
}

/**
 * Helper to determine which step an error belongs to
 */
function getStepFromField(field: string): number {
  if (field.startsWith("basicDetails")) return 1;
  if (field.startsWith("schedule")) return 2;
  if (field.startsWith("tickets")) return 3;
  return 1;
}

/**
 * Fetch KYC status using session credentials
 */
export async function getKycStatus(): Promise<KycStatus> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(GET_KYC_STATUS_URL, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      console.error("Failed to fetch KYC status");
      return "not_started";
    }

    const data = await response.json();
    return data.kycStatus || "not_started";
  } catch (error) {
    console.error("Error fetching KYC status:", error);
    return "not_started";
  }
}

/**
 * Fetch event data (from draft or published)
 */
export async function fetchEvent(eventId: string): Promise<Partial<EventFormData> | null> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${GET_EVENT_URL}?eventId=${eventId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error("Failed to fetch event:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.success || !data.event) {
      return null;
    }

    // Convert backend format to frontend format
    const event = data.event;
    
    return {
      title: event.basicDetails?.title || "",
      description: event.basicDetails?.description || "",
      genres: event.basicDetails?.genres || [],
      languages: event.basicDetails?.languages || [],
      ageLimit: event.basicDetails?.ageLimit || "",
      duration: event.basicDetails?.durationMinutes 
        ? event.basicDetails.durationMinutes >= 60 
          ? event.basicDetails.durationMinutes / 60 
          : event.basicDetails.durationMinutes
        : 0,
      durationUnit: event.basicDetails?.durationMinutes && event.basicDetails.durationMinutes >= 60 
        ? "hours" 
        : "minutes",
      termsAccepted: event.basicDetails?.termsAccepted || false,
      termsText: event.basicDetails?.termsText || "",
      coverPhotoWide: event.basicDetails?.coverWideUrl || "",
      coverPhotoPortrait: event.basicDetails?.coverPortraitUrl || "",
      locations: event.schedule?.locations || [],
      status: event.status || "draft",
      lastSaved: event.updatedAt ? new Date(event.updatedAt) : null,
    };
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

/**
 * Fetch ticket configs for an event
 */
export async function fetchTicketConfigs(eventId: string): Promise<VenueTicketConfig[]> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${GET_EVENT_URL}?eventId=${eventId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.success || !data.event || !data.event.tickets) {
      return [];
    }

    return data.event.tickets.venueConfigs || [];
  } catch (error) {
    console.error("Error fetching ticket configs:", error);
    return [];
  }
}

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================
//
// After deployment, update the UPSERT_EVENT_URL constant above with your
// actual Cloud Function URL.
//
// The URL will be something like:
// https://asia-south1-<your-project-id>.cloudfunctions.net/upsertEvent
//
// You can set it as an environment variable:
// NEXT_PUBLIC_UPSERT_EVENT_URL=https://...
//
// ============================================================================
// INTEGRATION IN EventCreationWizard.tsx
// ============================================================================
//
// 1. Import the functions:
//    import { saveEventDraft, hostEvent } from "@/lib/api/events";
//
// 2. In handleSaveAsDraft, replace the placeholder:
//    const result = await saveEventDraft(formData, ticketConfigs, eventId);
//    setFormData({ ...formData, status: "draft", lastSaved: result.lastSaved });
//    if (!eventId) router.push(`/events/${result.eventId}/edit`);
//
// 3. In handleHostEvent, replace the placeholder:
//    const result = await hostEvent(formData, ticketConfigs, eventId);
//    if (result.status === "kyc_required") { setShowKycDialog(true); return; }
//    if (!result.success && result.errors) { setErrors(result.errors); return; }
//    setShowSuccessDialog(true);
//
// ============================================================================
