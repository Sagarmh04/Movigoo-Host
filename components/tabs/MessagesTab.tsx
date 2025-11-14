"use client";

export default function MessagesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">
          Chat with customers in real time.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Inbox</h2>
        <p className="text-gray-500">
          Chat thread list placeholder.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Conversation</h2>
        <p className="text-gray-500">
          Chat window placeholder.
        </p>
      </div>
    </div>
  );
}
