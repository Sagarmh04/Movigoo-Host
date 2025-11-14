"use client";

export default function VerificationTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Verification & Compliance</h1>
        <p className="text-gray-500 mt-1">
          Upload and manage official documents required for verification.
        </p>
      </div>

      {/* KYC Upload */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">KYC Document Upload</h2>
        <p className="text-gray-500">
          KYC form placeholder (ID proof, address proof, business documents).
        </p>
      </div>

      {/* Verification Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
        <p className="text-gray-500">
          Status display placeholder (Pending, Approved, Rejected).
        </p>
      </div>
    </div>
  );
}
