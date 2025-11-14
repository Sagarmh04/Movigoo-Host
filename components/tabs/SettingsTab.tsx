"use client";

export default function SettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account settings, preferences, and security options.
        </p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
        <p className="text-gray-500">
          Placeholder for profile update form (name, email, phone, etc.)
        </p>
      </div>

      {/* Notification Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <p className="text-gray-500">
          Notification preference toggles placeholder.
        </p>
      </div>

      {/* Security */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Security</h2>
        <p className="text-gray-500">
          Password update, session management placeholder.
        </p>
      </div>
    </div>
  );
}
