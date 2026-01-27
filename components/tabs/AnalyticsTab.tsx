"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  Ticket,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TicketTypeBreakdown {
  soldCount: number;
  revenue: number;
}

interface EventAnalyticsData {
  eventId: string;
  eventName: string;
  eventDate: string;
  totalTicketsSold: number;
  totalRevenue: number;
  ticketBreakdown?: Record<string, TicketTypeBreakdown>;
}

export default function AnalyticsTab() {
  const [hostAnalytics, setHostAnalytics] = useState({
    totalRevenue: 0,
    totalTicketsSold: 0,
  });
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalyticsData[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please log in to view analytics");
      setLoading(false);
      return;
    }

    loadAnalytics(user.uid);
  }, []);

  const normalizeEventDate = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number") return new Date(value).toISOString();
    if (typeof value === "object") {
      if (typeof value.toDate === "function") {
        return value.toDate().toISOString();
      }
      if (typeof value.seconds === "number") {
        return new Date(value.seconds * 1000).toISOString();
      }
    }
    return "";
  };

  const loadAnalytics = async (hostId: string) => {
    try {
      setLoading(true);
      setError(null);

      const eventsQuery = query(
        collection(db, "events"),
        where("hostUid", "==", hostId)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventIds = eventsSnapshot.docs.map(doc => doc.id);

      if (eventIds.length === 0) {
        setLoading(false);
        return;
      }

      const unsubscribers = eventIds.map(eventId => {
        const analyticsDocRef = doc(db, "event_analytics", eventId);
        return onSnapshot(
          analyticsDocRef,
          async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              let eventName = data.eventName || "";
              let eventDate = normalizeEventDate(data.eventDate);

              // Aggressive self-healing: Fetch real event data if bad data detected
              if (!eventName || eventName === "Unnamed Event" || eventName === "Untitled Event" || !eventDate || eventDate === "N/A") {
                try {
                  const eventDocRef = doc(db, "events", docSnapshot.id);
                  const eventDoc = await getDoc(eventDocRef);
                  
                  if (eventDoc.exists()) {
                    const eventData = eventDoc.data();
                    const realEventName = eventData.title || eventData.name || "Unnamed Event";
                    const realEventDate = normalizeEventDate(eventData.date) || normalizeEventDate(eventData.startDate);

                    // Always update if we have real data and current data is bad
                    if (realEventName && realEventName !== "Unnamed Event" && realEventName !== "Untitled Event") {
                      eventName = realEventName;
                    }
                    if (realEventDate && realEventDate !== "N/A") {
                      eventDate = realEventDate;
                    }

                    // Immediately overwrite bad data in Firestore
                    console.log(`🔧 [Analytics] Aggressively fixing bad data for ${docSnapshot.id}`);
                    await updateDoc(analyticsDocRef, {
                      eventName,
                      eventDate,
                    });
                  }
                } catch (error) {
                  console.error(`Error fetching event details for ${docSnapshot.id}:`, error);
                }
              }

              const analyticsData: EventAnalyticsData = {
                eventId: docSnapshot.id,
                eventName,
                eventDate,
                totalTicketsSold: data.totalTicketsSold || 0,
                totalRevenue: data.totalRevenue || 0,
                ticketBreakdown: data.ticketBreakdown || {},
              };

              setEventAnalytics(prev => {
                const filtered = prev.filter(e => e.eventId !== docSnapshot.id);
                return [...filtered, analyticsData].sort((a, b) => 
                  b.totalRevenue - a.totalRevenue
                );
              });
            }
          }
        );
      });

      const hostAnalyticsRef = doc(db, "host_analytics", hostId);
      const hostAnalyticsUnsub = onSnapshot(
        hostAnalyticsRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setHostAnalytics({
              totalRevenue: data.totalRevenue || 0,
              totalTicketsSold: data.totalTicketsSold || 0,
            });
          }
        }
      );

      setLoading(false);

      return () => {
        unsubscribers.forEach(unsub => unsub());
        hostAnalyticsUnsub();
      };
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError("Failed to load analytics data");
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">
          Real-time performance metrics for all your events
        </p>
      </div>

      {/* Summary Cards - Replaces "Traffic Overview" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(hostAnalytics.totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Total Tickets Sold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {hostAnalytics.totalTicketsSold.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active Events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {eventAnalytics.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Event Performance Table - Replaces "Booking Trends" */}
      <Card>
        <CardHeader>
          <CardTitle>Event Performance</CardTitle>
          <CardDescription>
            Click on any event to see detailed ticket type breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventAnalytics.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No sales yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Waiting for your first booking...
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tickets Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eventAnalytics.map((event) => {
                    const isExpanded = expandedRows.has(event.eventId);
                    const hasBreakdown = event.ticketBreakdown && 
                      Object.keys(event.ticketBreakdown).length > 0;

                    return (
                      <>
                        <tr
                          key={event.eventId}
                          className={`hover:bg-gray-50 ${hasBreakdown ? 'cursor-pointer' : ''}`}
                          onClick={() => hasBreakdown && setExpandedRows(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(event.eventId)) {
                              newSet.delete(event.eventId);
                            } else {
                              newSet.add(event.eventId);
                            }
                            return newSet;
                          })}
                        >
                          <td className="px-6 py-4">
                            {hasBreakdown && (
                              <button className="text-gray-400 hover:text-gray-600">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{formatDate(event.eventDate)}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {event.totalTicketsSold.toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(event.totalRevenue)}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700">
                                  Ticket Type Breakdown
                                </h4>
                                {!hasBreakdown || Object.keys(event.ticketBreakdown || {}).length === 0 ? (
                                  <div className="text-center py-8">
                                    <p className="text-gray-500 text-sm">
                                      No breakdown available yet. Ticket type details will appear here once bookings are made.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {Object.entries(event.ticketBreakdown!).map(([typeName, stats]) => {
                                      // Validate stats object has required fields
                                      const soldCount = stats?.soldCount || 0;
                                      const revenue = stats?.revenue || 0;
                                      
                                      return (
                                        <div 
                                          key={typeName}
                                          className="bg-white border rounded-lg p-3 shadow-sm"
                                        >
                                          <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-900">{typeName}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {soldCount} sold
                                            </Badge>
                                          </div>
                                          <p className="text-xl font-bold text-green-600">
                                            {formatCurrency(revenue)}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Avg: {soldCount > 0 ? formatCurrency(revenue / soldCount) : '₹0'}
                                          </p>
                                          <div className="mt-2 w-full bg-gray-200 h-1.5 rounded-full">
                                            <div
                                              className="bg-blue-600 h-full transition-all"
                                              style={{ width: `${Math.min((soldCount / 50) * 100, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
