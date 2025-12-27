"use client";

import { SupportTicket, TicketStatus } from "@/lib/types/support";
import { Clock, Tag, AlertCircle } from "lucide-react";

interface TicketsListProps {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  loading: boolean;
}

export default function TicketsList({
  tickets,
  selectedTicketId,
  onSelectTicket,
  loading,
}: TicketsListProps) {
  const getStatusBadge = (status: TicketStatus) => {
    const styles = {
      OPEN: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets yet</h3>
        <p className="text-gray-500">
          Click &quot;Raise Support Ticket&quot; to create your first ticket
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => onSelectTicket(ticket.id)}
          className={`p-4 cursor-pointer transition hover:bg-gray-50 ${
            selectedTicketId === ticket.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono text-gray-600">{ticket.ticketId}</span>
                {getStatusBadge(ticket.status)}
              </div>
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {ticket.subject}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Tag size={14} />
              <span>{ticket.category}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{formatDate(ticket.updatedAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
