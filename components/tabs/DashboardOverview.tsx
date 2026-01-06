"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarCheck, IndianRupee, Loader2, DollarSign } from "lucide-react";
import { computeHostStats, type HostStats } from "@/lib/utils/stats";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
          
          // DEBUG: Log ALL fields from the document
          console.log("📄 [Analytics] Raw document data:", data);
          console.log("📄 [Analytics] All field names:", Object.keys(data));
          
          // DEBUG: Log specific field values
          console.log("📊 [Analytics] Field mapping:", {
            "data.totalTicketsSold": data.totalTicketsSold,
            "data.totalRevenue": data.totalRevenue,
            "data.updatedAt": data.updatedAt,
            "typeof totalTicketsSold": typeof data.totalTicketsSold,
            "typeof totalRevenue": typeof data.totalRevenue,
          });
          
          setAnalyticsTicketsSold(data.totalTicketsSold ?? 0);
          setAnalyticsRevenue(data.totalRevenue ?? 0);
          
          console.log("✅ [Analytics] State updated:", {
            ticketsSold: data.totalTicketsSold ?? 0,
            revenue: data.totalRevenue ?? 0,
          });
        } else {
          console.warn("⚠️ [Analytics] Document does not exist:", `host_analytics/${user.uid}`);
          console.warn("⚠️ [Analytics] Check if document exists in Firestore Console");
          setAnalyticsTicketsSold(0);
          setAnalyticsRevenue(0);
        }
      },
      (err) => {
        console.error("❌ [Analytics] Error listening to host_analytics:", err);
        console.error("❌ [Analytics] Error code:", err.code);
        console.error("❌ [Analytics] Error message:", err.message);
        
        if (err.code === "permission-denied") {
          console.error("🚫 [Analytics] PERMISSION DENIED - Check Firestore rules for host_analytics");
          console.error("🚫 [Analytics] Required rule:");
          console.error(`
            match /host_analytics/{userId} {
              allow read: if request.auth != null && request.auth.uid == userId;
            }
          `);
        }
      }
    );

    return () => {
      unsubHost();
      unsubOrganizer();
      bookingUnsubsRef.current.forEach((unsub) => unsub());
      bookingUnsubsRef.current.clear();
      bookingAggRef.current.clear();
      unsubPayouts();
      unsubAnalytics();
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
          <span className="text-xs text-gray-400">UID: {user?.uid || "Not logged in"}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Tickets Sold (Analytics)</p>
            <h3 className="text-3xl font-bold text-blue-600">{analyticsTicketsSold}</h3>
            <p className="text-xs text-gray-500 mt-1">From host_analytics collection</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Revenue (Analytics)</p>
            <h3 className="text-3xl font-bold text-green-600">{formatCurrency(analyticsRevenue)}</h3>
            <p className="text-xs text-gray-500 mt-1">From host_analytics collection</p>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Total Events</p>
          <h3 className="text-2xl font-bold mt-2">{displayStats.totalEvents}</h3>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-blue-600">{displayStats.hostedEvents} hosted</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{displayStats.draftEvents} drafts</span>
          </div>
        </div>
      </div>

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
