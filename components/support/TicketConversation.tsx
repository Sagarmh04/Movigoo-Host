"use client";

import { useState, useEffect, useRef } from "react";
import { SupportTicket, SupportMessage, TicketStatus } from "@/lib/types/support";
import { replyToTicket, updateTicketStatus } from "@/lib/api/support";
import { Send, User, Headphones, Clock, Tag, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

interface TicketConversationProps {
  ticket: SupportTicket;
  onTicketUpdated: () => void;
}

export default function TicketConversation({
  ticket,
  onTicketUpdated,
}: TicketConversationProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SUPPORT_EMAILS = ["movigootech@gmail.com", "movigoo4@gmail.com"];

  useEffect(() => {
    const user = auth.currentUser;
    setIsSupport(SUPPORT_EMAILS.includes(user?.email ?? ""));
    setCurrentUserId(user?.uid || null);
  }, []);

  useEffect(() => {
    setLoading(true);

    const messagesRef = collection(db, "supportTickets", ticket.id, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMessages: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          nextMessages.push({
            id: docSnap.id,
            sender: data.sender,
            message: data.message,
            createdAt: data.createdAt,
          });
        });
        setMessages(nextMessages);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to messages:", error);
        toast.error("Failed to load messages");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ticket.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    if (ticket.status === "CLOSED") {
      toast.error("Cannot reply to closed ticket");
      return;
    }

    setSending(true);
    try {
      const sender = isSupport ? "SUPPORT" : "USER";
      await replyToTicket(ticket.id, newMessage.trim(), sender);
      setNewMessage("");
      onTicketUpdated();
      toast.success("Reply sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      await updateTicketStatus(ticket.id, newStatus);
      toast.success(`Ticket status updated to ${newStatus}`);
      onTicketUpdated();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    }
  };

  // Determine if current user can reply
  const ownerId = ticket.hostId ?? ticket.creatorId ?? ticket.userId;
  const canReply =
    ticket.status !== "CLOSED" &&
    (ownerId === currentUserId || isSupport);

  const getStatusBadge = (status: TicketStatus) => {
    const styles = {
      OPEN: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-gray-600">{ticket.ticketId}</span>
              {getStatusBadge(ticket.status)}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{ticket.subject}</h2>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Tag size={16} />
            <span>{ticket.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>Created {formatTimestamp(ticket.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>{ticket.userName}</span>
          </div>
        </div>

        {/* Support Controls */}
        {isSupport && ticket.status !== "CLOSED" && (
          <div className="mt-4 pt-4 border-t">
            <label className="text-sm font-medium text-gray-700 mr-3">Change Status:</label>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "SUPPORT" ? "flex-row" : "flex-row-reverse"}`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.sender === "SUPPORT" ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  {msg.sender === "SUPPORT" ? (
                    <Headphones size={16} className="text-white" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>

                <div
                  className={`flex-1 max-w-2xl ${msg.sender === "SUPPORT" ? "text-left" : "text-right"}`}
                >
                  <div
                    className={`inline-block px-4 py-3 rounded-lg ${
                      msg.sender === "SUPPORT"
                        ? "bg-white border border-gray-200"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Input */}
      {!canReply ? (
        <div className="bg-gray-100 border-t p-4">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">
              {ticket.status === "CLOSED"
                ? "This ticket is closed and cannot receive new replies"
                : "You do not have permission to reply to this ticket"}
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 bg-gray-800"
              disabled={sending || !canReply}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || !canReply}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 We usually reply within 24 hours. You&apos;ll receive an email notification.
          </p>
        </form>
      )}
    </div>
  );
}
