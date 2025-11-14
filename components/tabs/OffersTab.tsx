"use client";

export default function OffersTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Offers & Coupons</h1>
        <p className="text-gray-500 mt-1">
          Create and manage discount codes and promotional offers.
        </p>
      </div>

      {/* Create Offer */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Create New Offer</h2>
        <p className="text-gray-500">
          Placeholder for offer creation form.
        </p>
      </div>

      {/* Manage Offers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">All Offers</h2>
        <p className="text-gray-500">
          Offers list placeholder.
        </p>
      </div>
    </div>
  );
}
