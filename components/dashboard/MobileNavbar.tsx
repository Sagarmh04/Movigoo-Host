"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface TabItem {
  id: string;
  label: string;
}

export default function MobileNavbar({
  tabs,
  activeTab,
  setActiveTab,
}: {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b shadow-sm">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-3">
        <img src="/logo.png" alt="Movigoo Logo" className="h-8" />

        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="border-t bg-white shadow-inner">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 border-b text-sm ${
                activeTab === t.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
