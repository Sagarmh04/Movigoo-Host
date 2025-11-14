"use client";

import { useState } from "react";
import {
  Home,
  CalendarCheck,
  Building2,
  Users,
  IndianRupee,
  Star,
  MessageSquare,
  TicketPercent,
  BarChart2,
  LifeBuoy,
  Settings,
  ShieldCheck,
} from "lucide-react";

import DashboardOverview from "@/components/tabs/DashboardOverview";
import BookingsTab from "@/components/tabs/BookingsTab";
import ListingsTab from "@/components/tabs/ListingsTab";
import CustomersTab from "@/components/tabs/CustomersTab";
import PaymentsTab from "@/components/tabs/PaymentsTab";
import ReviewsTab from "@/components/tabs/ReviewsTab";
import MessagesTab from "@/components/tabs/MessagesTab";
import OffersTab from "@/components/tabs/OffersTab";
import AnalyticsTab from "@/components/tabs/AnalyticsTab";
import SupportTab from "@/components/tabs/SupportTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import VerificationTab from "@/components/tabs/VerificationTab";

import MobileNavbar from "@/components/dashboard/MobileNavbar";

const tabs = [
  { id: "overview", label: "Overview", icon: Home, component: <DashboardOverview /> },
  { id: "bookings", label: "Bookings", icon: CalendarCheck, component: <BookingsTab /> },
  { id: "listings", label: "Listings", icon: Building2, component: <ListingsTab /> },
  { id: "customers", label: "Customers", icon: Users, component: <CustomersTab /> },
  { id: "payments", label: "Payments", icon: IndianRupee, component: <PaymentsTab /> },
  { id: "reviews", label: "Reviews", icon: Star, component: <ReviewsTab /> },
  { id: "messages", label: "Messages", icon: MessageSquare, component: <MessagesTab /> },
  { id: "offers", label: "Offers", icon: TicketPercent, component: <OffersTab /> },
  { id: "analytics", label: "Analytics", icon: BarChart2, component: <AnalyticsTab /> },
  { id: "support", label: "Support", icon: LifeBuoy, component: <SupportTab /> },
  { id: "settings", label: "Settings", icon: Settings, component: <SettingsTab /> },
  { id: "verification", label: "Verification", icon: ShieldCheck, component: <VerificationTab /> },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Mobile Navbar */}
      <MobileNavbar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white shadow-lg flex-col">
        <div className="px-6 py-6 border-b">
          <img src="/logo.png" className="h-10" alt="Movigoo Logo" />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition
                ${
                  activeTab === t.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 pt-20 md:pt-6 overflow-y-auto">
        {tabs.find((t) => t.id === activeTab)?.component}
      </main>
    </div>
  );
}
