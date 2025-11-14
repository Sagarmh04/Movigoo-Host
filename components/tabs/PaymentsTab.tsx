"use client";

export default function PaymentsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Payments & Payouts</h1>
        <p className="text-gray-500 mt-1">
          Track earnings, settlement details, and payout activity.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Earnings Overview</h2>
        <p className="text-gray-500">
          Earnings chart/summary placeholder.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Payout Requests</h2>
        <p className="text-gray-500">
          Payout request table placeholder.
        </p>
      </div>
    </div>
  );
}
