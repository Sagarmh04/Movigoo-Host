// Support ticket API functions
import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  SupportTicket,
  SupportMessage,
  CreateTicketData,
  ReplyTicketData,
  TicketStatus,
} from "@/lib/types/support";

const SUPPORT_EMAIL = "movigootech@gmail.com";

// Generate ticket ID (SUP-10001, SUP-10002, etc.)
async function generateTicketId(): Promise<string> {
  const ticketsRef = collection(db, "supportTickets");
  const snapshot = await getDocs(ticketsRef);
  const count = snapshot.size + 10001;
  return `SUP-${count}`;
}

// Create a new support ticket
export async function createSupportTicket(
  data: CreateTicketData
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Get user profile for name
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userName = userDoc.exists()
    ? userDoc.data()?.profile?.name || "Unknown User"
    : "Unknown User";

  const ticketId = await generateTicketId();

  const ticketData = {
    ticketId,
    userId: user.uid,
    userEmail: user.email || "",
    userName,
    category: data.category,
    subject: data.subject,
    description: data.description,
    status: "OPEN" as TicketStatus,
    priority: "NORMAL",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ticketRef = await addDoc(collection(db, "supportTickets"), ticketData);

  // Add initial message (description)
  await addDoc(collection(db, "supportTickets", ticketRef.id, "messages"), {
    sender: "USER",
    message: data.description,
    createdAt: serverTimestamp(),
  });

  // Send email notification to support
  await sendTicketCreatedEmail(ticketId, ticketData);

  return ticketRef.id;
}

// Get user's tickets
export async function getUserTickets(): Promise<SupportTicket[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const ticketsRef = collection(db, "supportTickets");
  const q = query(
    ticketsRef,
    where("userId", "==", user.uid),
    orderBy("updatedAt", "desc")
  );

  const snapshot = await getDocs(q);
  const tickets: SupportTicket[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    tickets.push({
      id: docSnap.id,
      ticketId: data.ticketId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      category: data.category,
      subject: data.subject,
      description: data.description,
      status: data.status,
      priority: data.priority,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  return tickets;
}

// Get all tickets (support only)
export async function getAllTickets(): Promise<SupportTicket[]> {
  const user = auth.currentUser;
  const SUPPORT_EMAILS = ["movigootech@gmail.com", "movigoo4@gmail.com"];
  const isSupport = SUPPORT_EMAILS.includes(user?.email ?? "");
  
  if (!user || !isSupport) {
    throw new Error("Unauthorized: Support access only");
  }

  const ticketsRef = collection(db, "supportTickets");
  const q = query(ticketsRef, orderBy("updatedAt", "desc"));

  const snapshot = await getDocs(q);
  const tickets: SupportTicket[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    tickets.push({
      id: docSnap.id,
      ticketId: data.ticketId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      category: data.category,
      subject: data.subject,
      description: data.description,
      status: data.status,
      priority: data.priority,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  return tickets;
}

// Get ticket messages
export async function getTicketMessages(
  ticketId: string
): Promise<SupportMessage[]> {
  const messagesRef = collection(db, "supportTickets", ticketId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  const snapshot = await getDocs(q);
  const messages: SupportMessage[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    messages.push({
      id: docSnap.id,
      sender: data.sender,
      message: data.message,
      createdAt: data.createdAt,
    });
  });

  return messages;
}

// Reply to ticket
export async function replyToTicket(
  ticketId: string,
  message: string,
  sender: "USER" | "SUPPORT"
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Verify access
  const ticketRef = doc(db, "supportTickets", ticketId);
  const ticketSnap = await getDoc(ticketRef);

  if (!ticketSnap.exists()) {
    throw new Error("Ticket not found");
  }

  const ticketData = ticketSnap.data();

  // Support emails that can reply to any ticket
  const SUPPORT_EMAILS = ["movigootech@gmail.com", "movigoo4@gmail.com"];
  const isSupport = SUPPORT_EMAILS.includes(user.email ?? "");

  // Check if user owns ticket or is support
  if (ticketData.userId !== user.uid && !isSupport) {
    throw new Error("Unauthorized");
  }

  // Check if ticket is closed
  if (ticketData.status === "CLOSED") {
    throw new Error("Cannot reply to closed ticket");
  }

  // Add message
  await addDoc(collection(db, "supportTickets", ticketId, "messages"), {
    sender,
    message,
    createdAt: serverTimestamp(),
  });

  // Update ticket timestamp
  await updateDoc(ticketRef, {
    updatedAt: serverTimestamp(),
  });

  // Send email notification
  if (sender === "SUPPORT") {
    await sendSupportReplyEmail(ticketData.ticketId, ticketData.userEmail, message);
  }
}

// Update ticket status
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<void> {
  const user = auth.currentUser;
  const SUPPORT_EMAILS = ["movigootech@gmail.com", "movigoo4@gmail.com"];
  const isSupport = SUPPORT_EMAILS.includes(user?.email ?? "");
  
  if (!user || !isSupport) {
    throw new Error("Unauthorized: Support access only");
  }

  const ticketRef = doc(db, "supportTickets", ticketId);
  await updateDoc(ticketRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// Get single ticket details
export async function getTicketDetails(
  ticketId: string
): Promise<SupportTicket | null> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const ticketRef = doc(db, "supportTickets", ticketId);
  const ticketSnap = await getDoc(ticketRef);

  if (!ticketSnap.exists()) {
    return null;
  }

  const data = ticketSnap.data();

  // Support emails that can view any ticket
  const SUPPORT_EMAILS = ["movigootech@gmail.com", "movigoo4@gmail.com"];
  const isSupport = SUPPORT_EMAILS.includes(user.email ?? "");

  // Check access
  if (data.userId !== user.uid && !isSupport) {
    throw new Error("Unauthorized");
  }

  return {
    id: ticketSnap.id,
    ticketId: data.ticketId,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName,
    category: data.category,
    subject: data.subject,
    description: data.description,
    status: data.status,
    priority: data.priority,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// Email notification functions
async function sendTicketCreatedEmail(
  ticketId: string,
  ticketData: any
): Promise<void> {
  try {
    await fetch("/api/support/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "TICKET_CREATED",
        ticketId,
        userName: ticketData.userName,
        userEmail: ticketData.userEmail,
        category: ticketData.category,
        subject: ticketData.subject,
        description: ticketData.description,
      }),
    });
  } catch (error) {
    console.error("Failed to send ticket created email:", error);
  }
}

async function sendSupportReplyEmail(
  ticketId: string,
  userEmail: string,
  message: string
): Promise<void> {
  try {
    await fetch("/api/support/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "SUPPORT_REPLY",
        ticketId,
        userEmail,
        message,
      }),
    });
  } catch (error) {
    console.error("Failed to send support reply email:", error);
  }
}
