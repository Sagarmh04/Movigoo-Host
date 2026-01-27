"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarCheck, IndianRupee, Loader2, DollarSign, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { computeHostStats, type HostStats } from "@/lib/utils/stats";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";

export default function DashboardOverview() {
  const [stats, setStats] = useState<HostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paidTotal, setPaidTotal] = useState(0);
  const [realTimeTotalBookings, setRealTimeTotalBookings] = useState(0);
  const [realTimeGrossRevenue, setRealTimeGrossRevenue] = useState(0);
  const [analyticsTicketsSold, setAnalyticsTicketsSold] = useState<number>(0);
  const [analyticsRevenue, setAnalyticsRevenue] = useState<number>(0);
  const [eventAnalytics, setEventAnalytics] = useState<Array<{
    eventId: string;
    eventName: string;
    eventDate: string;
    totalTicketsSold: number;
    totalRevenue: number;
    ticketBreakdown?: Record<string, { soldCount: number; revenue: number }>;
  }>>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const bookingAggRef = useRef(new Map<string, { totalBookings: number; grossRevenue: number }>());
  const bookingUnsubsRef = useRef(new Map<string, () => void>());

  // Wait for auth state to be ready
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

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

    const normalizeStatus = (status: unknown) => {
      if (typeof status === "string") {
        return status.toLowerCase().trim();
      }
      return String(status ?? "").toLowerCase().trim();
    };

    const isConfirmedStatus = (normalizedStatus: string) => {
      return (
        normalizedStatus === "confirmed" ||
        normalizedStatus === "completed" ||
        normalizedStatus === "success" ||
        normalizedStatus === "successful" ||
        normalizedStatus === "succeeded" ||
        normalizedStatus === "paid"
      );
    };

    const parseAmount = (value: unknown) => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
      }
      if (typeof value === "string") {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const recomputeRealTimeTotals = () => {
      let totalBookings = 0;
      let grossRevenue = 0;

      bookingAggRef.current.forEach((v) => {
        totalBookings += v.totalBookings;
        grossRevenue += v.grossRevenue;
      });

      setRealTimeTotalBookings(totalBookings);
      setRealTimeGrossRevenue(grossRevenue);
    };

    const syncBookingListeners = (eventIds: string[]) => {
      const nextSet = new Set(eventIds);

      Array.from(bookingUnsubsRef.current.entries()).forEach(([eventId, unsub]) => {
        if (!nextSet.has(eventId)) {
          unsub();
          bookingUnsubsRef.current.delete(eventId);
          bookingAggRef.current.delete(eventId);
        }
      });

      Array.from(nextSet.values()).forEach((eventId) => {
        if (bookingUnsubsRef.current.has(eventId)) {
          return;
        }

        const bookingsRef = collection(db, "events", eventId, "bookings");
        const unsub = onSnapshot(
          bookingsRef,
          (snapshot) => {
            let totalBookings = 0;
            let grossRevenue = 0;

            snapshot.forEach((d) => {
              const data = d.data() as any;
              const normalizedStatus = normalizeStatus(data?.status);
              if (!normalizedStatus) {
                return;
              }
              if (!isConfirmedStatus(normalizedStatus)) {
                return;
              }

              const amount = parseAmount(data?.amount ?? data?.total);
              grossRevenue += amount;
              totalBookings += 1;
            });

            bookingAggRef.current.set(eventId, {
              totalBookings,
              grossRevenue,
            });
            recomputeRealTimeTotals();
          },
          (err) => {
            console.error(`Error listening to bookings for event ${eventId}:`, err);
          }
        );

        bookingUnsubsRef.current.set(eventId, unsub);
      });

      recomputeRealTimeTotals();
    };

    let hostEventIds = new Set<string>();
    let organizerEventIds = new Set<string>();

    const recomputeEventIds = () => {
      const merged = new Set<string>([
        ...Array.from(hostEventIds.values()),
        ...Array.from(organizerEventIds.values()),
      ]);
      syncBookingListeners(Array.from(merged));
    };

    const eventsRef = collection(db, "events");
    const qHost = query(eventsRef, where("hostUserId", "==", user.uid));
    const qOrganizer = query(eventsRef, where("organizerId", "==", user.uid));

    const unsubHost = onSnapshot(
      qHost,
      (snapshot) => {
        hostEventIds = new Set(snapshot.docs.map((d) => d.id));
        recomputeEventIds();
      },
      (err) => {
        console.error("Error listening to host events:", err);
      }
    );

    const unsubOrganizer = onSnapshot(
      qOrganizer,
      (snapshot) => {
        organizerEventIds = new Set(snapshot.docs.map((d) => d.id));
        recomputeEventIds();
      },
      (err) => {
        console.error("Error listening to organizer events:", err);
      }
    );

    const payoutsRef = collection(db, "payouts");
    const q = query(payoutsRef, where("organizerId", "==", user.uid));

    const unsubPayouts = onSnapshot(
      q,
      (snapshot) => {
        let sum = 0;
        snapshot.forEach((d) => {
          const data = d.data() as any;
          const amount = data?.amount;
          if (typeof amount === "number") {
            sum += amount;
          } else if (typeof amount === "string") {
            const n = Number(amount);
            if (Number.isFinite(n)) {
              sum += n;
            }
          }
        });
        setPaidTotal(sum);
      },
      (err) => {
        console.error("Error listening to payouts:", err);
      }
    );

    // Listen to host_analytics document for real-time updates
    const analyticsDocRef = doc(db, "host_analytics", user.uid);
    console.log("🔍 [Analytics] Setting up listener for:", `host_analytics/${user.uid}`);
    
    const unsubAnalytics = onSnapshot(
      analyticsDocRef,
      (docSnapshot) => {
        console.log("📡 [Analytics] Snapshot received. Exists:", docSnapshot.exists());
        
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          
          console.log("📄 [Analytics] Raw document data:", data);
          console.log("📊 [Analytics] Field mapping:", {
            "data.totalTicketsSold": data.totalTicketsSold,
            "data.totalRevenue": data.totalRevenue,
          });
          
          setAnalyticsTicketsSold(data.totalTicketsSold ?? 0);
          setAnalyticsRevenue(data.totalRevenue ?? 0);
          
          console.log("✅ [Analytics] State updated:", {
            ticketsSold: data.totalTicketsSold ?? 0,
            revenue: data.totalRevenue ?? 0,
          });
        } else {
          console.warn("⚠️ [Analytics] Document does not exist:", `host_analytics/${user.uid}`);
          setAnalyticsTicketsSold(0);
          setAnalyticsRevenue(0);
        }
      },
      (err) => {
        console.error("❌ [Analytics] Error listening to host_analytics:", err);
        
        if (err.code === "permission-denied") {
          console.error("🚫 [Analytics] PERMISSION DENIED - Check Firestore rules for host_analytics");
        }
      }
    );

    // Listen to event_analytics for all host's events
    const setupEventAnalyticsListeners = async () => {
      try {
        const eventsQuery = query(
          collection(db, "events"),
          where("hostUid", "==", user.uid)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventIds = eventsSnapshot.docs.map(doc => doc.id);

        console.log("📊 [Event Analytics] Setting up listeners for events:", eventIds);

        const eventUnsubscribers = eventIds.map(eventId => {
          const eventAnalyticsRef = doc(db, "event_analytics", eventId);
          return onSnapshot(
            eventAnalyticsRef,
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
                      console.log(`🔧 [Dashboard] Aggressively fixing bad data for ${docSnapshot.id}`);
                      await updateDoc(eventAnalyticsRef, {
                        eventName,
                        eventDate,
                      });
                    }
                  } catch (error) {
                    console.error(`Error fetching event details for ${docSnapshot.id}:`, error);
                  }
                }

                const analyticsData = {
                  eventId: docSnapshot.id,
                  eventName: eventName || "Unnamed Event",
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
            },
            (error) => {
              console.error(`Error listening to analytics for ${eventId}:`, error);
            }
          );
        });

        return eventUnsubscribers;
      } catch (error) {
        console.error("Error setting up event analytics listeners:", error);
        return [];
      }
    };

    let eventUnsubscribers: (() => void)[] = [];
    setupEventAnalyticsListeners().then(unsubs => {
      eventUnsubscribers = unsubs;
    });

    return () => {
      unsubHost();
      unsubOrganizer();
      bookingUnsubsRef.current.forEach((unsub) => unsub());
      bookingUnsubsRef.current.clear();
      bookingAggRef.current.clear();
      unsubPayouts();
      unsubAnalytics();
      eventUnsubscribers.forEach(unsub => unsub());
    };
  }, [user?.uid]);

  // Load stats only after auth is ready
  useEffect(() => {
    // Don't call API while auth is still loading
    if (authLoading) {
      return;
    }

    // If auth is done loading and no user, show error
    if (!user) {
      setError("Please login to view your dashboard");
      setLoading(false);
      return;
    }

    // Guard against undefined UID
    if (!user?.uid) {
      console.error("User object exists but UID is undefined");
      setError("User authentication error: Missing UID");
      setLoading(false);
      return;
    }

    // Auth is ready and user exists with valid UID - load stats
    loadStats();
  }, [authLoading, user, user?.uid]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure user and UID exist before proceeding
      if (!user || !user?.uid) {
        console.error("loadStats called but user or UID is missing");
        setError("User authentication error: Missing UID");
        setLoading(false);
        return;
      }

      console.log("📊 [Dashboard] Loading computed stats for user:", user.uid);
      
      // Load computed stats for other metrics (events, bookings, etc.)
      // Analytics data (totalTicketsSold, totalRevenue) comes from real-time listener
      const computedStats = await computeHostStats();
      
      // Set stats (analytics values are updated separately via onSnapshot)
      setStats(computedStats);
      
      console.log("✅ [Dashboard] Stats loaded successfully");
    } catch (err: any) {
      console.error("Error loading stats:", err);
      // Only show error if it's not an auth error (auth errors are handled above)
      if (err.message !== "User not authenticated") {
        setError(err.message || "Failed to load statistics");
      } else {
        setError("Please login to view your dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show loader while auth is loading OR data is loading
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome to your Movigoo Host Panel. Overview of your platform activity.
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Only show error if auth is done loading AND there's an error
  // Don't show error while auth is still loading (prevents false "User not authenticated" on first load)
  if (error && !authLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome to your Movigoo Host Panel. Overview of your platform activity.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          {user && (
            <button
              onClick={loadStats}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const displayStats = stats || {
    totalEvents: 0,
    activeEvents: 0,
    draftEvents: 0,
    hostedEvents: 0,
    upcomingEvents: 0,
    totalBookings: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalCustomers: 0,
    uniqueCustomers: 0,
    totalTicketTypes: 0,
    totalTicketCapacity: 0,
    ticketsRemaining: 0,
    occupancyRate: 0,
    averageTicketPrice: 0,
    revenueByEvent: [],
    totalPaidAmount: 0,
    averageBookingsPerEvent: 0,
    mostPopularEvent: null,
    leastPopularEvent: null,
    bookingsThisMonth: 0,
    revenueThisMonth: 0,
    bookingsLastMonth: 0,
    revenueLastMonth: 0,
  };

  const netShare = realTimeGrossRevenue * 0.95;
  const pendingPayout = Math.max(0, netShare - paidTotal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome to your Movigoo Host Panel. Overview of your platform activity.
        </p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Bookings</p>
              <h2 className="text-3xl font-bold mt-2">{realTimeTotalBookings}</h2>
            </div>
            <CalendarCheck className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Gross Revenue</p>
              <h2 className="text-3xl font-bold mt-2">{formatCurrency(realTimeGrossRevenue)}</h2>
              <p className="text-xs text-gray-500 mt-2 italic">
                Payouts are processed manually by Movigoo after event completion.
              </p>
            </div>
            <IndianRupee className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Amount Paid</p>
              <h2 className={`text-3xl font-bold mt-2 ${
                paidTotal > 0 ? "text-green-600" : "text-gray-400"
              }`}>
                {formatCurrency(paidTotal || 0)}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.hash = "payments";
                    }
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Click here to view payout history
                </button>
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Payout</p>
              <h2 className={`text-3xl font-bold mt-2 ${
                pendingPayout > 0 ? "text-orange-600" : "text-green-600"
              }`}>
                {formatCurrency(pendingPayout)}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Net share: {formatCurrency(netShare)}
              </p>
            </div>
            <IndianRupee className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Analytics Stats from host_analytics collection */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Analytics Summary</h2>
          {/* HIDDEN: UID and Collection Source 
          <span className="text-xs text-gray-400">UID: {user?.uid || "Not logged in"}</span>
          */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="analytics-card">
            <h3 className="text-gray-600 text-sm mb-1">Total Tickets Sold (Analytics)</h3>
            {/* Only showing the number */}
            <p className="analytics-value text-3xl font-bold text-blue-600">
              {analyticsTicketsSold || 0}
            </p>
          </div>
          <div className="analytics-card">
            <h3 className="text-gray-600 text-sm mb-1">Total Revenue (Analytics)</h3>
            {/* Only showing the price */}
            <p className="analytics-value text-3xl font-bold text-green-600">
              ₹{analyticsRevenue || 0}
            </p>
          </div>
        </div>
      </div>


      {/* Event Performance Table with Ticket Breakdown */}
      {eventAnalytics.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Event Performance</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets Sold</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventAnalytics.map((event) => {
                  const isExpanded = expandedRows.has(event.eventId);
                  const hasBreakdown = event.ticketBreakdown && Object.keys(event.ticketBreakdown).length > 0;

                  return (
                    <>
                      <tr
                        key={event.eventId}
                        className={`hover:bg-gray-50 transition-colors ${hasBreakdown ? 'cursor-pointer' : ''}`}
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
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {event.totalTicketsSold.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-green-600">
                            {formatCurrency(event.totalRevenue)}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && hasBreakdown && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700">Ticket Type Breakdown</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.entries(event.ticketBreakdown!).map(([typeName, stats]) => (
                                  <div key={typeName} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="font-medium text-gray-900 text-sm">{typeName}</span>
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
                                    <div className="mt-2 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-blue-600 h-full transition-all"
                                        style={{ width: `${Math.min((stats.soldCount / 50) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
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
        </div>
      )}

      {/* Performance Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Most Popular Event</h2>
          {displayStats.mostPopularEvent ? (
            <div>
              <p className="text-lg font-medium">{displayStats.mostPopularEvent.title}</p>
              <p className="text-gray-500 text-sm mt-1">
                {displayStats.mostPopularEvent.bookings} bookings
              </p>
            </div>
          ) : (
            <p className="text-gray-500">No events with bookings yet</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Gross Revenue Events</h2>
          {displayStats.revenueByEvent.length > 0 ? (
            <div className="space-y-2">
              {displayStats.revenueByEvent.slice(0, 3).map((event) => (
                <div key={event.eventId} className="flex justify-between items-center">
                  <p className="text-sm font-medium truncate">{event.eventTitle}</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(event.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No revenue data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
