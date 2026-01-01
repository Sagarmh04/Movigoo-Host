"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Edit2, AlertCircle, Landmark } from "lucide-react";
import { toast } from "sonner";
import BankDetailsForm, { BankDetailsData } from "@/components/payments/BankDetailsForm";
import EditConfirmationModal from "@/components/payments/EditConfirmationModal";
import { saveBankDetails, getBankDetails, OrganizerPaymentData } from "@/lib/api/bankDetails";
import { getKycStatus } from "@/lib/api/events";
import { KycStatus } from "@/lib/types/event";

export default function PaymentsTab() {
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [paymentData, setPaymentData] = useState<OrganizerPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Bank Details</h1>
        <p className="text-gray-500 mt-1">
          Manage your bank account information for manual payouts processed by Movigoo.
        </p>
      </div>

      {renderBankDetailsSection()}

      <EditConfirmationModal
        isOpen={showEditModal}
        onConfirm={handleConfirmEdit}
        onCancel={() => setShowEditModal(false)}
      />
    </div>
  );
}
