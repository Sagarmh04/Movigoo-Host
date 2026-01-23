"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  updatedAt?: any;
}

export default function AnalyticsPage() {
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

      // Step 1: Get all events for this host
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

      // Step 2: Set up real-time listener for event_analytics
      const unsubscribers = eventIds.map(eventId => {
        const analyticsDocRef = doc(db, "event_analytics", eventId);
        return onSnapshot(
          analyticsDocRef,
          async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              let eventName = data.eventName || "";
              let eventDate = normalizeEventDate(data.eventDate);

              if (!eventName || eventName === "Unnamed Event" || !eventDate) {
                try {
                  const eventDocRef = doc(db, "events", docSnapshot.id);
                  const eventDoc = await getDoc(eventDocRef);
                  if (eventDoc.exists()) {
                    const eventData = eventDoc.data();
                    eventName = eventName || eventData.title || eventData.name || "Unnamed Event";
                    eventDate = eventDate || normalizeEventDate(eventData.date) || normalizeEventDate(eventData.startDate);

                    if (eventName !== "Unnamed Event" || eventDate) {
                      await updateDoc(analyticsDocRef, {
                        eventName,
                        eventDate,
                      });
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching event details for ${docSnapshot.id}:`, error);
                }
              }

              const analyticsData: EventAnalyticsData = {
                eventId: docSnapshot.id,
                eventName: eventName || "Unnamed Event",
                eventDate,
                totalTicketsSold: data.totalTicketsSold || 0,
                totalRevenue: data.totalRevenue || 0,
                ticketBreakdown: data.ticketBreakdown || {},
                updatedAt: data.updatedAt,
              };

              setEventAnalytics(prev => {
                const filtered = prev.filter(e => e.eventId !== docSnapshot.id);
                return [...filtered, analyticsData].sort((a, b) => 
                  b.totalRevenue - a.totalRevenue
                );
              });
            }
          },
          (error) => {
            console.error(`Error listening to analytics for ${eventId}:`, error);
          }
        );
      });

      // Step 3: Listen to host_analytics for totals
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

      // Cleanup function
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

  const toggleRow = (eventId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
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
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Real-time performance metrics for all your events
        </p>
      </div>

      {/* Top Summary Bar */}
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

      {/* Event Performance Table */}
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
              <p className="text-gray-500 text-lg">No event data found yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Analytics will appear here once you have ticket sales
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead className="text-right">Tickets Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventAnalytics.map((event) => {
                    const isExpanded = expandedRows.has(event.eventId);
                    const hasBreakdown = event.ticketBreakdown && 
                      Object.keys(event.ticketBreakdown).length > 0;

                    return (
                      <>
                        {/* Main Row */}
                        <TableRow 
                          key={event.eventId}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => hasBreakdown && toggleRow(event.eventId)}
                        >
                          <TableCell>
                            {hasBreakdown && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {event.eventName}
                          </TableCell>
                          <TableCell>{formatDate(event.eventDate)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {event.totalTicketsSold.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(event.totalRevenue)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Ticket Breakdown Row */}
                        {isExpanded && hasBreakdown && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  Ticket Type Breakdown
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {Object.entries(event.ticketBreakdown!).map(([typeName, stats]) => (
                                    <div 
                                      key={typeName}
                                      className="bg-white border rounded-lg p-3 shadow-sm"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium text-gray-900">
                                          {typeName}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {stats.soldCount} sold
                                        </Badge>
                                      </div>
                                      <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(stats.revenue)}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Avg: {formatCurrency(stats.revenue / stats.soldCount)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
