const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin SDK (Required for server-side writes)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * 🤖 HOST & EVENT ANALYTICS SYNC
 * Trigger: When a new booking is written to Firestore.
 * Logic:
 * 1. Checks if the booking is "confirmed" or "success".
 * 2. Atomically increments 'totalRevenue' and 'totalTicketsSold'.
 * 3. Updates BOTH 'host_analytics' (Global) and 'event_analytics' (Per Event).
 */
exports.syncAnalyticsOnBooking = functions.firestore
  .document('events/{eventId}/bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const bookingData = change.after.exists ? change.after.data() : null;
    const previousData = change.before.exists ? change.before.data() : null;
    const { eventId } = context.params;

    // 1. SECURITY CHECKS
    // If document was deleted, we might want to decrement (Optional, skipping for safety)
    if (!bookingData) return null;

    // Check if status is valid (Customize these strings based on your app)
    const validStatuses = ["confirmed", "success", "paid", "successful"];
    const isNowConfirmed = validStatuses.includes(bookingData.status?.toLowerCase());
    const wasConfirmed = previousData && validStatuses.includes(previousData.status?.toLowerCase());

    // ONLY execute if:
    // A. It's a new confirmed booking
    // B. An existing booking JUST changed status to confirmed
    if (!isNowConfirmed || wasConfirmed) {
      return null; // Skip if already counted or not valid
    }

    // FIX: Handle both 'hostId' and 'hostUid' field names
    // The app uses 'hostUid' in some places but this function originally expected 'hostId'
    const hostId = bookingData.hostId || bookingData.hostUid;
    const ticketCount = Number(bookingData.quantity || bookingData.tickets || 1);
    const revenue = Number(bookingData.amount || bookingData.totalPrice || bookingData.total || 0);

    if (!hostId) {
      console.error(`❌ [Analytics] Missing hostId/hostUid for booking ${context.params.bookingId}`);
      console.error(`❌ [Analytics] Booking data:`, bookingData);
      return null;
    }

    console.log(`⚙️ [Analytics] Processing Booking: ${context.params.bookingId} for Host: ${hostId}`);

    // 2. PREPARE ATOMIC UPDATES
    const batch = db.batch();

    // A. Reference Global Host Analytics
    const hostRef = db.collection('host_analytics').doc(hostId);
    
    // B. Reference Specific Event Analytics
    const eventStatsRef = db.collection('event_analytics').doc(eventId);

    // 3. EXECUTE UPDATES
    // We use 'merge: true' via set() to create docs if they don't exist
    batch.set(hostRef, {
      totalRevenue: admin.firestore.FieldValue.increment(revenue),
      totalTicketsSold: admin.firestore.FieldValue.increment(ticketCount),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      hostId: hostId // Ensure ID is present
    }, { merge: true });

    batch.set(eventStatsRef, {
      totalRevenue: admin.firestore.FieldValue.increment(revenue),
      totalTicketsSold: admin.firestore.FieldValue.increment(ticketCount),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      eventId: eventId,
      hostId: hostId
    }, { merge: true });

    // 4. COMMIT TO DATABASE
    try {
      await batch.commit();
      console.log(`✅ [Analytics] Successfully synced for Host ${hostId} (+₹${revenue})`);
    } catch (error) {
      console.error("❌ [Analytics] Transaction failed:", error);
    }
  });
