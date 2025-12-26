# Owner Access - Simple Email-Based System

## Overview
Simple email-based owner access for viewing all organizer data. No roles, no custom claims, no Firebase Admin SDK required.

---

## 🎯 Owner Email

**Owner**: `movigoo4@gmail.com`

This email has access to:
- All organizers data
- KYC details
- Bank information (masked)
- Events and revenue
- Payout information

---

## 🔐 How It Works

### 1. Owner Email Definition
```typescript
const OWNER_EMAIL = "movigoo4@gmail.com";
```

### 2. Owner Check
```typescript
const user = auth.currentUser;
const isOwner = user?.email === OWNER_EMAIL;
```

### 3. Sidebar Visibility
```typescript
{isOwner && (
  <button onClick={() => router.push("/owner/organizers")}>
    Owner Panel
  </button>
)}
```

### 4. Page Protection
```typescript
// In /owner/organizers/page.tsx
const user = auth.currentUser;

if (!user || user.email !== "movigoo4@gmail.com") {
  router.replace("/");
  return null;
}
```

---

## 📁 File Structure

```
app/
└── owner/
    └── organizers/
        └── page.tsx  ← Owner panel page
```

---

## 🚀 Access Instructions

### For Owner (movigoo4@gmail.com)

1. **Login** at `https://corporate.movigoo.in`
2. **Check Sidebar** - "Owner Panel" button visible at bottom (blue)
3. **Click "Owner Panel"** - Navigate to `/owner/organizers`
4. **View Data** - See all organizers with expandable details

### For Regular Organizers

- ❌ No "Owner Panel" button visible
- ❌ Cannot access `/owner/organizers` (redirected to dashboard)
- ❌ "Access Denied: Owner only" toast shown

---

## 📊 What Owner Can See

### Dashboard Overview
- Total organizers count
- KYC verified count
- Bank details added count
- Payout ready count
- Total platform revenue

### Organizer Table
For each organizer:
- Name, email, phone, location
- KYC status (Verified/Pending/Rejected/Not Started)
- Bank status (Added/Not Added)
- Total events hosted
- Total revenue generated
- Payout ready status

### Expandable Details
Click chevron to expand and see:

**KYC Details**
- Status with badge
- Submission date
- Verification date

**Bank Details (Masked)**
- Beneficiary name
- Bank name
- IFSC code
- Account number (XXXXXX1234 format only)
- Account type
- Date added

**Payout Summary**
- Total revenue
- Platform fee (15%)
- Payout eligible amount (85%)
- Ready status

**Events List**
- Event name and status
- Tickets sold
- Revenue per event
- Event dates

---

## 🔒 Security Features

### Email-Based Access
- ✅ Owner email comes from Firebase Auth (trusted)
- ✅ Email cannot be edited by users
- ✅ No backend secrets required
- ✅ No private keys needed
- ✅ No Firebase Admin SDK risk

### Data Protection
- ✅ Account numbers always masked (last 4 digits only)
- ✅ Read-only access (no editing)
- ✅ Double protection: sidebar check + page-level check
- ✅ Automatic redirect for unauthorized access

### Why This Is Safe
1. Firebase Auth manages email verification
2. Users cannot change their email without re-authentication
3. Email check happens on both client and page level
4. No sensitive credentials stored in code
5. Simple to understand and maintain

---

## 🧪 Testing

### Test Owner Access
1. Login with `movigoo4@gmail.com`
2. Verify "Owner Panel" button visible in sidebar
3. Click button → should navigate to `/owner/organizers`
4. Verify page loads with organizer data
5. Test expandable rows for detailed views
6. Test search and CSV export

### Test Non-Owner Access
1. Login with any other email
2. Verify "Owner Panel" button NOT visible
3. Try accessing `/owner/organizers` directly
4. Should redirect to dashboard with "Access Denied" toast

---

## 📥 CSV Export

Owner can export comprehensive data including:
- Organizer details (name, email, phone, location)
- KYC information (status, dates)
- Bank details (masked account numbers)
- Event statistics (total events, tickets, revenue)
- Payout eligibility

---

## 🔄 Changing Owner Email

To change the owner email, update in two places:

**1. Main Dashboard** (`app/page.tsx`)
```typescript
const OWNER_EMAIL = "newemail@example.com";
```

**2. Owner Page** (`app/owner/organizers/page.tsx`)
```typescript
const OWNER_EMAIL = "newemail@example.com";
```

Then commit and deploy.

---

## 🚀 Deployment

```bash
# Stage changes
git add .

# Commit
git commit -m "Implement email-based owner access"

# Push to deploy
git push origin main
```

Vercel will automatically deploy to `corporate.movigoo.in`.

---

## 📞 Quick Reference

- **Owner Email**: movigoo4@gmail.com
- **Owner Panel URL**: https://corporate.movigoo.in/owner/organizers
- **Access Method**: Email-based (no roles, no custom claims)
- **Security**: Firebase Auth email verification
- **Data Protection**: Masked account numbers, read-only access

---

## ✅ Advantages of Email-Based Access

1. **Simple** - No Firebase Admin SDK setup required
2. **Safe** - Email comes from trusted Firebase Auth
3. **Easy to Change** - Update email in code and redeploy
4. **No Scripts** - No need to run admin scripts
5. **No Session Issues** - Works immediately after login
6. **Maintainable** - Easy to understand and debug
7. **Scalable** - Can add more owner emails if needed

---

## 🎯 Summary

**One-Line Explanation**: "Check if user email equals owner email, show Owner Panel if true, protect page with same check."

Simple, secure, and effective for launch. Can be upgraded to role-based system later if needed.
