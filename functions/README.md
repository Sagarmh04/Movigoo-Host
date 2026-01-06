# Movigoo Host Analytics Cloud Functions

This directory contains Firebase Cloud Functions that automatically sync analytics data when bookings are created or updated.

## 📋 Overview

The `syncAnalyticsOnBooking` function:
- Triggers automatically when a booking is created or updated in `events/{eventId}/bookings/{bookingId}`
- Checks if the booking status is confirmed (`confirmed`, `success`, `paid`, `successful`)
- Atomically increments `totalRevenue` and `totalTicketsSold` in both:
  - `host_analytics/{hostId}` - Global host analytics
  - `event_analytics/{eventId}` - Per-event analytics
- Prevents double-counting by checking previous booking status

## 🚀 Deployment Instructions

### 1. Install Dependencies

Navigate to the functions directory and install dependencies:

```bash
cd functions
npm install
```

### 2. Deploy to Firebase

From the **root directory** of your project (not the functions directory):

```bash
firebase deploy --only functions
```

This will deploy the `syncAnalyticsOnBooking` function to your Firebase project.

### 3. Verify Deployment

After deployment, check the Firebase Console:
1. Go to Firebase Console → Functions
2. You should see `syncAnalyticsOnBooking` listed
3. Check the logs to verify it's running

## 🔍 Testing

### Manual Test (Firestore Console)

1. Go to Firestore Console
2. Navigate to `events/{eventId}/bookings/`
3. Create a new booking document with:
   ```json
   {
     "status": "confirmed",
     "hostId": "your-user-uid",
     "amount": 500,
     "quantity": 2
   }
   ```
4. Check `host_analytics/{hostId}` - should see:
   - `totalRevenue` increased by 500
   - `totalTicketsSold` increased by 2
5. Check `event_analytics/{eventId}` - should see the same updates

### Check Function Logs

```bash
firebase functions:log
```

Look for:
- `⚙️ [Analytics] Processing Booking:` - Function triggered
- `✅ [Analytics] Successfully synced` - Update succeeded
- `❌ [Analytics] Missing hostId` - Error (missing required field)

## 📊 Data Structure

### Input (Booking Document)
```javascript
{
  status: "confirmed",        // Required: Must be confirmed/success/paid/successful
  hostId: "user123",          // Required: Host user ID
  amount: 500,                // Revenue amount (tries: amount, totalPrice, total)
  quantity: 2,                // Ticket count (tries: quantity, tickets, defaults to 1)
  // ... other booking fields
}
```

### Output (Analytics Documents)

**host_analytics/{hostId}**
```javascript
{
  totalRevenue: 500,          // Incremented atomically
  totalTicketsSold: 2,        // Incremented atomically
  lastUpdated: Timestamp,     // Server timestamp
  hostId: "user123"           // Host ID
}
```

**event_analytics/{eventId}**
```javascript
{
  totalRevenue: 500,          // Incremented atomically
  totalTicketsSold: 2,        // Incremented atomically
  lastUpdated: Timestamp,     // Server timestamp
  eventId: "event456",        // Event ID
  hostId: "user123"           // Host ID
}
```

## 🛡️ Security Features

- **Atomic Updates**: Uses Firestore batch writes to prevent race conditions
- **Idempotent**: Won't double-count if booking status changes multiple times
- **Auto-Create**: Creates analytics documents if they don't exist (merge: true)
- **Server-Side**: Runs on Google's servers, not client-side
- **Validation**: Checks for required fields before processing

## 🔧 Customization

### Add More Status Values

Edit line 29 in `index.js`:
```javascript
const validStatuses = ["confirmed", "success", "paid", "successful", "completed"];
```

### Change Field Names

If your bookings use different field names, update lines 40-42:
```javascript
const hostId = bookingData.hostId;           // Change if using different field
const ticketCount = Number(bookingData.quantity || 1);
const revenue = Number(bookingData.amount || 0);
```

## 📝 Local Development

### Run Emulator

```bash
cd functions
npm run serve
```

This starts the Firebase Emulator for local testing.

### Test Locally

Use the Firebase Emulator UI at http://localhost:4000 to:
- Create test bookings
- View function logs
- Inspect analytics updates

## 🐛 Troubleshooting

### Function Not Triggering

1. Check Firebase Console → Functions → Logs
2. Verify the function is deployed: `firebase functions:list`
3. Check Firestore rules allow the function to write to `host_analytics` and `event_analytics`

### Analytics Not Updating

1. Check function logs for errors
2. Verify booking has `status: "confirmed"` (or other valid status)
3. Verify booking has `hostId` field
4. Check that `amount` and `quantity` fields exist and are numbers

### Permission Denied

Update `firestore.rules` to allow Cloud Functions to write:
```javascript
match /host_analytics/{hostId} {
  allow read: if isAuthenticated() && request.auth.uid == hostId;
  allow write: if false; // Client writes blocked, but Cloud Functions can still write
}
```

Note: Cloud Functions bypass Firestore rules by default when using Admin SDK.

## 📚 Resources

- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
