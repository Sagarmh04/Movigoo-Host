"use client";

import { useState, useEffect } from "react";
import EventCreationWizard from "@/components/events/EventCreationWizard";
import { KycStatus } from "@/lib/types/event";
import { getKycStatus } from "@/lib/api/events";

export default function CreateEventPage() {
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const status = await getKycStatus();
        setKycStatus(status);
      } catch (error) {
        console.error("Error fetching KYC status:", error);
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
