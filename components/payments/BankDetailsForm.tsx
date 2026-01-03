"use client";

import { useState } from "react";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BankDetailsFormProps {
  onSubmit: (details: BankDetailsData) => Promise<void>;
  onCancel?: () => void;
  initialData?: BankDetailsData | null;
}

export interface BankDetailsData {
  beneficiaryName: string;
  accountType: "SAVINGS" | "CURRENT";
  bankName: string;
  accountNumber: string;
  accountNumberConfirm: string;
  ifscCode: string;
}

const INDIAN_BANKS = [
  // Public Sector Banks
  { category: "Public Sector Banks", name: "State Bank of India" },
  { category: "Public Sector Banks", name: "Punjab National Bank" },
  { category: "Public Sector Banks", name: "Bank of Baroda" },
  { category: "Public Sector Banks", name: "Canara Bank" },
  { category: "Public Sector Banks", name: "Union Bank of India" },
  { category: "Public Sector Banks", name: "Indian Bank" },
  { category: "Public Sector Banks", name: "Bank of India" },
  { category: "Public Sector Banks", name: "Central Bank of India" },
  { category: "Public Sector Banks", name: "UCO Bank" },
  { category: "Public Sector Banks", name: "Bank of Maharashtra" },
  
  // Private Banks
  { category: "Private Banks", name: "HDFC Bank" },
  { category: "Private Banks", name: "ICICI Bank" },
  { category: "Private Banks", name: "Axis Bank" },
  { category: "Private Banks", name: "Kotak Mahindra Bank" },
  { category: "Private Banks", name: "Yes Bank" },
  { category: "Private Banks", name: "IDFC First Bank" },
  { category: "Private Banks", name: "IndusInd Bank" },
  { category: "Private Banks", name: "Federal Bank" },
  { category: "Private Banks", name: "South Indian Bank" },
  { category: "Private Banks", name: "Bandhan Bank" },
  { category: "Private Banks", name: "RBL Bank" },
  
  // Small / Payments Banks
  { category: "Small / Payments Banks", name: "AU Small Finance Bank" },
  { category: "Small / Payments Banks", name: "Ujjivan Small Finance Bank" },
  { category: "Small / Payments Banks", name: "Equitas Small Finance Bank" },
  { category: "Small / Payments Banks", name: "Jana Small Finance Bank" },
  { category: "Small / Payments Banks", name: "Paytm Payments Bank" },
  { category: "Small / Payments Banks", name: "Airtel Payments Bank" },
];

