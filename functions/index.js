const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.analyticsRoot = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    const previousData = change.before.exists ? change.before.data() : null;

    if (!data) return null; // Document deleted

    // 1. FIX: CHECK 'bookingStatus' INSTEAD OF 'status'
    // Your data says: bookingStatus: "CONFIRMED"
    const status = data.bookingStatus || data.status || "";
    const isConfirmed = status.toUpperCase() === "CONFIRMED" || status.toUpperCase() === "SUCCESS";
    
    // Prevent double counting (if status didn't change, stop)
    const oldStatus = previousData ? (previousData.bookingStatus || previousData.status || "") : "";
    if (!isConfirmed || (oldStatus.toUpperCase() === "CONFIRMED")) {
      return null;
    }

    // 2. FIX: FETCH HOST ID (Because it is missing in the booking!)
    let hostId = data.hostUid || data.hostId;
    const eventId = data.eventId;

    // If we don't have hostId, we MUST fetch it from the Event
    if (!hostId && eventId) {
      console.log(`🔍 [Analytics] Host ID missing in booking. Fetching from Event: ${eventId}`);
      try {
        const eventSnap = await db.collection('events').doc(eventId).get();
        if (eventSnap.exists) {
          const eventData = eventSnap.data();
          hostId = eventData.hostUid || eventData.hostId; // Found it!
        }
      } catch (err) {
        console.error("❌ Failed to fetch event data:", err);
      }
    }

    if (!hostId) {
      console.error(`❌ [Analytics] CRITICAL: Could not find Host ID for booking ${context.params.bookingId}`);
      return null;
    }

    // 3. FIX: CALCULATE REVENUE CORRECTLY
    // Your data: price: 1, quantity: 1, totalAmount: 8 (Includes fee?)
    // Usually Host Revenue = Ticket Price * Quantity (Excluding Booking Fee)
    const price = Number(data.price || 0);
    const quantity = Number(data.quantity || 1);
    const revenue = price * quantity; 

    console.log(`⚙️ [Analytics] Processing. Host: ${hostId}, Revenue: ${revenue}`);

    const batch = db.batch();

    // 4. UPDATE HOST ANALYTICS
    const hostRef = db.collection('host_analytics').doc(hostId);
    batch.set(hostRef, {
      totalRevenue: admin.firestore.FieldValue.increment(revenue),
      totalTicketsSold: admin.firestore.FieldValue.increment(quantity),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      hostId: hostId
    }, { merge: true });

    // 5. UPDATE EVENT ANALYTICS (Graphs)
    if (eventId) {
      const eventStatsRef = db.collection('event_analytics').doc(eventId);
      batch.set(eventStatsRef, {
        totalRevenue: admin.firestore.FieldValue.increment(revenue),
        totalTicketsSold: admin.firestore.FieldValue.increment(quantity),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        eventId: eventId,
        hostId: hostId
      }, { merge: true });

      // 6. ✅ NEW: UPDATE MAIN EVENT DOCUMENT (For the UI List)
      // This makes the "0 tickets sold" turn into "1 ticket sold" on the card
      const eventRef = db.collection('events').doc(eventId);
      batch.set(eventRef, {
        ticketsSold: admin.firestore.FieldValue.increment(quantity),
        totalTicketsSold: admin.firestore.FieldValue.increment(quantity)
      }, { merge: true });
    }

    await batch.commit();
    console.log(`✅ [Analytics] Fully Synced (Host + Event + Stats)`);
  });
