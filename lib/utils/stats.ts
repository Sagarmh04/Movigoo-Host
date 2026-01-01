// Stats computation utilities based on data structures
import { EventSummary } from "../types/event";
import { db } from "../firebase";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { auth } from "../firebase";

export interface HostStats {
  // Event Stats
  totalEvents: number;
  activeEvents: number;
  draftEvents: number;
  hostedEvents: number;
  upcomingEvents: number;
  
  // Booking Stats
  totalBookings: number;
  totalTicketsSold: number;
  totalRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  
  // Customer Stats
  totalCustomers: number;
  uniqueCustomers: number;
  
  // Ticket Stats
  totalTicketTypes: number;
  totalTicketCapacity: number;
  ticketsRemaining: number;
  occupancyRate: number; // percentage
  
  // Revenue Stats
  averageTicketPrice: number;
  revenueByEvent: Array<{ eventId: string; eventTitle: string; revenue: number }>;
  
  // Performance Stats
  averageBookingsPerEvent: number;
  mostPopularEvent: { eventId: string; title: string; bookings: number } | null;
  leastPopularEvent: { eventId: string; title: string; bookings: number } | null;
  
  // Time-based Stats
  bookingsThisMonth: number;
  revenueThisMonth: number;
  bookingsLastMonth: number;
  revenueLastMonth: number;
}

/**
 * Compute comprehensive stats for the host user
 */
export async function computeHostStats(): Promise<HostStats> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Use the current user's UID as host user ID
  // In this app, authenticated users are host users
  const hostUserId = user.uid;

  // Fetch all events for this host
  const eventsQuery = query(
    collection(db, "events"),
    where("hostUserId", "==", hostUserId)
  );
  const eventsSnapshot = await getDocs(eventsQuery);
  const events = eventsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Compute event stats
  const eventStats = computeEventStats(events);
  
  // Fetch bookings for all events
  const bookings = await fetchAllBookings(events.map(e => e.id));
  
  // Compute booking stats
  const bookingStats = computeBookingStats(bookings, events);
  
  // Compute customer stats
  const customerStats = computeCustomerStats(bookings);
  
  // Compute ticket stats
  const ticketStats = computeTicketStats(events, bookings);
  
  // Compute revenue stats
  const revenueStats = computeRevenueStats(bookings, events);
  
  // Compute performance stats
  const performanceStats = computePerformanceStats(events, bookings);
  
  // Compute time-based stats
  const timeStats = computeTimeBasedStats(bookings);

  return {
    ...eventStats,
    ...bookingStats,
    ...customerStats,
    ...ticketStats,
    ...revenueStats,
    ...performanceStats,
    ...timeStats,
  };
}

/**
 * Fetch all bookings for given event IDs
 */
async function fetchAllBookings(eventIds: string[]): Promise<any[]> {
  const allBookings: any[] = [];
  
  for (const eventId of eventIds) {
    try {
      const bookingsQuery = query(
        collection(db, "events", eventId, "bookings")
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const eventBookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        eventId,
        ...doc.data()
      }));
      allBookings.push(...eventBookings);
    } catch (error) {
      console.error(`Error fetching bookings for event ${eventId}:`, error);
    }
  }
  
  return allBookings;
}

/**
 * Compute event-related statistics
 */
function computeEventStats(events: any[]) {
  const now = new Date();
  
  const totalEvents = events.length;
  const activeEvents = events.filter(e => e.status === "hosted" || e.status === "published").length;
  const draftEvents = events.filter(e => e.status === "draft").length;
  const hostedEvents = events.filter(e => e.status === "hosted" || e.status === "published").length;
  
  // Count upcoming events (events with dates in the future)
  const upcomingEvents = events.filter(event => {
    const locations = event.schedule?.locations || [];
    for (const location of locations) {
      for (const venue of location.venues || []) {
        for (const dateItem of venue.dates || []) {
          const eventDate = new Date(dateItem.date);
          if (eventDate > now) {
            return true;
          }
        }
      }
    }
    return false;
  }).length;

  return {
    totalEvents,
    activeEvents,
    draftEvents,
    hostedEvents,
    upcomingEvents,
  };
}