export default function BankDetailsForm({ onSubmit, onCancel, initialData }: BankDetailsFormProps) {
  const [formData, setFormData] = useState<BankDetailsData>({
    beneficiaryName: initialData?.beneficiaryName || "",
    accountType: initialData?.accountType || "SAVINGS",
    bankName: initialData?.bankName || "",
    accountNumber: initialData?.accountNumber || "",
    accountNumberConfirm: initialData?.accountNumberConfirm || "",
    ifscCode: initialData?.ifscCode || "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const filteredBanks = INDIAN_BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateIFSC = (ifsc: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.beneficiaryName.trim()) {
      newErrors.beneficiaryName = "Beneficiary name is required";
    }

    if (!formData.bankName) {
      newErrors.bankName = "Please select a bank";
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required";
    } else if (!/^\d+$/.test(formData.accountNumber)) {
      newErrors.accountNumber = "Account number must contain only digits";
    }

    if (!formData.accountNumberConfirm.trim()) {
      newErrors.accountNumberConfirm = "Please re-enter account number";
    } else if (formData.accountNumber !== formData.accountNumberConfirm) {
      newErrors.accountNumberConfirm = "Account numbers do not match";
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = "IFSC code is required";
    } else if (!validateIFSC(formData.ifscCode.toUpperCase())) {
      newErrors.ifscCode = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        ifscCode: formData.ifscCode.toUpperCase(),
      });
      toast.success("Bank details saved successfully");
    } catch (error) {
      toast.error("Failed to save bank details");
      console.error("Error saving bank details:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof BankDetailsData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Beneficiary Name */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Beneficiary Name <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">As per bank records</p>
        <input
          type="text"
          value={formData.beneficiaryName}
          onChange={(e) => handleInputChange("beneficiaryName", e.target.value)}
          className={`w-full px-4 py-2 bg-[#3a3a3a] text-white placeholder:text-gray-400 border rounded-lg focus:border-white/30 focus:outline-none ${
            errors.beneficiaryName ? "border-red-500" : "border-white/10"
          }`}
          placeholder="Enter beneficiary name"
        />
        {errors.beneficiaryName && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.beneficiaryName}
          </p>
        )}
      </div>

      {/* Account Type */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Account Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.accountType}
          onChange={(e) => handleInputChange("accountType", e.target.value as "SAVINGS" | "CURRENT")}
          className="w-full px-4 py-2 bg-[#3a3a3a] text-white border border-white/10 rounded-lg focus:border-white/30 focus:outline-none"
        >
          <option className="bg-[#3a3a3a] text-white" value="SAVINGS">Savings</option>
          <option className="bg-[#3a3a3a] text-white" value="CURRENT">Current</option>
        </select>
      </div>

      {/* Bank Name (Searchable Dropdown) */}
      <div className="relative">
        <label className="block text-sm font-medium text-black mb-2">
          Bank Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={formData.bankName || searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!formData.bankName) {
                setShowBankDropdown(true);
              }
            }}
            onFocus={() => setShowBankDropdown(true)}
            className={`w-full pl-10 pr-4 py-2 bg-[#3a3a3a] text-white placeholder:text-gray-400 border rounded-lg focus:border-white/30 focus:outline-none ${
              errors.bankName ? "border-red-500" : "border-white/10"
            }`}
            placeholder="Search for your bank"
          />
        </div>
        {errors.bankName && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.bankName}
          </p>
        )}
        
        {showBankDropdown && filteredBanks.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-white/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {Object.entries(
              filteredBanks.reduce((acc, bank) => {
                if (!acc[bank.category]) acc[bank.category] = [];
                acc[bank.category].push(bank);
                return acc;
              }, {} as Record<string, typeof INDIAN_BANKS>)
            ).map(([category, banks]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 bg-[#1a1a1a] sticky top-0">
                  {category}
                </div>
                {banks.map((bank) => (
                  <button
                    key={bank.name}
                    type="button"
                    onClick={() => {
                      handleInputChange("bankName", bank.name);
                      setSearchTerm("");
                      setShowBankDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-[#3a3a3a] focus:bg-[#3a3a3a] focus:outline-none"
                  >
                    {bank.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        
        {formData.bankName && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 size={16} />
            <span>Selected: {formData.bankName}</span>
            <button
              type="button"
              onClick={() => {
                handleInputChange("bankName", "");
                setSearchTerm("");
                setShowBankDropdown(true);
              }}
              className="text-blue-400 hover:underline ml-auto"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Account Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.accountNumber}
          onChange={(e) => handleInputChange("accountNumber", e.target.value.replace(/\D/g, ""))}
          className={`w-full px-4 py-2 bg-[#3a3a3a] text-white placeholder:text-gray-400 border rounded-lg focus:border-white/30 focus:outline-none ${
            errors.accountNumber ? "border-red-500" : "border-white/10"
          }`}
          placeholder="Enter account number"
          maxLength={18}
        />
        {errors.accountNumber && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.accountNumber}
          </p>
        )}
      </div>

      {/* Re-enter Account Number */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Re-enter Account Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.accountNumberConfirm}
          onChange={(e) => handleInputChange("accountNumberConfirm", e.target.value.replace(/\D/g, ""))}
          className={`w-full px-4 py-2 bg-[#3a3a3a] text-white placeholder:text-gray-400 border rounded-lg focus:border-white/30 focus:outline-none ${
            errors.accountNumberConfirm ? "border-red-500" : "border-white/10"
          }`}
          placeholder="Re-enter account number"
          maxLength={18}
        />
        {errors.accountNumberConfirm && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.accountNumberConfirm}
          </p>
        )}
      </div>

      {/* IFSC Code */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          IFSC Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.ifscCode}
          onChange={(e) => handleInputChange("ifscCode", e.target.value.toUpperCase())}
          className={`w-full px-4 py-2 bg-[#3a3a3a] text-white placeholder:text-gray-400 border rounded-lg focus:border-white/30 focus:outline-none uppercase ${
            errors.ifscCode ? "border-red-500" : "border-white/10"
          }`}
          placeholder="e.g., SBIN0001234"
          maxLength={11}
        />
        {errors.ifscCode && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.ifscCode}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Format: 4 letters + 0 + 6 alphanumeric characters
        </p>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Saving..." : "Save Bank Details"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-white/5 disabled:opacity-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
