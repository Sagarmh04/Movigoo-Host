"use client";

export default function SupportTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Support & Tickets</h1>
        <p className="text-gray-500 mt-1">
          Manage support requests and respond to user issues.
        </p>
      </div>

      {/* Ticket list */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Support Tickets</h2>
        <p className="text-gray-500">
          Ticket table placeholder.
        </p>
      </div>

      {/* Ticket details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Ticket Details</h2>
        <p className="text-gray-500">
          Selected ticket conversation placeholder.
        </p>
      </div>
    </div>
  );
}
