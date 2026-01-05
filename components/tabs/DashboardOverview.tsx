"use client";

import { useState, useEffect } from "react";
import { CalendarCheck, IndianRupee, Users, Ticket, TrendingUp, BarChart3, Loader2, DollarSign } from "lucide-react";
import { computeHostStats, type HostStats } from "@/lib/utils/stats";
import { getCurrentHostAnalytics } from "@/lib/utils/analytics";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardOverview() {
  const [stats, setStats] = useState<HostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paidTotal, setPaidTotal] = useState(0);

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

    const payoutsRef = collection(db, "payouts");
    const q = query(payoutsRef, where("organizerId", "==", user.uid));

    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
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

      const hostId = user.uid;
      const analyticsDocPath = `host_analytics/${hostId}`;
      
      // DEBUG: Log auth and path info
      console.log("🔍 [Analytics Debug] Reading analytics:", {
        hostId,
        analyticsDocPath,
        userEmail: user.email,
      });
      
      // Load analytics from host_analytics collection (analytics collections ONLY)
      let analyticsData = null;
      try {
        analyticsData = await getCurrentHostAnalytics();
        
        // DEBUG: Log fetched analytics values
        console.log("✅ [Analytics Debug] Fetched analytics data:", {
          totalTicketsSold: analyticsData?.totalTicketsSold,
          totalRevenue: analyticsData?.totalRevenue,
          updatedAt: analyticsData?.updatedAt,
          docExists: analyticsData !== null,
        });
      } catch (analyticsError) {
        console.error("❌ [Analytics Debug] Error loading analytics:", analyticsError);
        // Continue with computed stats even if analytics fails
      }
      
      // Load computed stats for other metrics (events, bookings, etc.)
      const computedStats = await computeHostStats();
      
      // Override totalTicketsSold and totalRevenue with analytics data (if available)
      // If analytics doc doesn't exist, show 0 instead of computed value
      const finalStats: HostStats = {
        ...computedStats,
        totalTicketsSold: analyticsData?.totalTicketsSold ?? computedStats.totalTicketsSold,
        totalRevenue: analyticsData?.totalRevenue ?? computedStats.totalRevenue,
      };
      
      // DEBUG: Log final state values
      console.log("📊 [Analytics Debug] Final stats state:", {
        totalTicketsSold: finalStats.totalTicketsSold,
        totalRevenue: finalStats.totalRevenue,
        source: analyticsData ? "analytics" : "computed",
      });
      
      // Force state update
      setStats(finalStats);
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

  const revenueChange = displayStats.revenueLastMonth > 0
    ? ((displayStats.revenueThisMonth - displayStats.revenueLastMonth) / displayStats.revenueLastMonth) * 100
    : 0;

  const bookingsChange = displayStats.bookingsLastMonth > 0
    ? ((displayStats.bookingsThisMonth - displayStats.bookingsLastMonth) / displayStats.bookingsLastMonth) * 100
    : 0;

  const netEarnings = displayStats.totalRevenue * 0.95;
  const pendingManualPayout = Math.max(0, netEarnings - paidTotal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome to your Movigoo Host Panel. Overview of your platform activity.
        </p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Bookings</p>
              <h2 className="text-3xl font-bold mt-2">{displayStats.confirmedBookings}</h2>
              <p className="text-xs text-gray-400 mt-1">
                Confirmed bookings only
              </p>
            </div>
            <CalendarCheck className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Gross Revenue (Before Payout)</p>
              <h2 className="text-3xl font-bold mt-2">{formatCurrency(displayStats.totalRevenue)}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {formatCurrency(displayStats.revenueThisMonth)} this month
              </p>
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
                ( <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.hash = "payments";
                    }
                  }}
                  className="text-primary hover:underline"
                >
                  Click here
                </button> to view payout history )
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {pendingManualPayout > 0 ? (
                  <span className="text-orange-600 font-medium">Pending Manual Payout: {formatCurrency(pendingManualPayout)}</span>
                ) : (
                  <span className="text-green-600 font-medium">✓ Paid</span>
                )}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Upcoming Events</p>
              <h2 className="text-3xl font-bold mt-2">{displayStats.upcomingEvents}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {displayStats.activeEvents} active
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tickets Sold</p>
              <h2 className="text-3xl font-bold mt-2">{displayStats.totalTicketsSold}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {displayStats.occupancyRate.toFixed(1)}% occupancy
              </p>
            </div>
            <Ticket className="h-8 w-8 text-orange-500" />
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

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Unique Customers</p>
          <h3 className="text-2xl font-bold mt-2">{displayStats.uniqueCustomers}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {displayStats.totalCustomers} total bookings
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Average Ticket Price</p>
          <h3 className="text-2xl font-bold mt-2">{formatCurrency(displayStats.averageTicketPrice)}</h3>
          <p className="text-xs text-gray-400 mt-1">
            Across all events
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Ticket Capacity</p>
          <h3 className="text-2xl font-bold mt-2">{displayStats.totalTicketCapacity}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {displayStats.ticketsRemaining} remaining
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Avg Bookings/Event</p>
          <h3 className="text-2xl font-bold mt-2">{displayStats.averageBookingsPerEvent.toFixed(1)}</h3>
          <p className="text-xs text-gray-400 mt-1">
            Average performance
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Monthly Growth</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className={`h-5 w-5 ${revenueChange >= 0 ? "text-green-500" : "text-red-500"}`} />
            <h3 className={`text-2xl font-bold ${revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}%
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Gross revenue vs last month
          </p>
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