/**
 * Compute booking-related statistics
 * IMPORTANT: Revenue and tickets sold only count CONFIRMED bookings
 */
function computeBookingStats(bookings: any[], events: any[]) {
  const totalBookings = bookings.length;
  
  let totalTicketsSold = 0; // Only confirmed bookings
  let totalRevenue = 0; // Only confirmed bookings (Gross Revenue)
  let pendingBookings = 0;
  let confirmedBookings = 0;
  
  bookings.forEach(booking => {
    const ticketCount = booking.ticketCount || booking.quantity || 1;
    const amount = booking.amount || booking.total || 0;
    const status = booking.status || "pending";
    const normalizedStatus = status.toLowerCase();
    
    if (status === "pending") {
      pendingBookings++;
    } else if (normalizedStatus === "confirmed" || normalizedStatus === "completed") {
      confirmedBookings++;
      // Only count revenue and tickets for CONFIRMED bookings
      totalTicketsSold += ticketCount;
      totalRevenue += amount;
    }
  });

  return {
    totalBookings,
    totalTicketsSold,
    totalRevenue,
    pendingBookings,
    confirmedBookings,
  };
}

/**
 * Compute customer-related statistics
 */
function computeCustomerStats(bookings: any[]) {
  const customerIds = new Set<string>();
  
  bookings.forEach(booking => {
    if (booking.userId || booking.customerId) {
      customerIds.add(booking.userId || booking.customerId);
    }
  });

  return {
    totalCustomers: bookings.length,
    uniqueCustomers: customerIds.size,
  };
}

/**
 * Compute ticket-related statistics
 * IMPORTANT: Tickets sold only counts CONFIRMED bookings
 */
