const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 🧠 THE BRAIN: Logic to update analytics
async function updateAnalytics(bookingData, previousData, context, source) {
  if (!bookingData) return null; // Document deleted

  // 1. CHECK STATUS (Safety Check)
  const validStatuses = ["confirmed", "success", "paid", "successful"];
  const isNowConfirmed = validStatuses.includes(bookingData.status?.toLowerCase());
  const wasConfirmed = previousData && validStatuses.includes(previousData.status?.toLowerCase());

  // Only count if it's a NEW confirmed booking
  if (!isNowConfirmed || wasConfirmed) {
    return null;
  }

  // 2. GET IDS (The "Smart" Check)
  // Handles hostUid (your app) OR hostId (standard)
  const hostId = bookingData.hostUid || bookingData.hostId || bookingData.host_id;
  // Handles eventId from Data OR from URL
  const eventId = bookingData.eventId || bookingData.event_id || context.params.eventId;

  if (!hostId) {
    console.error(`❌ [${source}] No Host ID found in booking ${context.params.bookingId}`);
    return null;
  }

  console.log(`⚙️ [${source}] Processing Booking. Host: ${hostId}, Event: ${eventId || 'N/A'}`);

  const revenue = Number(bookingData.amount || bookingData.totalPrice || 0);
  const ticketCount = Number(bookingData.quantity || bookingData.tickets || 1);

  const batch = db.batch();

  // 3. UPDATE HOST ANALYTICS
  const hostRef = db.collection('host_analytics').doc(hostId);
  batch.set(hostRef, {
    totalRevenue: admin.firestore.FieldValue.increment(revenue),
    totalTicketsSold: admin.firestore.FieldValue.increment(ticketCount),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    hostId: hostId
  }, { merge: true });

  // 4. UPDATE EVENT ANALYTICS (If Event ID exists)
  if (eventId) {
    const eventStatsRef = db.collection('event_analytics').doc(eventId);
    batch.set(eventStatsRef, {
      totalRevenue: admin.firestore.FieldValue.increment(revenue),
      totalTicketsSold: admin.firestore.FieldValue.increment(ticketCount),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      eventId: eventId,
      hostId: hostId
    }, { merge: true });
  }

  await batch.commit();
  console.log(`✅ [${source}] Updated Host ${hostId} (+₹${revenue})`);
}

// 🤖 LISTENER 1: Watches Root 'bookings' (Front Door)
exports.analyticsRoot = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite((change, context) => 
    updateAnalytics(change.after.data(), change.before.data(), context, "ROOT")
  );

// 🤖 LISTENER 2: Watches Sub-collection 'events/x/bookings' (Back Door)
exports.analyticsSub = functions.firestore
  .document('events/{eventId}/bookings/{bookingId}')
  .onWrite((change, context) => 
    updateAnalytics(change.after.data(), change.before.data(), context, "SUB")
  );
