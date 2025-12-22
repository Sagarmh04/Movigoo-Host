// API functions for volunteer management
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc } from "firebase/firestore";
import { auth } from "../firebase";

/**
 * Generate a unique UUID
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface Volunteer {
  id: string;                          // UUID
  hostUserId: string;                  // ID of the host who created this volunteer
  username: string;                     // Login username
  password: string;                    // Hashed password (should be hashed before saving)
  privileges: VolunteerPrivilege[];     // Array of privileges
  createdAt: string;                   // ISO date string
  updatedAt: string;                   // ISO date string
  isActive: boolean;                   // Whether volunteer account is active
  accessLink: string;                  // Full access link: crew.movigoo.in/{uuid}
}

export type VolunteerPrivilege = "ticket_checking" | "stats_view";

/**
 * Create a new volunteer
 */
export async function createVolunteer(
  username: string,
  password: string,
  privileges: VolunteerPrivilege[]
): Promise<Volunteer> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get host user ID
  const hostUserId = user.uid;
  
  // Generate unique UUID
  const uuid = generateUUID();
  
  // Create access link
  const accessLink = `crew.movigoo.in/${uuid}`;
  
  // Create volunteer document
  const volunteer: Volunteer = {
    id: uuid,
    hostUserId,
    username,
    password, // Note: In production, hash this password before saving
    privileges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    accessLink,
  };
  
  // Save to Firestore
  const volunteerRef = doc(db, "volunteers", uuid);
  await setDoc(volunteerRef, volunteer);
  
  return volunteer;
}

/**
 * Get all volunteers for the current host
 */
export async function getVolunteers(): Promise<Volunteer[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const hostUserId = user.uid;
  
  const volunteersQuery = query(
    collection(db, "volunteers"),
    where("hostUserId", "==", hostUserId)
  );
  
  const snapshot = await getDocs(volunteersQuery);
  return snapshot.docs.map(doc => doc.data() as Volunteer);
}

/**
 * Get volunteer by UUID
 */
export async function getVolunteerByUuid(uuid: string): Promise<Volunteer | null> {
  const volunteerRef = doc(db, "volunteers", uuid);
  const volunteerDoc = await getDoc(volunteerRef);
  
  if (!volunteerDoc.exists()) {
    return null;
  }
  
  return volunteerDoc.data() as Volunteer;
}

/**
 * Update volunteer
 */
export async function updateVolunteer(
  uuid: string,
  updates: Partial<Volunteer>
): Promise<void> {
  const volunteerRef = doc(db, "volunteers", uuid);
  
  await setDoc(
    volunteerRef,
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Delete volunteer
 */
export async function deleteVolunteer(uuid: string): Promise<void> {
  const volunteerRef = doc(db, "volunteers", uuid);
  await deleteDoc(volunteerRef);
}

/**
 * Toggle volunteer active status
 */
export async function toggleVolunteerStatus(uuid: string, isActive: boolean): Promise<void> {
  await updateVolunteer(uuid, { isActive });
}

