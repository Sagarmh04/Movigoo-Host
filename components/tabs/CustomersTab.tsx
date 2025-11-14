"use client";

export default function CustomersTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Customers</h1>
        <p className="text-gray-500 mt-1">
          View profiles and activity of your users.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">All Users</h2>
        <p className="text-gray-500">
          User list placeholder — will be replaced by actual user data.
        </p>
      </div>
    </div>
  );
}
