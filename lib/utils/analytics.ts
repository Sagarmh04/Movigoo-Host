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

