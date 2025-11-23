"use client";

import { useState, useEffect } from "react";
import EventCreationWizard from "@/components/events/EventCreationWizard";
import { KycStatus } from "@/lib/types/event";

export default function CreateEventPage() {
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch KYC status from backend
    const fetchKycStatus = async () => {
      try {
        console.log("[PLACEHOLDER] Fetching KYC status...");
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // PLACEHOLDER: Mock KYC status - replace with actual API call
        // const response = await fetch("/api/host/getKycStatus");
        // const data = await response.json();
        // setKycStatus(data.status);
        
        // For demo: set to "verified" - change this to test different statuses
        setKycStatus("verified");
      } catch (error) {
        console.error("[PLACEHOLDER] Error fetching KYC status:", error);
        setKycStatus("not_started");
      } finally {
        setLoading(false);
      }
    };

    fetchKycStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <EventCreationWizard kycStatus={kycStatus} />;
}
