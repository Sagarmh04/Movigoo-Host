// Support ticket types
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketCategory = "Payment" | "Event" | "Refund" | "Account" | "Other";
export type TicketPriority = "NORMAL" | "HIGH" | "URGENT";
export type MessageSender = "USER" | "SUPPORT";

export interface SupportTicket {
  id: string;
  ticketId: string; // SUP-10231
  userId: string;
  hostId?: string;
  creatorId?: string;
  userEmail: string;
  userName: string;
  
  category: TicketCategory;
  subject: string;
  description: string;
  
  status: TicketStatus;
  priority: TicketPriority;
  
  createdAt: any;
  updatedAt: any;
  
  // Computed fields
  lastMessageAt?: any;
  unreadCount?: number;
}

export interface SupportMessage {
  id: string;
  sender: MessageSender;
  message: string;
  createdAt: any;
}

export interface CreateTicketData {
  category: TicketCategory;
  subject: string;
  description: string;
}

export interface ReplyTicketData {
  ticketId: string;
  message: string;
  sender: MessageSender;
}
