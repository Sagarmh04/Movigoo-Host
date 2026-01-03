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

/**
 * Get host analytics from host_analytics/{hostId} collection
 * Returns analytics data or null if document doesn't exist
 */
export async function getHostAnalytics(hostId: string): Promise<HostAnalytics | null> {
  try {
    const analyticsDocRef = doc(db, "host_analytics", hostId);
    const analyticsDoc = await getDoc(analyticsDocRef);
    
    if (!analyticsDoc.exists()) {
      return null;
    }
    
    const data = analyticsDoc.data();
    return {
      totalTicketsSold: data.totalTicketsSold ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Error reading host analytics:", error);
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
  
  return getHostAnalytics(user.uid);
}

