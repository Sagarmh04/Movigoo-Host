"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { SupportTicket } from "@/lib/types/support";
import { getUserTickets, getAllTickets, getTicketDetails } from "@/lib/api/support";
import CreateTicketModal from "@/components/support/CreateTicketModal";
import TicketsList from "@/components/support/TicketsList";
import TicketConversation from "@/components/support/TicketConversation";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

export default function SupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const OWNER_EMAIL = "movigoo4@gmail.com";

  useEffect(() => {
    const user = auth.currentUser;
    setIsOwner(user?.email === OWNER_EMAIL);
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetails(selectedTicketId);
    }
  }, [selectedTicketId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Please login to view tickets");
        return;
      }

      const ticketsList = isOwner ? await getAllTickets() : await getUserTickets();
      setTickets(ticketsList);

      // Auto-select first ticket if none selected
      if (ticketsList.length > 0 && !selectedTicketId) {
        setSelectedTicketId(ticketsList[0].id);
      }
    } catch (error: any) {
      console.error("Error loading tickets:", error);
      toast.error(error.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const ticket = await getTicketDetails(ticketId);
      setSelectedTicket(ticket);
    } catch (error: any) {
      console.error("Error loading ticket details:", error);
      toast.error(error.message || "Failed to load ticket details");
    }
  };

  const handleTicketCreated = () => {
    loadTickets();
  };

  const handleTicketUpdated = () => {
    loadTickets();
    if (selectedTicketId) {
      loadTicketDetails(selectedTicketId);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Support & Tickets</h1>
          <p className="text-gray-500 mt-1">
            {isOwner
              ? "Manage all support requests and respond to user issues."
              : "Get help with your events and account."}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Raise Support Ticket
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Your Tickets</h2>
              <p className="text-sm text-gray-500 mt-1">
                {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
              </p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              <TicketsList
                tickets={tickets}
                selectedTicketId={selectedTicketId}
                onSelectTicket={handleSelectTicket}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Ticket Conversation */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
            {selectedTicket ? (
              <TicketConversation
                ticket={selectedTicket}
                onTicketUpdated={handleTicketUpdated}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {tickets.length === 0 ? (
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">No tickets yet</p>
                    <p className="text-sm">Click &quot;Raise Support Ticket&quot; to get started</p>
                  </div>
                ) : (
                  <p>Select a ticket to view conversation</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
}
