"use client";

export default function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">
          Understand your audience and booking performance.
        </p>
      </div>

      {/* Traffic overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Traffic Overview</h2>
        <p className="text-gray-500">
          Traffic chart placeholder.
        </p>
      </div>

      {/* Trends */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Booking Trends</h2>
        <p className="text-gray-500">
          Booking trend visualization placeholder.
        </p>
      </div>
    </div>
  );
}
