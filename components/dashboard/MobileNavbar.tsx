"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

interface TabItem {
  id: string;
  label: string;
}

interface OwnerLinkItem {
  label: string;
  href?: string;
  tabId?: string;
}

export default function MobileNavbar({
  tabs,
  activeTab,
  setActiveTab,
  ownerLinks,
}: {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  ownerLinks?: OwnerLinkItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b shadow-sm">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-3">
        <img src="/logo.png" alt="Movigoo Logo" className="h-8" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
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

          {!!ownerLinks?.length && (
            <div className="border-t bg-gray-50">
              {ownerLinks.map((link) => (
                <button
                  key={link.href || link.tabId || link.label}
                  onClick={() => {
                    if (link.tabId) {
                      setActiveTab(link.tabId);
                    } else if (link.href) {
                      router.push(link.href);
                    }
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
