"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  UserCog,
  Shield,
} from "lucide-react";

import DashboardOverview from "@/components/tabs/DashboardOverview";
// import BookingsTab from "@/components/tabs/BookingsTab";
import EventListingsTab from "@/components/tabs/EventListingsTab";
// import CustomersTab from "@/components/tabs/CustomersTab";
import PaymentsTab from "@/components/tabs/PaymentsTab";
// import ReviewsTab from "@/components/tabs/ReviewsTab";
// import MessagesTab from "@/components/tabs/MessagesTab";
// import OffersTab from "@/components/tabs/OffersTab";
import AnalyticsTab from "@/components/tabs/AnalyticsTab";
import SupportTab from "@/components/tabs/SupportTab";
// import SettingsTab from "@/components/tabs/SettingsTab";
import VerificationTab from "@/components/tabs/VerificationTab";
import CrewTab from "@/components/tabs/CrewTab";

import MobileNavbar from "@/components/dashboard/MobileNavbar";
import LogoutButton from "@/components/auth/LogoutButton";
import KycNotification from "@/components/dashboard/KycNotification";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [kycStatus, setKycStatus] = useState<string>("none");
  const [isOwner, setIsOwner] = useState(false);

  // Owner email - single source of truth
  const OWNER_EMAIL = "movigoo4@gmail.com";

  useEffect(() => {
    loadKycStatus();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      checkOwnerAccess(user);
    });
    
    // Check for hash in URL to switch tabs (e.g., #support from owner panel)
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove the '#'
      if (hash) {
        setActiveTab(hash);
      }
    }

    return () => unsubscribe();
  }, []);

  // Refresh KYC status when switching to verification tab
  useEffect(() => {
    if (activeTab === "verification") {
      loadKycStatus();
    }
  }, [activeTab]);

  const loadKycStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/getKycStatus`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKycStatus(data.kycStatus || "none");
      }
    } catch (error) {
      console.error("Error loading KYC status:", error);
      // Don't set error state here to avoid breaking UI
    }
  };

  const checkOwnerAccess = (user: User | null) => {
    try {
      const userIsOwner = user?.email === OWNER_EMAIL;
      setIsOwner(userIsOwner);
    } catch (error) {
      console.error("Error checking owner access:", error);
      // Don't set error state here to avoid breaking UI
    }
  };

  const openKycTab = () => {
    setActiveTab("verification");
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Home, component: <DashboardOverview /> },
    { id: "listings", label: "EventListings", icon: Building2, component: <EventListingsTab /> },
    { id: "payments", label: "Payments", icon: IndianRupee, component: <PaymentsTab /> },
    { id: "analytics", label: "Analytics", icon: BarChart2, component: <AnalyticsTab /> },
    { id: "crew", label: "Crew", icon: UserCog, component: <CrewTab /> },
    { id: "support", label: "Support", icon: LifeBuoy, component: <SupportTab /> },
    { id: "verification", label: "Verification", icon: ShieldCheck, component: <VerificationTab onKycStatusChange={loadKycStatus} /> },
  ];

  const ownerLinks = isOwner
    ? [
        { label: "Owner Panel", href: "/owner/organizers" },
        { label: "KYC Management", tabId: "verification" },
        { label: "Manual Payouts", tabId: "payments" },
        { label: "Support Tickets", tabId: "support" },
      ]
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* KYC Notification Banner */}
      <KycNotification kycStatus={isOwner ? "verified" : kycStatus} onOpenKyc={openKycTab} />

      <div className="flex flex-1">
        {/* Mobile Navbar */}
        <MobileNavbar
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ownerLinks={ownerLinks}
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

          <div className="px-4 py-4 border-t">
            {isOwner && (
              <>
                <div className="mb-3 border-t border-gray-300" />
                <button
                  onClick={() => router.push("/owner/organizers")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-500 hover:bg-blue-500/10 transition mb-2"
                >
                  <Shield size={18} />
                  Owner Panel
                </button>

                <button
                  onClick={() => setActiveTab("verification")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-500 hover:bg-blue-500/10 transition mb-2"
                >
                  <ShieldCheck size={18} />
                  KYC Management
                </button>

                <button
                  onClick={() => setActiveTab("payments")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-500 hover:bg-blue-500/10 transition mb-2"
                >
                  <IndianRupee size={18} />
                  Manual Payouts
                </button>

                <button
                  onClick={() => setActiveTab("support")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-500 hover:bg-blue-500/10 transition"
                >
                  <MessageSquare size={18} />
                  Support Tickets
                </button>
              </>
            )}
            <LogoutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 pt-20 md:pt-6 overflow-y-auto">
          {tabs.find((t) => t.id === activeTab)?.component}
        </main>
      </div>
    </div>
  );
}
