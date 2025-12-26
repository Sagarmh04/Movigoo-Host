"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { Shield, Search, Download, CheckCircle2, XCircle, Clock } from "lucide-react";

interface OrganizerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  kycStatus: string;
  bankDetails?: {
    beneficiaryName: string;
    accountType: string;
    bankName: string;
    accountNumberLast4: string;
    ifscCode: string;
  };
  payoutStatus: string;
  bankAddedAt?: any;
}

export default function SuperAdminOrganizersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<OrganizerData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user has SUPER_ADMIN role
      const idTokenResult = await user.getIdTokenResult();
      const role = idTokenResult.claims.role as string;

      if (role !== "SUPER_ADMIN") {
        toast.error("Access Denied: Super Admin only");
        router.push("/");
        return;
      }

      setUserRole(role);
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

        organizersData.push({
          id: doc.id,
          name: userProfile.name || data.name || "N/A",
          email: userProfile.email || data.email || "N/A",
          phone: userProfile.phone || data.phone || "N/A",
          kycStatus: data.kycStatus || "not_started",
          bankDetails: data.bankDetails,
          payoutStatus: data.payoutStatus || "NOT_ADDED",
          bankAddedAt: data.bankAddedAt,
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

  const exportToCSV = () => {
    const headers = [
      "Organizer Name",
      "Email",
      "Phone",
      "KYC Status",
      "Bank Name",
      "IFSC Code",
      "Account Number",
      "Payout Status",
      "Bank Added Date",
    ];

    const rows = filteredOrganizers.map((org) => [
      org.name,
      org.email,
      org.phone,
      org.kycStatus,
      org.bankDetails?.bankName || "N/A",
      org.bankDetails?.ifscCode || "N/A",
      org.bankDetails?.accountNumberLast4 ? `XXXXXX${org.bankDetails.accountNumberLast4}` : "N/A",
      org.payoutStatus,
      org.bankAddedAt
        ? new Date(org.bankAddedAt.seconds * 1000).toLocaleDateString()
        : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
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

  if (userRole !== "SUPER_ADMIN") {
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
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Organizers Bank Details (Owner Only)
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Organizers</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {organizers.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">KYC Verified</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {organizers.filter((o) => o.kycStatus === "verified").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Bank Added</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {organizers.filter((o) => o.payoutStatus === "ADDED").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Payout Ready</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {
                organizers.filter(
                  (o) => o.kycStatus === "verified" && o.payoutStatus === "ADDED"
                ).length
              }
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organizer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KYC Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IFSC Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrganizers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No organizers found
                    </td>
                  </tr>
                ) : (
                  filteredOrganizers.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {org.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{org.email}</div>
                        <div className="text-sm text-gray-500">{org.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getKycStatusBadge(org.kycStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {org.bankDetails?.bankName || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {org.bankDetails?.ifscCode || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {org.bankDetails?.accountNumberLast4 ? (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              XXXXXX{org.bankDetails.accountNumberLast4}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPayoutStatusBadge(org.payoutStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {org.bankAddedAt ? (
                            new Date(org.bankAddedAt.seconds * 1000).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
