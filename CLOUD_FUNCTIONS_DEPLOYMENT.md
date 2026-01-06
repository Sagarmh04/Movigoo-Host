# Cloud Functions Deployment Guide

## 🎯 Purpose

This guide will help you deploy the **Analytics Sync Cloud Function** that automatically updates `host_analytics` and `event_analytics` whenever a booking is confirmed.

## 📦 What Was Created

Three new files in the `functions/` directory:

1. **`functions/index.js`** - The Cloud Function code
2. **`functions/package.json`** - Dependencies configuration
3. **`functions/README.md`** - Detailed documentation

## 🚀 Deployment Steps

### Step 1: Install Firebase CLI (If Not Already Installed)

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

### Step 3: Initialize Firebase (If Not Already Done)

From the root directory:

```bash
firebase init functions
```

When prompted:
- **Select your Firebase project** (choose your existing Movigoo project)
- **Language**: JavaScript
- **ESLint**: No (optional)
- **Install dependencies**: Yes

### Step 4: Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 5: Deploy the Function

From the **root directory** (not the functions directory):

```bash
firebase deploy --only functions
```

Expected output:
```
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (XX.XX KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function syncAnalyticsOnBooking...
✔  functions[syncAnalyticsOnBooking]: Successful create operation.
✔  Deploy complete!
```

## ✅ Verification

### 1. Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions** in the left sidebar
4. You should see `syncAnalyticsOnBooking` listed

### 2. Test the Function

#### Option A: Manual Test via Firestore Console

1. Go to Firestore Console
2. Navigate to `events/{any-event-id}/bookings/`
3. Add a new document with this data:
   ```json
   {
     "status": "confirmed",
     "hostId": "YOUR_USER_UID",
     "amount": 500,
     "quantity": 2
   }
   ```
4. Check `host_analytics/{YOUR_USER_UID}`:
   - Should see `totalRevenue: 500`
   - Should see `totalTicketsSold: 2`
5. Check `event_analytics/{event-id}`:
   - Should see the same values

#### Option B: Check Function Logs

```bash
firebase functions:log
```

Look for these log messages:
- `⚙️ [Analytics] Processing Booking:` - Function triggered
- `✅ [Analytics] Successfully synced for Host` - Success

### 3. Verify in Dashboard

1. Open your Movigoo Host Dashboard
2. Check the "Analytics Summary" section
3. The values should update in real-time when bookings are created

## 🔍 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  User Books Ticket → Booking Created in Firestore          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Cloud Function Triggers Automatically (24/7)               │
│  - Checks if status is "confirmed"                          │
│  - Extracts hostId, amount, quantity                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Atomic Batch Update (No Race Conditions)                   │
│  1. host_analytics/{hostId}                                 │
│     - totalRevenue += amount                                │
│     - totalTicketsSold += quantity                          │
│  2. event_analytics/{eventId}                               │
│     - totalRevenue += amount                                │
│     - totalTicketsSold += quantity                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Updates Instantly (Real-time Listener)           │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Security Notes

- ✅ Function runs on Google's servers (not client-side)
- ✅ Uses Firebase Admin SDK (bypasses Firestore rules)
- ✅ Atomic updates prevent race conditions
- ✅ Idempotent (won't double-count if status changes multiple times)
- ✅ Auto-creates analytics documents if they don't exist

## 🐛 Troubleshooting

### Error: "Firebase CLI not found"

Install Firebase CLI:
```bash
npm install -g firebase-tools
```

### Error: "Permission denied"

Make sure you're logged in:
```bash
firebase login
```

### Error: "Project not found"

Initialize Firebase in your project:
```bash
firebase init
```

### Function Not Triggering

1. Check function is deployed:
   ```bash
   firebase functions:list
   ```

2. Check function logs:
   ```bash
   firebase functions:log
   ```

3. Verify booking has required fields:
   - `status: "confirmed"` (or "success", "paid", "successful")
   - `hostId: "user-uid"`
   - `amount: 500` (number)
   - `quantity: 2` (number)

### Analytics Not Updating

1. Check browser console for real-time listener logs:
   - `📊 [Analytics] Real-time update:`
   - Should show updated values

2. Verify `host_analytics/{userId}` document exists in Firestore

3. Check function logs for errors:
   ```bash
   firebase functions:log
   ```

## 📊 Expected Behavior

### Before Deployment
- Dashboard shows 0 tickets sold, ₹0 revenue
- Analytics don't update when bookings are created

### After Deployment
- Dashboard shows real-time data from `host_analytics`
- When a booking is confirmed:
  1. Cloud Function triggers automatically
  2. `host_analytics` and `event_analytics` update
  3. Dashboard reflects changes instantly (via onSnapshot listener)

## 💰 Cost Estimate

Firebase Cloud Functions pricing (Free tier):
- **2 million invocations/month** - FREE
- **400,000 GB-seconds** - FREE
- **200,000 CPU-seconds** - FREE

For most small to medium apps, this function will stay within the free tier.

## 📝 Next Steps

1. ✅ Deploy the function: `firebase deploy --only functions`
2. ✅ Test with a sample booking
3. ✅ Verify dashboard updates in real-time
4. ✅ Monitor function logs for any errors
5. ✅ Celebrate! 🎉 Your analytics are now automated

## 📚 Additional Resources

- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Function Logs](https://console.firebase.google.com/project/_/functions/logs)

---

**Need Help?** Check the detailed `functions/README.md` for more information.
