// Event validation utilitiest
import { EventFormData, EventLocation, EventVenue, EventDate, EventShow, ValidationError, VenueTicketConfig } from "../types/event";

/**
 * Validates event data for draft save (minimal/no validation)
 */
export function validateForDraft(data: Partial<EventFormData>): ValidationError[] {
  // For drafts, we allow saving in any state
  // No required fields - just return empty errors
  return [];
}

/**
 * Validates Step 1: Basic Details for hosting
 */
export function validateBasicDetails(data: Partial<EventFormData>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required.", step: 1 });
  } else if (data.title.trim().length > 50) {
    errors.push({ field: "title", message: "Title cannot exceed 50 characters.", step: 1 });
  }

  // Description
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: "description", message: "Description is required.", step: 1 });
  }

  // Genres
  if (!data.genres || data.genres.length === 0) {
    errors.push({ field: "genres", message: "Select at least one genre.", step: 1 });
  }

  // Languages
  if (!data.languages || data.languages.length === 0) {
    errors.push({ field: "languages", message: "Select at least one language.", step: 1 });
  }

  // Age limit
  if (!data.ageLimit && data.ageLimit !== 0) {
    errors.push({ field: "ageLimit", message: "Age limit is required.", step: 1 });
  }

  // Duration
  if (!data.duration || data.duration <= 0) {
    errors.push({ field: "duration", message: "Duration must be greater than 0.", step: 1 });
  }

  // Terms & Conditions
  if (!data.termsAccepted) {
    errors.push({ field: "termsAccepted", message: "You must confirm the terms & conditions.", step: 1 });
  }

  // Cover photos
  if (!data.coverPhotoWide || data.coverPhotoWide.trim().length === 0) {
    errors.push({ field: "coverPhotoWide", message: "Wide cover photo is required to host.", step: 1 });
  }

  if (!data.coverPhotoPortrait || data.coverPhotoPortrait.trim().length === 0) {
    errors.push({ field: "coverPhotoPortrait", message: "Portrait cover photo is required to host.", step: 1 });
  }

  return errors;
}

/**
 * Validates Step 2: Event Schedule for hosting
 */
export function validateSchedule(data: Partial<EventFormData>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Must have at least one location
  if (!data.locations || data.locations.length === 0) {
    errors.push({ field: "locations", message: "At least one location is required.", step: 2 });
    return errors; // Can't continue validation without locations
  }

  // Validate each location
  data.locations.forEach((location, locIndex) => {
    if (!location.name || location.name.trim().length === 0) {
      errors.push({
        field: `locations[${locIndex}].name`,
        message: "Location name is required.",
        step: 2,
      });
    }

    // Each location must have at least one venue
    if (!location.venues || location.venues.length === 0) {
      errors.push({
        field: `locations[${locIndex}].venues`,
        message: "At least one venue is required for this location.",
        step: 2,
      });
      return; // Skip further validation for this location
    }

    // Validate each venue
    location.venues.forEach((venue, venueIndex) => {
      if (!venue.name || venue.name.trim().length === 0) {
        errors.push({
          field: `locations[${locIndex}].venues[${venueIndex}].name`,
          message: "Venue name is required.",
          step: 2,
        });
      }

      if (!venue.address || venue.address.trim().length === 0) {
        errors.push({
          field: `locations[${locIndex}].venues[${venueIndex}].address`,
          message: "Venue address is required.",
          step: 2,
        });
      }

      // Each venue must have at least one date
      if (!venue.dates || venue.dates.length === 0) {
        errors.push({
          field: `locations[${locIndex}].venues[${venueIndex}].dates`,
          message: "At least one date is required for this venue.",
          step: 2,
        });
        return; // Skip further validation for this venue
      }

      // Validate each date
      venue.dates.forEach((date, dateIndex) => {
        if (!date.date || date.date.trim().length === 0) {
          errors.push({
            field: `locations[${locIndex}].venues[${venueIndex}].dates[${dateIndex}].date`,
            message: "Date is required.",
            step: 2,
          });
        }

        // Each date must have at least one show
        if (!date.shows || date.shows.length === 0) {
          errors.push({
            field: `locations[${locIndex}].venues[${venueIndex}].dates[${dateIndex}].shows`,
            message: "At least one show is required on this date.",
            step: 2,
          });
          return; // Skip further validation for this date
        }

        // Validate each show
        date.shows.forEach((show, showIndex) => {
          if (!show.startTime || show.startTime.trim().length === 0) {
            errors.push({
              field: `locations[${locIndex}].venues[${venueIndex}].dates[${dateIndex}].shows[${showIndex}].startTime`,
              message: "Start time is required.",
              step: 2,
            });
          }

          if (!show.endTime || show.endTime.trim().length === 0) {
            errors.push({
              field: `locations[${locIndex}].venues[${venueIndex}].dates[${dateIndex}].shows[${showIndex}].endTime`,
              message: "End time is required.",
              step: 2,
            });
          }

          // Optional: Validate end time is after start time
          if (show.startTime && show.endTime && show.startTime >= show.endTime) {
            errors.push({
              field: `locations[${locIndex}].venues[${venueIndex}].dates[${dateIndex}].shows[${showIndex}].endTime`,
              message: "End time must be after start time.",
              step: 2,
            });
          }
        });
      });
    });
  });

  return errors;
}

