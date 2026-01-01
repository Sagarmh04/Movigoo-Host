"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Shield, Search, Download, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Calendar, DollarSign, TrendingUp, ShieldCheck, MessageSquare, Edit2, Save, X } from "lucide-react";

interface EventData {
  id: string;
  title: string;
  status: string;
  ticketsSold: number;
  revenue: number;
  date: any;
  manualPayoutPaid?: number; // Amount manually paid by owner
  manualPayoutNote?: string; // Optional note from owner
  manualPayoutPaidAt?: any; // When payout was recorded
}

interface OrganizerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  kycStatus: string;
  kycSubmittedAt?: any;
  kycVerifiedAt?: any;
  kycDetails?: any;
  bankDetails?: {
    beneficiaryName: string;
    accountType: string;
    bankName: string;
    accountNumberLast4: string;
    ifscCode: string;
  };
  payoutStatus: string;
  bankAddedAt?: any;
  payoutKyc?: {
    enabled: boolean;
    updatedAt?: any;
    updatedBy?: string;
  };
  events: EventData[];
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  payoutEligible: number;
  payoutHistory: any[];
}

export default function SuperAdminOrganizersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<OrganizerData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingPayout, setEditingPayout] = useState<{ eventId: string; organizerId: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");

  // Owner email - single source of truth
  const OWNER_EMAIL = "movigoo4@gmail.com";

  const getDisplayKycStatus = (realKycStatus: string) => {
    return isOwner ? "verified" : (realKycStatus || "not_started");
  };

  const getDisplayBankStatus = (realPayoutStatus: string) => {
    // This page historically uses payoutStatus as the "bank added" indicator (ADDED/NOT_ADDED)
    return isOwner ? "ADDED" : (realPayoutStatus || "NOT_ADDED");
  };

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is owner (email-based)
      const userIsOwner = user.email === OWNER_EMAIL;

      if (!userIsOwner) {
        toast.error("Access Denied: Owner only");
        router.push("/");
        return;
      }

      setIsOwner(true);
      await loadOrganizers();
    } catch (error) {
      console.error("Access check error:", error);
      toast.error("Access verification failed");
      router.push("/");
    }
  };

  const loadOrganizers = async () => {
    setLoading(true);
    try {
      const organizersRef = collection(db, "organizers");
      const snapshot = await getDocs(organizersRef);

      const organizersData: OrganizerData[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Get user profile data
        const userDoc = await getDocs(
          query(collection(db, "users"), where("__name__", "==", doc.id))
        );
        
        let userProfile: any = {};
        if (!userDoc.empty) {
          userProfile = userDoc.docs[0].data().profile || {};
        }

        // Get organizer's events
        const eventsRef = collection(db, "events");
        const eventsQuery = query(eventsRef, where("organizerId", "==", doc.id));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        const events: EventData[] = [];
        let totalTicketsSold = 0;
        let totalRevenue = 0;
        
        eventsSnapshot.forEach((eventDoc) => {
          const eventData = eventDoc.data();
          const ticketsSold = eventData.ticketsSold || 0;
          const revenue = eventData.totalRevenue || 0;
          
          events.push({
            id: eventDoc.id,
            title: eventData.title || "Untitled Event",
            status: eventData.status || "draft",
            ticketsSold,
            revenue,
            date: eventData.date || eventData.createdAt,
            manualPayoutPaid: eventData.manualPayoutPaid || 0,
            manualPayoutNote: eventData.manualPayoutNote || "",
            manualPayoutPaidAt: eventData.manualPayoutPaidAt,
          });
          
          totalTicketsSold += ticketsSold;
          totalRevenue += revenue;
        });

        organizersData.push({
          id: doc.id,
          name: userProfile.name || data.name || "N/A",
          email: userProfile.email || data.email || "N/A",
          phone: userProfile.phone || data.phone || "N/A",
          city: userProfile.city || data.city,
          state: userProfile.state || data.state,
          kycStatus: data.kycStatus || "not_started",
          kycSubmittedAt: data.kycSubmittedAt,
          kycVerifiedAt: data.kycVerifiedAt,
          kycDetails: data.kycDetails,
          bankDetails: data.bankDetails,
          payoutStatus: data.payoutStatus || "NOT_ADDED",
          bankAddedAt: data.bankAddedAt,
          payoutKyc: data.payoutKyc || { enabled: false },
          events,
          totalEvents: events.length,
          totalTicketsSold,
          totalRevenue,
          payoutEligible: totalRevenue * 0.85, // 85% after platform fee
          payoutHistory: data.payoutHistory || [],
        });
      }

      setOrganizers(organizersData);
    } catch (error) {
      console.error("Error loading organizers:", error);
      toast.error("Failed to load organizers data");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizers = organizers.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.phone.includes(searchTerm)
  );

  const getKycStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 size={12} />
            Verified
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} />
            Pending
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle size={12} />
            Not Started
          </span>
        );
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    if (status === "ADDED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle2 size={12} />
          Added
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle size={12} />
        Not Added
      </span>
    );
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleViewSupport = (userId: string) => {
    router.push(`/?userId=${userId}#support`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Update manual payout for an event (owner-only)
  const handleUpdatePayout = async (eventId: string, organizerId: string) => {
    if (!isOwner) {
      toast.error("Unauthorized: Owner access only");
      return;
    }

    const amount = parseFloat(payoutAmount) || 0;
    if (amount < 0) {
      toast.error("Payout amount cannot be negative");
      return;
    }

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        manualPayoutPaid: amount,
        manualPayoutNote: payoutNote.trim() || null,
        manualPayoutPaidAt: amount > 0 ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });

      toast.success("Payout updated successfully");
      setEditingPayout(null);
      setPayoutAmount("");
      setPayoutNote("");
      await loadOrganizers(); // Refresh data
    } catch (error) {
      console.error("Error updating payout:", error);
      toast.error("Failed to update payout");
    }
  };

  const startEditingPayout = (event: EventData) => {
    setEditingPayout({ eventId: event.id, organizerId: "" });
    setPayoutAmount(event.manualPayoutPaid?.toString() || "0");
    setPayoutNote(event.manualPayoutNote || "");
  };

  const cancelEditingPayout = () => {
    setEditingPayout(null);
    setPayoutAmount("");
    setPayoutNote("");
  };

  const exportToCSV = () => {
    const headers = [
      "Organizer Name",
      "Email",
      "Phone",
      "City",
      "State",
      "KYC Status",
      "KYC Submitted",
      "KYC Verified",
      "Bank Name",
      "IFSC Code",
      "Account Number",
      "Beneficiary Name",
      "Account Type",
      "Payout Status",
      "Bank Added Date",
      "Total Events",
      "Total Tickets Sold",
      "Total Revenue",
      "Payout Eligible",
      "Payout Ready",
    ];

    const rows: Array<Array<string | number>> = filteredOrganizers.map((org) => {
      const kycStatus = getDisplayKycStatus(org.kycStatus);
      const bankStatus = getDisplayBankStatus(org.payoutStatus);
      // Payout ready logic: KYC verified AND bank details added
      const payoutReady = kycStatus === "verified" && bankStatus === "ADDED";

      return [
        org.name,
        org.email,
        org.phone,
        org.city || "N/A",
        org.state || "N/A",
        kycStatus,
        formatDate(org.kycSubmittedAt),
        formatDate(org.kycVerifiedAt),
        org.bankDetails?.bankName || "N/A",
        org.bankDetails?.ifscCode || "N/A",
        org.bankDetails?.accountNumberLast4 ? `XXXXXX${org.bankDetails.accountNumberLast4}` : "N/A",
        org.bankDetails?.beneficiaryName || "N/A",
        org.bankDetails?.accountType || "N/A",
        bankStatus,
        formatDate(org.bankAddedAt),
        org.totalEvents,
        org.totalTicketsSold,
        org.totalRevenue,
        org.payoutEligible,
        payoutReady ? "Yes" : "No",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row: Array<string | number>) =>
        row.map((cell: string | number) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizers-bank-details-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organizers data...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Owner Panel
                </h1>
                <p className="text-sm text-gray-500">
                  All Organizers Data (Owner Only)
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Organizers</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {organizers.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">KYC Verified</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {organizers.filter((o) => getDisplayKycStatus(o.kycStatus) === "verified").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Bank Added</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {organizers.filter((o) => getDisplayBankStatus(o.payoutStatus) === "ADDED").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Payout Ready</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {
                organizers.filter(
                  (o) =>
                    getDisplayKycStatus(o.kycStatus) === "verified" &&
                    getDisplayBankStatus(o.payoutStatus) === "ADDED"
                ).length
              }
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">
              {formatCurrency(organizers.reduce((sum, o) => sum + o.totalRevenue, 0))}
            </p>
          </div>
        </div>

        {/* Search and Export */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Organizers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                    
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organizer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KYC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout Ready
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrganizers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No organizers found
                    </td>
                  </tr>
                ) : (
                  filteredOrganizers.map((org) => {
                    const isExpanded = expandedRows.has(org.id);
                    const kycStatus = getDisplayKycStatus(org.kycStatus);
                    const bankStatus = getDisplayBankStatus(org.payoutStatus);
                    // Payout ready logic: KYC verified AND bank details added
                    const isPayoutReady = kycStatus === "verified" && bankStatus === "ADDED";
                    
                    return (
                      <>
                        <tr key={org.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleRowExpansion(org.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{org.name}</div>
                            <div className="text-xs text-gray-500">{org.email}</div>
                            <div className="text-xs text-gray-500">{org.phone}</div>
                            {(org.city || org.state) && (
                              <div className="text-xs text-gray-400 mt-1">
                                {[org.city, org.state].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getKycStatusBadge(kycStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPayoutStatusBadge(bankStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{org.totalEvents}</div>
                            <div className="text-xs text-gray-500">{org.totalTicketsSold} tickets</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(org.totalRevenue)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isPayoutReady ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle2 size={14} />
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  <XCircle size={14} />
                                  Not Ready
                                </span>
                              )}
                              <button
                                onClick={() => handleViewSupport(org.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                                title="View Support Chat"
                              >
                                <MessageSquare size={14} />
                                Support
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {isExpanded && (
                          <tr key={`${org.id}-details`}>
                            <td colSpan={7} className="px-6 py-6 bg-gray-50">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* KYC Details */}
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-600" />
                                    KYC Details
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Status:</span>
                                      <span className="ml-2">{getKycStatusBadge(kycStatus)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Submitted:</span>
                                      <span className="ml-2 text-gray-900">{formatDate(org.kycSubmittedAt)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Verified:</span>
                                      <span className="ml-2 text-gray-900">{formatDate(org.kycVerifiedAt)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Bank Details */}
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <DollarSign size={16} className="text-green-600" />
                                    Bank Details
                                  </h4>
                                  {org.bankDetails ? (
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-500">Beneficiary:</span>
                                        <span className="ml-2 text-gray-900">{org.bankDetails.beneficiaryName}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Bank:</span>
                                        <span className="ml-2 text-gray-900">{org.bankDetails.bankName}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">IFSC:</span>
                                        <span className="ml-2 font-mono text-gray-900">{org.bankDetails.ifscCode}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Account:</span>
                                        <span className="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-900">
                                          XXXXXX{org.bankDetails.accountNumberLast4}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Type:</span>
                                        <span className="ml-2 text-gray-900">{org.bankDetails.accountType}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Added:</span>
                                        <span className="ml-2 text-gray-900">{formatDate(org.bankAddedAt)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400">No bank details added</p>
                                  )}
                                </div>

                                {/* Payout Summary */}
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-purple-600" />
                                    Payout Summary
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Total Revenue:</span>
                                      <span className="ml-2 font-semibold text-gray-900">{formatCurrency(org.totalRevenue)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Platform Fee (15%):</span>
                                      <span className="ml-2 text-gray-900">{formatCurrency(org.totalRevenue * 0.15)}</span>
                                    </div>
                                    <div className="pt-2 border-t">
                                      <span className="text-gray-500">Payout Eligible:</span>
                                      <span className="ml-2 font-bold text-green-600">{formatCurrency(org.payoutEligible)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Status:</span>
                                      <span className="ml-2">
                                        {isPayoutReady ? (
                                          <span className="text-green-600 font-medium">✓ Ready for Payout</span>
                                        ) : (
                                          <span className="text-orange-600 font-medium">⚠ Pending KYC/Bank</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Events List */}
                              {org.events.length > 0 && (
                                <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-600" />
                                    Events ({org.events.length})
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Event Name</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tickets Sold</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Revenue</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Paid Amount</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {org.events.map((event) => {
                                          const isEditing = editingPayout?.eventId === event.id;
                                          return (
                                            <tr key={event.id} className="hover:bg-gray-50">
                                              <td className="px-4 py-2 text-sm text-gray-900">{event.title}</td>
                                              <td className="px-4 py-2 text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                  event.status === "published" ? "bg-green-100 text-green-800" :
                                                  event.status === "completed" ? "bg-blue-100 text-blue-800" :
                                                  "bg-gray-100 text-gray-800"
                                                }`}>
                                                  {event.status}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-900">{event.ticketsSold}</td>
                                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{formatCurrency(event.revenue)}</td>
                                              <td className="px-4 py-2 text-sm">
                                                {isEditing ? (
                                                  <div className="space-y-2">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      step="0.01"
                                                      value={payoutAmount}
                                                      onChange={(e) => setPayoutAmount(e.target.value)}
                                                      placeholder="0.00"
                                                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <input
                                                      type="text"
                                                      value={payoutNote}
                                                      onChange={(e) => setPayoutNote(e.target.value)}
                                                      placeholder="Note (optional)"
                                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                  </div>
                                                ) : (
                                                  <div>
                                                    <span className={`font-medium ${
                                                      (event.manualPayoutPaid || 0) > 0 ? "text-green-600" : "text-gray-500"
                                                    }`}>
                                                      {formatCurrency(event.manualPayoutPaid || 0)}
                                                    </span>
                                                    {event.manualPayoutNote && (
                                                      <p className="text-xs text-gray-400 mt-0.5">{event.manualPayoutNote}</p>
                                                    )}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">{formatDate(event.date)}</td>
                                              <td className="px-4 py-2 text-sm">
                                                {isEditing ? (
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => handleUpdatePayout(event.id, org.id)}
                                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                      title="Save"
                                                    >
                                                      <Save size={14} />
                                                    </button>
                                                    <button
                                                      onClick={cancelEditingPayout}
                                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                      title="Cancel"
                                                    >
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => startEditingPayout(event)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit Payout"
                                                  >
                                                    <Edit2 size={14} />
                                                  </button>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Security Notice</p>
              <p>
                This is a read-only view. Account numbers are masked for security.
                Only organizers with verified KYC and added bank details are payout-ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
