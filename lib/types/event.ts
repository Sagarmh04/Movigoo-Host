// Event data types and interfaces

export interface EventFormData {
  // Basic Details (Step 1)
  title: string;
  description: string;
  genres: string[];
  languages: string[];
  ageLimit: string | number;
  duration: number;
  durationUnit: "minutes" | "hours";
  termsAccepted: boolean;
  termsText?: string; // Optional: event-specific terms
  coverPhotoWide: string; // URL or file path
  coverPhotoPortrait: string; // URL or file path

  // Schedule (Step 2)
  locations: EventLocation[];

  // Metadata
  status?: "draft" | "hosted" | "pending";
  lastSaved?: Date | null;
}

export interface EventLocation {
  id: string;
  name: string;
  venues: EventVenue[];
}

export interface EventVenue {
  id: string;
  name: string;
  address: string;
  dates: EventDate[];
}

export interface EventDate {
  id: string;
  date: string; // ISO date string
  shows: EventShow[];
}

export interface EventShow {
  id: string;
  name?: string; // Optional: defaults to "Show 1", "Show 2", etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface TicketType {
  id: string;
  typeName: string;
  price: number;
  totalQuantity: number;
}

export interface VenueTicketConfig {
  venueId: string;
  ticketTypes: TicketType[];
}

// Validation error structure
export interface ValidationError {
  field: string;
  message: string;
  step?: number;
}

// Backend API response types
export interface CreateEventResponse {
  success: boolean;
  eventId?: string;
  status?: "draft" | "hosted" | "kyc_required";
  message?: string;
  errors?: ValidationError[];
}

// KYC status for event creation context
export type KycStatus = "verified" | "pending" | "not_started" | "rejected";

export interface EventSummary {
  id: string;
  eventId: string;
  status: "draft" | "published" | "hosted";
  title: string;
  description: string;
  coverPhotoWide: string;
  locations: EventLocation[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
