// Backend API integration helpers for event creation
import { EventFormData, VenueTicketConfig, CreateEventResponse, KycStatus } from "../types/event";

// Cloud Function URL - update after deployment
const UPSERT_EVENT_URL = process.env.NEXT_PUBLIC_UPSERT_EVENT_URL || 
  "https://asia-south1-<project-id>.cloudfunctions.net/upsertEvent";

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
  const headers = await getAuthHeaders();
  const payload = {
    mode: "draft",
    eventId,
    ...formatEventForBackend(formData, ticketConfigs),
  };

  const response = await fetch(UPSERT_EVENT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to save draft");
  }

  const data = await response.json();
  return {
    success: true,
    eventId: data.eventId,
    lastSaved: new Date(data.lastSaved),
  };
}

/**
 * Host event (publish) using upsertEvent function
 */
export async function hostEvent(
  formData: Partial<EventFormData>,
  ticketConfigs: VenueTicketConfig[],
  eventId?: string
): Promise<CreateEventResponse> {
  const headers = await getAuthHeaders();
  const payload = {
    mode: "publish",
    eventId,
    ...formatEventForBackend(formData, ticketConfigs),
  };

  const response = await fetch(UPSERT_EVENT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  // Handle KYC not verified
  if (data.error === "KYC_NOT_VERIFIED") {
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
    throw new Error(data.message || "Failed to host event");
  }

  return {
    success: true,
    eventId: data.eventId,
    status: "hosted",
  };
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
