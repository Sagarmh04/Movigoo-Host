/**
 * Analytics reading utilities
 * Reads from analytics collections ONLY (no client-side aggregation)
 */
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import { auth } from "../firebase";

export interface HostAnalytics {
  totalTicketsSold: number;
  totalRevenue: number;
  updatedAt?: any; // Firestore timestamp
  // Add other analytics fields as needed
}

export interface EventAnalytics {
  totalTicketsSold: number;
  totalRevenue: number;
  updatedAt?: any; // Firestore timestamp
  // Add other analytics fields as needed
}

/**
 * Get host analytics from host_analytics/{hostId} collection
 * Returns analytics data or null if document doesn't exist
 */
export async function getHostAnalytics(hostId: string): Promise<HostAnalytics | null> {
  try {
    const analyticsDocRef = doc(db, "host_analytics", hostId);
    const analyticsDocPath = `host_analytics/${hostId}`;
    
    // DEBUG: Log read attempt
    console.log("📖 [Analytics] Reading from:", analyticsDocPath);
    
    const analyticsDoc = await getDoc(analyticsDocRef);
    
    if (!analyticsDoc.exists()) {
      console.warn("⚠️ [Analytics] Document does not exist:", analyticsDocPath);
      return null;
    }
    
    const data = analyticsDoc.data();
    const result = {
      totalTicketsSold: data.totalTicketsSold ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      updatedAt: data.updatedAt,
    };

    console.log("Analytics Data Fetched:", result);

    // DEBUG: Log raw data from Firestore
    console.log("📄 [Analytics] Raw Firestore data:", {
      totalTicketsSold: data.totalTicketsSold,
      totalRevenue: data.totalRevenue,
      updatedAt: data.updatedAt,
      allFields: Object.keys(data),
    });
    
    return result;
  } catch (error) {
    console.error("❌ [Analytics] Error reading host analytics:", error);
    throw error;
  }
}

/**
 * Get host analytics for the current authenticated user
 */
export async function getCurrentHostAnalytics(): Promise<HostAnalytics | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  
  if (!user.uid) {
    throw new Error("User UID is undefined");
  }
  
  return getHostAnalytics(user.uid);
}

/**
 * Get event analytics from event_analytics/{eventId} collection
 * Returns analytics data or null if document doesn't exist
 */
export async function getEventAnalytics(eventId: string): Promise<EventAnalytics | null> {
  try {
    const analyticsDocRef = doc(db, "event_analytics", eventId);
    const analyticsDocPath = `event_analytics/${eventId}`;
    
    // DEBUG: Log read attempt
    console.log("📖 [Event Analytics] Reading from:", analyticsDocPath);
    
    const analyticsDoc = await getDoc(analyticsDocRef);
    
    if (!analyticsDoc.exists()) {
      console.warn("⚠️ [Event Analytics] Document does not exist:", analyticsDocPath);
      return null;
    }
    
    const data = analyticsDoc.data();
    const result = {
      totalTicketsSold: data.totalTicketsSold ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      updatedAt: data.updatedAt,
    };
    
    // DEBUG: Log raw data from Firestore
    console.log("📄 [Event Analytics] Raw Firestore data for", eventId, ":", {
      totalTicketsSold: data.totalTicketsSold,
      totalRevenue: data.totalRevenue,
      updatedAt: data.updatedAt,
    });
    
    return result;
  } catch (error) {
    console.error(`❌ [Event Analytics] Error reading event analytics for ${eventId}:`, error);
    throw error;
  }
}

/**
 * Get analytics for multiple events in parallel
 * Returns a map of eventId -> EventAnalytics
 */
export async function getMultipleEventAnalytics(eventIds: string[]): Promise<Record<string, EventAnalytics>> {
  try {
    // Fetch all analytics in parallel
    const analyticsPromises = eventIds.map(async (eventId) => {
      try {
        const analytics = await getEventAnalytics(eventId);
        return { eventId, analytics };
      } catch (error) {
        console.error(`Error fetching analytics for event ${eventId}:`, error);
        return { eventId, analytics: null };
      }
    });
    
    const results = await Promise.all(analyticsPromises);
    
    // Build map of eventId -> analytics
    const analyticsMap: Record<string, EventAnalytics> = {};
    results.forEach(({ eventId, analytics }) => {
      if (analytics) {
        analyticsMap[eventId] = analytics;
      } else {
        // If analytics doesn't exist, use default values
        analyticsMap[eventId] = {
          totalTicketsSold: 0,
          totalRevenue: 0,
        };
      }
    });
    
    return analyticsMap;
  } catch (error) {
    console.error("Error fetching multiple event analytics:", error);
    throw error;
  }
}