/**
 * Validates Step 3: Ticket Details for hosting
 */
export function validateTickets(
  data: Partial<EventFormData>,
  ticketConfigs: VenueTicketConfig[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.locations || data.locations.length === 0) {
    return errors; // Schedule validation should have caught this
  }

  // Get all venue IDs that have shows
  const venuesWithShows = data.locations.flatMap((loc) =>
    loc.venues.filter((venue) => venue.dates.some((date) => date.shows.length > 0))
  );

  // Each venue with shows must have ticket configuration
  venuesWithShows.forEach((venue) => {
    const config = ticketConfigs.find((tc) => tc.venueId === venue.id);

    if (!config || config.ticketTypes.length === 0) {
      errors.push({
        field: `ticketConfig[${venue.id}]`,
        message: `At least one ticket type is required for ${venue.name}.`,
        step: 3,
      });
    } else {
      // Validate each ticket type
      config.ticketTypes.forEach((ticket, ticketIndex) => {
        if (!ticket.typeName || ticket.typeName.trim().length === 0) {
          errors.push({
            field: `ticketConfig[${venue.id}].ticketTypes[${ticketIndex}].typeName`,
            message: "Ticket type name is required.",
            step: 3,
          });
        }

        if (!ticket.price || ticket.price <= 0) {
          errors.push({
            field: `ticketConfig[${venue.id}].ticketTypes[${ticketIndex}].price`,
            message: "Price must be greater than 0.",
            step: 3,
          });
        }

        if (!ticket.totalQuantity || ticket.totalQuantity <= 0 || !Number.isInteger(ticket.totalQuantity)) {
          errors.push({
            field: `ticketConfig[${venue.id}].ticketTypes[${ticketIndex}].totalQuantity`,
            message: "Total tickets must be a positive whole number.",
            step: 3,
          });
        }
      });
    }
  });

  return errors;
}

/**
 * Validates all data for hosting (all steps)
 */
export function validateForHosting(
  data: Partial<EventFormData>,
  ticketConfigs: VenueTicketConfig[]
): ValidationError[] {
  const step1Errors = validateBasicDetails(data);
  const step2Errors = validateSchedule(data);
  const step3Errors = validateTickets(data, ticketConfigs);

  return [...step1Errors, ...step2Errors, ...step3Errors];
}

/**
 * Scroll to the first error field in the DOM
 */
export function scrollToFirstError(errors: ValidationError[]): void {
  if (errors.length === 0) return;

  const firstError = errors[0];
  const fieldName = firstError.field.replace(/\[|\]/g, "-"); // Convert array notation to CSS-safe
  const element = document.querySelector(`[data-field="${fieldName}"]`) || 
                  document.querySelector(`[name="${firstError.field}"]`) ||
                  document.getElementById(firstError.field);

  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus if it's an input
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.focus();
    }
  }
}
