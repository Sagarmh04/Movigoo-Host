"use client";

import { useState, useEffect } from "react";
import { getEventAnalytics, EventAnalytics } from "@/lib/utils/analytics";
import InventoryHealthCard from "./InventoryHealthCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface EventAnalyticsExampleProps {
  eventId: string;
}

/**
 * Example component showing how to use the InventoryHealthCard
 * with real-time event analytics data
 */
export default function EventAnalyticsExample({ eventId }: EventAnalyticsExampleProps) {
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [eventId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEventAnalytics(eventId);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics || !analytics.ticketBreakdown || Object.keys(analytics.ticketBreakdown).length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No ticket sales data available yet. Sales will appear here once bookings are made.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <InventoryHealthCard
      ticketBreakdown={analytics.ticketBreakdown}
      totalRevenue={analytics.totalRevenue}
      totalTicketsSold={analytics.totalTicketsSold}
      eventName={analytics.eventName}
    />
  );
}
