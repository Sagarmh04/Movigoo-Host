"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import EventCreationWizard from "@/components/events/EventCreationWizard";
import { KycStatus } from "@/lib/types/event";
import { getKycStatus } from "@/lib/api/events";

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        console.log("✏️ [Edit Event Page] Fetching KYC status...");
        const status = await getKycStatus();
        console.log("✏️ [Edit Event Page] Received KYC status:", status);
        setKycStatus(status);
        console.log("✏️ [Edit Event Page] State updated to:", status);
      } catch (error) {
        console.error("❌ [Edit Event Page] Error fetching KYC status:", error);
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
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  console.log("✏️ [Edit Event Page] Rendering wizard with kycStatus:", kycStatus);
  return <EventCreationWizard eventId={eventId} kycStatus={kycStatus} />;
}
