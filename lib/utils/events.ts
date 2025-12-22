// Utility functions for event and show management
import { EventFormData, EventLocation, EventVenue, EventDate, EventShow } from "../types/event";
import { fetchEvents } from "../api/events";
import { EventSummary } from "../types/event";

export interface ShowInfo {
  eventId: string;
  eventTitle: string;
  locationId: string;
  locationName: string;
  venueId: string;
  venueName: string;
  dateId: string;
  date: string;
  showId: string;
  showName?: string;
  showStartTime: string;
  showEndTime: string;
}

/**
 * Extract all shows from an event
 */
export function extractShowsFromEvent(event: EventFormData | EventSummary | any): ShowInfo[] {
  const shows: ShowInfo[] = [];
  const eventId = event.id || event.eventId || "";
  const eventTitle = event.title || event.basicDetails?.title || "Untitled Event";
  
  const locations = event.locations || event.schedule?.locations || [];
  
  locations.forEach((location: EventLocation) => {
    location.venues?.forEach((venue: EventVenue) => {
      venue.dates?.forEach((dateItem: EventDate) => {
        dateItem.shows?.forEach((show: EventShow) => {
          shows.push({
            eventId,
            eventTitle,
            locationId: location.id,
            locationName: location.name,
            venueId: venue.id,
            venueName: venue.name,
            dateId: dateItem.id,
            date: dateItem.date,
            showId: show.id,
            showName: show.name,
            showStartTime: show.startTime,
            showEndTime: show.endTime,
          });
        });
      });
    });
  });
  
  return shows;
}

/**
 * Get all shows from all events for a host
 */
export async function getAllShowsForHost(): Promise<ShowInfo[]> {
  try {
    const events = await fetchEvents();
    const allShows: ShowInfo[] = [];
    
    events.forEach((event) => {
      const shows = extractShowsFromEvent(event);
      allShows.push(...shows);
    });
    
    return allShows;
  } catch (error) {
    console.error("Error fetching shows:", error);
    return [];
  }
}

/**
 * Format show display name
 */
export function formatShowDisplay(show: ShowInfo): string {
  const date = new Date(show.date).toLocaleDateString();
  const time = `${show.showStartTime} - ${show.showEndTime}`;
  const showName = show.showName || "Show";
  
  return `${show.eventTitle} - ${show.locationName} - ${show.venueName} - ${date} - ${showName} (${time})`;
}

