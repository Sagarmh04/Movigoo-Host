# Super Admin Setup Guide

## Overview
This guide explains how to set up and use the Super Admin dashboard for viewing all organizer data including KYC, bank details, events, and payout information.

---

## 🔐 STEP 1: Assign SUPER_ADMIN Role

### Target User
- **UID**: `DEQvBejlJQVDs4d2zRWPdJOcgZu1`
- **Role**: `SUPER_ADMIN`

### Prerequisites
1. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

2. Download Firebase Service Account Key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in project root
   - **⚠️ NEVER commit this file to Git**

### Run the Script
```bash
node scripts/set-super-admin.js
```

The script will:
- Set custom claims for the specified UID
- Assign `SUPER_ADMIN` role
- Verify the role was set correctly

---

## 🔄 STEP 2: Session Refresh (CRITICAL)

After running the script, the user **MUST**:

1. **Logout** from the application
2. **Login again** with the same credentials
3. **Hard refresh** the browser:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

**Why?** Firebase custom claims only load on fresh authentication. Without logout/login, the role won't be active.

---

## 👑 STEP 3: Access Super Admin Dashboard

### Navigation
Once logged in with SUPER_ADMIN role:
1. A red **"Super Admin"** button appears at the bottom of the sidebar
2. Click it to navigate to `/super-admin/organizers`

### Access Control
- ✅ Only users with `role: "SUPER_ADMIN"` can access
- ❌ All other users are blocked and redirected
- 🔒 Double role check: Sidebar visibility + Page-level protection

---

## 📊 What Super Admin Can See

### Dashboard Overview
The Super Admin dashboard provides comprehensive read-only access to all organizer data:

### 1. **Stats Cards**
- Total Organizers
- KYC Verified Count
- Bank Details Added Count
- Payout Ready Count
- Total Platform Revenue

### 2. **Organizer Table** (Main View)
For each organizer:
- **Name, Email, Phone, City/State**
- **KYC Status** (Verified/Pending/Rejected/Not Started)
- **Bank Status** (Added/Not Added)
- **Total Events Hosted**
- **Total Revenue Generated**
- **Payout Ready Status** (Yes/No)

### 3. **Expandable Details** (Click chevron to expand)

#### 🛂 KYC Details
- KYC Status with badge
- Submission date
- Verification date

#### 🏦 Bank Details (MASKED)
- Beneficiary Name
- Bank Name
- IFSC Code
- **Account Number** (Only last 4 digits: `XXXXXX1234`)
- Account Type (Savings/Current)
- Bank Added Date

#### 💸 Payout Summary
- Total Revenue
- Platform Fee (15%)
- **Payout Eligible Amount** (85% of revenue)
- Payout Ready Status

#### 🎟️ Events List
For each event:
- Event Name
- Status (Published/Completed/Draft)
- Tickets Sold
- Revenue Generated
- Event Date

---

## 🔒 Security Features

### Data Protection
- ✅ **Account numbers masked** (only last 4 digits shown)
- ✅ **Read-only access** (no editing capabilities)
- ✅ **Role verification** on every page load
- ✅ **Sensitive data never exposed** in full

### Access Restrictions
- Super Admin **CANNOT** edit organizer data
- Super Admin **CANNOT** modify KYC status
- Super Admin **CANNOT** change bank details
- Super Admin **CAN ONLY VIEW** information

### Double Security Check
1. **Sidebar Level**: Super Admin button only visible to SUPER_ADMIN role
2. **Page Level**: Route checks role and redirects unauthorized users

---

## 📥 Export Functionality

### CSV Export
Click "Export CSV" to download comprehensive organizer data including:
- Organizer identity (name, email, phone, location)
- KYC details (status, dates)
- Bank details (masked account numbers)
- Event statistics (total events, tickets, revenue)
- Payout eligibility

**File Format**: `organizers-bank-details-YYYY-MM-DD.csv`

---

## 🎯 Payout-Ready Identification

An organizer is **Payout Ready** when:
1. ✅ KYC Status = `VERIFIED`
2. ✅ Bank Details = `ADDED`

The dashboard clearly shows:
- **Green "Ready" badge** for payout-ready organizers
- **Gray "Not Ready" badge** for others
- **Payout Eligible Amount** (revenue after 15% platform fee)

---

## 🔍 Search & Filter

Use the search bar to filter organizers by:
- Name
- Email
- Phone number

Real-time filtering updates the table instantly.

---

## 📱 Responsive Design

The dashboard is fully responsive:
- Desktop: Full table view with all columns
- Tablet: Optimized layout
- Mobile: Stacked cards (if needed)

---

## 🚨 Troubleshooting

### "Access Denied" Error
**Problem**: User sees "Access Denied: Super Admin only"

**Solutions**:
1. Verify the script ran successfully
2. User must logout and login again
3. Check Firebase Console → Authentication → User → Custom Claims
4. Should show: `{ "role": "SUPER_ADMIN" }`

### Super Admin Button Not Visible
**Problem**: Button doesn't appear in sidebar

**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Logout and login again
4. Verify custom claims in Firebase Console

### Data Not Loading
**Problem**: Dashboard shows loading spinner indefinitely

**Solutions**:
1. Check browser console for errors
2. Verify Firestore permissions
3. Check network tab for failed requests
4. Ensure user is authenticated

---

## 📋 Data Structure

### Firestore Collections Used
- `organizers/{organizerId}` - Organizer data, KYC, bank details
- `users/{userId}` - User profiles
- `events/{eventId}` - Event data, revenue, tickets

### Required Fields
```typescript
organizers/{organizerId} {
  kycStatus: "verified" | "pending" | "not_started" | "rejected"
  kycSubmittedAt: timestamp
  kycVerifiedAt: timestamp
  bankDetails: {
    beneficiaryName: string
    accountType: "SAVINGS" | "CURRENT"
    bankName: string
    accountNumberLast4: string  // Only last 4 digits
    ifscCode: string
  }
  payoutStatus: "ADDED" | "NOT_ADDED"
  bankAddedAt: timestamp
}

events/{eventId} {
  organizerId: string
  title: string
  status: string
  ticketsSold: number
  totalRevenue: number
}
```

---

## 🎯 Use Cases

### 1. Processing Payouts
1. Open Super Admin dashboard
2. Filter for "Payout Ready" organizers (green badge)
3. View bank details (masked for security)
4. Export CSV for payment processing
5. Use IFSC and masked account for verification

### 2. KYC Verification Tracking
1. View KYC status for all organizers
2. Check submission and verification dates
3. Identify pending verifications
4. Monitor verification pipeline

### 3. Revenue Analytics
1. View total platform revenue
2. See per-organizer revenue breakdown
3. Calculate payout eligible amounts
4. Track event performance

### 4. Compliance & Auditing
1. Export complete organizer data
2. Verify bank details are properly masked
3. Audit KYC verification status
4. Track payout readiness

---

## ⚠️ Important Notes

1. **Never share full account numbers** - Always use masked format
2. **Read-only access** - Super Admin cannot modify data
3. **Session refresh required** - After role assignment, logout/login mandatory
4. **Secure the service account key** - Never commit to version control
5. **Regular audits** - Monitor Super Admin access logs

---

## 🔗 Related Files

- `/app/super-admin/organizers/page.tsx` - Main dashboard component
- `/scripts/set-super-admin.js` - Role assignment script
- `/app/page.tsx` - Main dashboard with Super Admin button
- `/lib/api/bankDetails.ts` - Bank details API functions

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review Firebase Console for role verification
3. Check browser console for errors
4. Verify Firestore security rules allow admin access
