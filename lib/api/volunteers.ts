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

export interface ShowAssignment {
  id: string;                          // Unique assignment ID
  eventId: string;                     // Event ID
  eventTitle: string;                  // Event title (for display)
  locationId: string;                  // Location ID
  locationName: string;                // Location name (for display)
  venueId: string;                     // Venue ID
  venueName: string;                   // Venue name (for display)
  dateId: string;                      // Date ID
  date: string;                        // Date string (ISO format)
  showId: string;                      // Show ID
  showName?: string;                   // Show name (optional)
  showStartTime: string;               // Show start time (HH:mm format)
  showEndTime: string;                 // Show end time (HH:mm format)
  assignedAt: string;                  // When assignment was created
  assignedBy: string;                  // Host user ID who assigned
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
  showAssignments: ShowAssignment[];   // Array of show assignments
}

export type VolunteerPrivilege = "ticket_checking" | "stats_view";

/**
 * Create a new volunteer with password hashing
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

  // Validate input
  if (!username || username.trim().length === 0) {
    throw new Error("Username is required");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }
  if (!privileges || privileges.length === 0) {
    throw new Error("At least one privilege is required");
  }

  // Hash password server-side via API route
  const hashResponse = await fetch("/api/volunteers/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!hashResponse.ok) {
    const error = await hashResponse.json().catch(() => ({}));
    throw new Error(error.message || "Failed to hash password");
  }

  const { hashedPassword } = await hashResponse.json();

  // Get host user ID
  const hostUserId = user.uid;
  
  // Generate unique UUID
  const uuid = generateUUID();
  
  // Create access link
  const accessLink = `crew.movigoo.in/${uuid}`;
  
  // Create volunteer document with hashed password
  const volunteer: Volunteer = {
    id: uuid,
    hostUserId,
    username: username.trim(),
    password: hashedPassword, // Hashed password from server
    privileges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    accessLink,
    showAssignments: [], // Initialize with empty assignments
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
 * Note: If updating password, use updateVolunteerPassword instead
 */
export async function updateVolunteer(
  uuid: string,
  updates: Partial<Omit<Volunteer, "password">>
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
 * Update volunteer password (hashes password server-side)
 */
export async function updateVolunteerPassword(
  uuid: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  // Hash password server-side via API route
  const hashResponse = await fetch("/api/volunteers/update-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!hashResponse.ok) {
    const error = await hashResponse.json().catch(() => ({}));
    throw new Error(error.message || "Failed to hash password");
  }

  const { hashedPassword } = await hashResponse.json();

  // Update password in Firestore
  const volunteerRef = doc(db, "volunteers", uuid);
  await setDoc(
    volunteerRef,
    {
      password: hashedPassword,
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

/**
 * Add show assignment to volunteer
 */
export async function addShowAssignment(
  uuid: string,
  assignment: Omit<ShowAssignment, "id" | "assignedAt" | "assignedBy">
): Promise<void> {
  const volunteer = await getVolunteerByUuid(uuid);
  if (!volunteer) {
    throw new Error("Volunteer not found");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const newAssignment: ShowAssignment = {
    ...assignment,
    id: generateUUID(),
    assignedAt: new Date().toISOString(),
    assignedBy: user.uid,
  };

  const updatedAssignments = [...volunteer.showAssignments, newAssignment];
  await updateVolunteer(uuid, { showAssignments: updatedAssignments });
}

/**
 * Remove show assignment from volunteer
 */
export async function removeShowAssignment(uuid: string, assignmentId: string): Promise<void> {
  const volunteer = await getVolunteerByUuid(uuid);
  if (!volunteer) {
    throw new Error("Volunteer not found");
  }

  const updatedAssignments = volunteer.showAssignments.filter(
    (assignment) => assignment.id !== assignmentId
  );
  await updateVolunteer(uuid, { showAssignments: updatedAssignments });
}

/**
 * Update show assignment
 */
export async function updateShowAssignment(
  uuid: string,
  assignmentId: string,
  updates: Partial<Omit<ShowAssignment, "id" | "assignedAt" | "assignedBy">>
): Promise<void> {
  const volunteer = await getVolunteerByUuid(uuid);
  if (!volunteer) {
    throw new Error("Volunteer not found");
  }

  const updatedAssignments = volunteer.showAssignments.map((assignment) =>
    assignment.id === assignmentId ? { ...assignment, ...updates } : assignment
  );
  await updateVolunteer(uuid, { showAssignments: updatedAssignments });
}

