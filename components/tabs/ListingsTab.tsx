"use client";

export default function ListingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Listings</h1>
        <p className="text-gray-500 mt-1">
          Manage all your Movigoo events, spaces, or listings.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Your Listings</h2>
        <p className="text-gray-500">
          No listings added yet — listing cards will appear here.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Add New Listing</h2>
        <p className="text-gray-500">
          Create listing form placeholder.
        </p>
      </div>
    </div>
  );
}