function computeTicketStats(events: any[], bookings: any[]) {
  let totalTicketTypes = 0;
  let totalTicketCapacity = 0;
  let ticketsSold = 0; // Only confirmed bookings
  
  events.forEach(event => {
    const venueConfigs = event.tickets?.venueConfigs || [];
    venueConfigs.forEach((config: any) => {
      const ticketTypes = config.ticketTypes || [];
      totalTicketTypes += ticketTypes.length;
      
      ticketTypes.forEach((ticket: any) => {
        totalTicketCapacity += ticket.totalQuantity || 0;
      });
    });
  });
  
  bookings.forEach(booking => {
    const status = booking.status || "pending";
    const normalizedStatus = status.toLowerCase();
    
    // Only count CONFIRMED bookings for tickets sold
    if (normalizedStatus === "confirmed" || normalizedStatus === "completed") {
      ticketsSold += booking.ticketCount || booking.quantity || 1;
    }
  });
  
  const ticketsRemaining = Math.max(0, totalTicketCapacity - ticketsSold);
  const occupancyRate = totalTicketCapacity > 0 
    ? (ticketsSold / totalTicketCapacity) * 100 
    : 0;

  return {
    totalTicketTypes,
    totalTicketCapacity,
    ticketsRemaining,
    occupancyRate: Math.round(occupancyRate * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Compute revenue-related statistics
 * IMPORTANT: Only counts CONFIRMED bookings for Gross Revenue
 */
function computeRevenueStats(bookings: any[], events: any[]) {
  let totalRevenue = 0; // Gross Revenue (confirmed bookings only)
  let totalTickets = 0; // Tickets from confirmed bookings only
  const revenueByEvent: Array<{ eventId: string; eventTitle: string; revenue: number }> = [];
  const eventRevenueMap = new Map<string, number>();
  
  bookings.forEach(booking => {
    const status = booking.status || "pending";
    const normalizedStatus = status.toLowerCase();
    
    // Only count CONFIRMED bookings for revenue
    if (normalizedStatus === "confirmed" || normalizedStatus === "completed") {
      const amount = booking.amount || booking.total || 0;
      const ticketCount = booking.ticketCount || booking.quantity || 1;
      const eventId = booking.eventId;
      
      totalRevenue += amount;
      totalTickets += ticketCount;
      
      if (eventId) {
        const current = eventRevenueMap.get(eventId) || 0;
        eventRevenueMap.set(eventId, current + amount);
      }
    }
  });
  
  // Build revenue by event array
  events.forEach(event => {
    const revenue = eventRevenueMap.get(event.id) || 0;
    if (revenue > 0) {
      revenueByEvent.push({
        eventId: event.id,
        eventTitle: event.basicDetails?.title || event.title || "Untitled Event",
        revenue,
      });
    }
  });
  
  // Sort by revenue descending
  revenueByEvent.sort((a, b) => b.revenue - a.revenue);
  
  const averageTicketPrice = totalTickets > 0 
    ? totalRevenue / totalTickets 
    : 0;

  return {
    averageTicketPrice: Math.round(averageTicketPrice * 100) / 100,
    revenueByEvent,
  };
}

/**
 * Compute performance-related statistics
 */
function computePerformanceStats(events: any[], bookings: any[]) {
  const bookingsByEvent = new Map<string, number>();
  
  bookings.forEach(booking => {
    const eventId = booking.eventId;
    if (eventId) {
      const current = bookingsByEvent.get(eventId) || 0;
      bookingsByEvent.set(eventId, current + 1);
    }
  });
  
  let maxBookings = 0;
  let minBookings = Infinity;
  let mostPopularEvent: { eventId: string; title: string; bookings: number } | null = null;
  let leastPopularEvent: { eventId: string; title: string; bookings: number } | null = null;
  
  events.forEach(event => {
    const eventBookings = bookingsByEvent.get(event.id) || 0;
    const eventTitle = event.basicDetails?.title || event.title || "Untitled Event";
    
    if (eventBookings > maxBookings) {
      maxBookings = eventBookings;
      mostPopularEvent = {
        eventId: event.id,
        title: eventTitle,
        bookings: eventBookings,
      };
    }
    
    if (eventBookings < minBookings && eventBookings > 0) {
      minBookings = eventBookings;
      leastPopularEvent = {
        eventId: event.id,
        title: eventTitle,
        bookings: eventBookings,
      };
    }
  });
  
  const totalBookings = bookings.length;
  const totalEvents = events.length;
  const averageBookingsPerEvent = totalEvents > 0 
    ? totalBookings / totalEvents 
    : 0;

  return {
    averageBookingsPerEvent: Math.round(averageBookingsPerEvent * 100) / 100,
    mostPopularEvent,
    leastPopularEvent,
  };
}

/**
 * Compute time-based statistics
 * IMPORTANT: Only counts CONFIRMED bookings for revenue
 */
function computeTimeBasedStats(bookings: any[]) {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  let bookingsThisMonth = 0; // Only confirmed
  let revenueThisMonth = 0; // Gross Revenue (confirmed only)
  let bookingsLastMonth = 0; // Only confirmed
  let revenueLastMonth = 0; // Gross Revenue (confirmed only)
  
  bookings.forEach(booking => {
    const status = booking.status || "pending";
    const normalizedStatus = status.toLowerCase();
    
    // Only count CONFIRMED bookings
    if (normalizedStatus !== "confirmed" && normalizedStatus !== "completed") {
      return;
    }
    
    const bookingDate = booking.createdAt?.toDate 
      ? booking.createdAt.toDate() 
      : booking.createdAt 
        ? new Date(booking.createdAt) 
        : null;
    
    if (!bookingDate) return;
    
    const amount = booking.amount || booking.total || 0;
    
    if (bookingDate >= startOfThisMonth) {
      bookingsThisMonth++;
      revenueThisMonth += amount;
    } else if (bookingDate >= startOfLastMonth && bookingDate <= endOfLastMonth) {
      bookingsLastMonth++;
      revenueLastMonth += amount;
    }
  });

  return {
    bookingsThisMonth,
    revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
    bookingsLastMonth,
    revenueLastMonth: Math.round(revenueLastMonth * 100) / 100,
  };
}

/**
 * Return empty stats structure
 */
function getEmptyStats(): HostStats {
  return {
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
    averageBookingsPerEvent: 0,
    mostPopularEvent: null,
    leastPopularEvent: null,
    bookingsThisMonth: 0,
    revenueThisMonth: 0,
    bookingsLastMonth: 0,
    revenueLastMonth: 0,
  };
}

