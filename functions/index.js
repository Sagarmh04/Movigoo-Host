const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin SDK (Required for server-side writes)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * 🤖 HOST & EVENT ANALYTICS SYNC
 * Trigger: When a booking is created or updated in the ROOT 'bookings' collection.
 * Path: bookings/{bookingId}
 * 
 * Logic:
 * 1. Extracts eventId and hostUid from the booking document data.
 * 2. Checks if the booking status is "confirmed" or "success".
 * 3. Atomically increments 'totalRevenue' and 'totalTicketsSold'.
 * 4. Updates BOTH 'host_analytics/{hostUid}' and 'event_analytics/{eventId}'.
 */
exports.syncAnalyticsOnBooking = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const bookingData = change.after.exists ? change.after.data() : null;
    const previousData = change.before.exists ? change.before.data() : null;
    const { bookingId } = context.params;

    // 1. SECURITY CHECKS
    // If document was deleted, skip (we don't decrement for safety)
    if (!bookingData) {
      console.log(`⏭️ [Analytics] Booking ${bookingId} deleted, skipping analytics update`);
      return null;
    }

    // Check if status is valid
    const validStatuses = ["confirmed", "success", "paid", "successful"];
    const isNowConfirmed = validStatuses.includes(bookingData.status?.toLowerCase());
    const wasConfirmed = previousData && validStatuses.includes(previousData.status?.toLowerCase());

    // ONLY execute if:
    // A. It's a new confirmed booking
    // B. An existing booking JUST changed status to confirmed
    if (!isNowConfirmed || wasConfirmed) {
      console.log(`⏭️ [Analytics] Booking ${bookingId} status not confirmed or already counted, skipping`);
      return null;
    }

    // 2. EXTRACT DATA FROM BOOKING DOCUMENT
    // Extract hostId (using hostUid with hostId as fallback)
    const hostId = bookingData.hostUid || bookingData.hostId;
    
    // Extract eventId from document data (not from URL params)
    const eventId = bookingData.eventId;
    
    // Extract revenue and ticket count
    const ticketCount = Number(bookingData.quantity || bookingData.tickets || 1);
    const revenue = Number(bookingData.amount || bookingData.totalPrice || bookingData.total || 0);

    // 3. VALIDATION
    if (!hostId) {
      console.error(`❌ [Analytics] Missing hostUid/hostId for booking ${bookingId}`);
      console.error(`❌ [Analytics] Booking data:`, JSON.stringify(bookingData, null, 2));
      return null;
    }

    if (!eventId) {
      console.error(`❌ [Analytics] Missing eventId for booking ${bookingId}`);
      console.error(`❌ [Analytics] Booking data:`, JSON.stringify(bookingData, null, 2));
      return null;
    }

    console.log(`⚙️ [Analytics] Processing Booking ${bookingId}:`, {
      hostId,
      eventId,
      revenue,
      ticketCount,
      status: bookingData.status
    });

    // 4. PREPARE ATOMIC UPDATES
    const batch = db.batch();

    // A. Reference Global Host Analytics
    const hostRef = db.collection('host_analytics').doc(hostId);
    
    // B. Reference Specific Event Analytics
    const eventStatsRef = db.collection('event_analytics').doc(eventId);

    // 5. EXECUTE UPDATES
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

    // 6. COMMIT TO DATABASE
    try {
      await batch.commit();
      console.log(`✅ [Analytics] Successfully synced for Host ${hostId}, Event ${eventId} (+₹${revenue}, +${ticketCount} tickets)`);
    } catch (error) {
      console.error(`❌ [Analytics] Transaction failed for booking ${bookingId}:`, error);
    }

    return null;
  });
