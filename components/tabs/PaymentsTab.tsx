"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Edit2, AlertCircle, Landmark } from "lucide-react";
import { toast } from "sonner";
import BankDetailsForm, { BankDetailsData } from "@/components/payments/BankDetailsForm";
import EditConfirmationModal from "@/components/payments/EditConfirmationModal";
import { saveBankDetails, getBankDetails, OrganizerPaymentData } from "@/lib/api/bankDetails";
import { getKycStatus } from "@/lib/api/events";
import { KycStatus } from "@/lib/types/event";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";

type AdminOrganizerBankRow = {
  organizerId: string;
  name: string;
  email: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  kycStatus: string;
  last4: string;
};

type PayoutRecord = {
  id: string;
  organizerId: string;
  amount: number;
  status: string;
  date: any;
};

export default function PaymentsTab() {
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [paymentData, setPaymentData] = useState<OrganizerPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [adminRows, setAdminRows] = useState<AdminOrganizerBankRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({});
  const [payoutProcessing, setPayoutProcessing] = useState<Record<string, boolean>>({});
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([]);

  // Owner email - single source of truth
  const OWNER_EMAIL = "movigoo4@gmail.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const userIsOwner = user?.email === OWNER_EMAIL;
      setIsOwner(userIsOwner);
      if (userIsOwner) {
        loadAdminData(user);
      } else {
        loadData();
        loadOrganizerPayoutHistory(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kyc, payment] = await Promise.all([
        getKycStatus(),
        getBankDetails(),
      ]);
      setKycStatus(kyc);
      setPaymentData(payment);
    } catch (error) {
      console.error("Error loading payment data:", error);
      toast.error("Failed to load payment information");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async (user: User | null) => {
    if (user?.email !== OWNER_EMAIL) {
      return;
    }

    setLoading(true);
    try {
      const organizersRef = collection(db, "organizers");
      const snapshot = await getDocs(organizersRef);

      const rows = await Promise.all(
        snapshot.docs.map(async (organizerDoc) => {
          const data = organizerDoc.data() as any;
          const bankDetails = data.bankDetails as any | undefined;

          const userDocRef = doc(db, "users", organizerDoc.id);
          const userDocSnap = await getDoc(userDocRef);
          const userProfile = userDocSnap.exists()
            ? ((userDocSnap.data() as any)?.profile ?? {})
            : {};

          const email =
            (typeof userProfile.email === "string" && userProfile.email) ||
            (typeof data.email === "string" && data.email) ||
            "";
          const name =
            (typeof userProfile.name === "string" && userProfile.name) ||
            (typeof data.name === "string" && data.name) ||
            "";

          const accountNumberFull =
            typeof bankDetails?.accountNumberFull === "string"
              ? bankDetails.accountNumberFull
              : "";
          const accountNumberLast4 =
            typeof bankDetails?.accountNumberLast4 === "string"
              ? bankDetails.accountNumberLast4
              : "";
          const accountNumber =
            accountNumberFull ||
            (accountNumberLast4 ? `XXXXXX${accountNumberLast4}` : "");

          const row: AdminOrganizerBankRow = {
            organizerId: organizerDoc.id,
            name,
            email,
            bankName: typeof bankDetails?.bankName === "string" ? bankDetails.bankName : "",
            accountNumber,
            ifscCode: typeof bankDetails?.ifscCode === "string" ? bankDetails.ifscCode : "",
            kycStatus: typeof data.kycStatus === "string" ? data.kycStatus : "not_started",
            last4: accountNumberLast4,
          };

          return row;
        })
      );

      // Only show organizers who have bank details filled
      setAdminRows(rows.filter((r) => !!r.bankName || !!r.ifscCode || !!r.accountNumber));
    } catch (error) {
      console.error("Error loading admin bank details:", error);
      toast.error("Failed to load organizers bank details");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (row: AdminOrganizerBankRow) => {
    const user = auth.currentUser;
    if (user?.email !== OWNER_EMAIL) {
      toast.error("Unauthorized: Owner only");
      return;
    }

    const raw = payoutAmounts[row.organizerId];
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payout amount");
      return;
    }

    if (!row.bankName || !row.last4) {
      toast.error("Missing bank details for this organizer");
      return;
    }

    setPayoutProcessing((prev) => ({ ...prev, [row.organizerId]: true }));
    try {
      await runTransaction(db, async (tx) => {
        const payoutsRef = collection(db, "payouts");
        const payoutDocRef = doc(payoutsRef);

        tx.set(payoutDocRef, {
          organizerId: row.organizerId,
          amount,
          date: serverTimestamp(),
          status: "completed",
          bankName: row.bankName,
          last4: row.last4,
        });

        const analyticsRef = doc(db, "host_analytics", row.organizerId);
        const analyticsSnap = await tx.get(analyticsRef);
        const current = analyticsSnap.exists() ? (analyticsSnap.data() as any) : {};
        const currentPaid = typeof current.totalPaidOut === "number" ? current.totalPaidOut : 0;

        tx.set(
          analyticsRef,
          {
            totalPaidOut: currentPaid + amount,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      toast.success(`Payout recorded: ₹${amount.toFixed(2)} for ${row.email || row.organizerId}`);
      setPayoutAmounts((prev) => ({ ...prev, [row.organizerId]: "" }));
    } catch (error) {
      console.error("Error processing payout:", error);
      toast.error("Failed to record payout");
    } finally {
      setPayoutProcessing((prev) => ({ ...prev, [row.organizerId]: false }));
    }
  };

  const loadOrganizerPayoutHistory = async (user: User | null) => {
    if (!user?.uid || user?.email === OWNER_EMAIL) {
      return;
    }

    try {
      const payoutsRef = collection(db, "payouts");
      const q = query(
        payoutsRef,
        where("organizerId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      const rows: PayoutRecord[] = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          organizerId: data.organizerId,
          amount: typeof data.amount === "number" ? data.amount : 0,
          status: typeof data.status === "string" ? data.status : "completed",
          date: data.date,
        };
      });

      rows.sort((a, b) => {
        const aTime = a.date?.seconds || 0;
        const bTime = b.date?.seconds || 0;
        return bTime - aTime;
      });

      setPayoutHistory(rows);
    } catch (error) {
      console.error("Error loading payout history:", error);
    }
  };

  const formatPayoutDate = (ts: any) => {
    try {
      if (!ts) return "-";
      const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const handleSaveBankDetails = async (details: BankDetailsData) => {
    try {
      await saveBankDetails(details);
      await loadData();
      setIsEditing(false);
      toast.success("Bank details saved successfully");
    } catch (error) {
      console.error("Error saving bank details:", error);
      throw error;
    }
  };

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleConfirmEdit = () => {
    setShowEditModal(false);
    setIsEditing(true);
  };

  const renderBankDetailsSection = () => {
    if (isOwner) {
      const filtered = adminRows.filter((r) => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
          r.email.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
        );
      });

      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manual Payouts (Admin)</h2>
              <p className="text-sm text-gray-500 mt-1">
                All organizers&apos; bank details
              </p>
            </div>

            <div className="w-full md:w-80">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email"
                className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IFSC Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.organizerId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{r.name || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.email || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.bankName || "N/A"}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{r.accountNumber || "N/A"}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{r.ifscCode || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.kycStatus || "N/A"}</td>
                      <td className="px-4 py-3">
                        <input
                          inputMode="decimal"
                          value={payoutAmounts[r.organizerId] ?? ""}
                          onChange={(e) =>
                            setPayoutAmounts((prev) => ({
                              ...prev,
                              [r.organizerId]: e.target.value,
                            }))
                          }
                          placeholder="5000"
                          className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleProcessPayout(r)}
                          disabled={!!payoutProcessing[r.organizerId]}
                          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                        >
                          {payoutProcessing[r.organizerId] ? "Processing..." : "Process Payout"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>
                        No organizers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      );
    }

    if (kycStatus !== "verified") {
      return (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Bank Details</h2>
              <p className="text-gray-600">
                Complete KYC to add bank details
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Your KYC verification is required before you can add bank account information for payouts.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (paymentData?.payoutStatus === "ADDED" && paymentData.bankDetails && !isEditing) {
      const { bankDetails } = paymentData;
      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Bank Details</h2>
            </div>
            <button
              onClick={handleEditClick}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
            >
              <Edit2 size={16} />
              Edit
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium flex items-center gap-2">
              <CheckCircle2 size={18} />
              Bank details added successfully
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Beneficiary Name
              </label>
              <p className="text-gray-900 font-medium">{bankDetails.beneficiaryName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Account Type
              </label>
              <p className="text-gray-900 font-medium">
                {bankDetails.accountType === "SAVINGS" ? "Savings" : "Current"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Bank Name
              </label>
              <p className="text-gray-900 font-medium">{bankDetails.bankName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Account Number
              </label>
              <p className="text-gray-900 font-medium font-mono">
                XXXXXX{bankDetails.accountNumberLast4}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                IFSC Code
              </label>
              <p className="text-gray-900 font-medium font-mono">{bankDetails.ifscCode}</p>
            </div>

            {paymentData.bankAddedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Added On
                </label>
                <p className="text-gray-900 font-medium">
                  {new Date(paymentData.bankAddedAt.seconds * 1000).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-6">
          <Landmark className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Add Bank Details</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Add your bank account details. Payouts are processed manually by Movigoo after event completion.
        </p>
        <BankDetailsForm
          onSubmit={handleSaveBankDetails}
          onCancel={isEditing ? () => setIsEditing(false) : undefined}
        />
      </div>
    );
  };

  const renderPayoutHistorySection = () => {
    if (isOwner) {
      return null;
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payout History</h2>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : payoutHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No payouts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {payoutHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{formatPayoutDate(p.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">Completed</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Manual Payouts</h1>
        <p className="text-gray-500 mt-1">
          Manage your bank account information for manual payouts processed by Movigoo.
        </p>
      </div>

      {renderBankDetailsSection()}

      {!isOwner && renderPayoutHistorySection()}

      <EditConfirmationModal
        isOpen={showEditModal}
        onConfirm={handleConfirmEdit}
        onCancel={() => setShowEditModal(false)}
      />
    </div>
  );
}
