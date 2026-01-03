# Detailed Bug Report - Movigoo Host

This document contains a comprehensive list of bugs and issues found in the codebase after detailed analysis.

---

## 🚨 CRITICAL BUGS

### 1. **`document.cookie` Access in Client-Side Code (Potential SSR Crash)**

**File:** `lib/api/events.ts:31-39`

**Issue:**
```typescript
const sessionId = document.cookie
  .split("; ")
  .find((row) => row.startsWith("host_session_id="))
  ?.split("=")[1];
```

**Problem:** `document.cookie` is accessed without checking if code is running in browser. This will crash during SSR/SSG in Next.js.

**Impact:** Application crashes on server-side rendering.

**Fix:**
```typescript
const sessionId = typeof window !== "undefined" 
  ? document.cookie
      .split("; ")
      .find((row) => row.startsWith("host_session_id="))
      ?.split("=")[1]
  : undefined;
```

**Severity:** 🔴 CRITICAL

---

### 2. **Inefficient Firestore Query in Owner Panel**

**File:** `app/owner/organizers/page.tsx:124-126`

**Issue:**
```typescript
const userDoc = await getDocs(
  query(collection(db, "users"), where("__name__", "==", doc.id))
);
```

**Problem:** Using `where("__name__", "==", doc.id)` query instead of direct document access `doc(db, "users", doc.id)` and `getDoc()`. This is:
- Inefficient (requires query instead of direct read)
- More expensive (reads count as queries)
- Slower performance

**Fix:**
```typescript
const userDocRef = doc(db, "users", doc.id);
const userDocSnap = await getDoc(userDocRef);
let userProfile: any = {};
if (userDocSnap.exists()) {
  userProfile = userDocSnap.data().profile || {};
}
```

**Severity:** 🟡 MEDIUM (Performance)

---

### 3. **Race Condition: Auth State Check Without Waiting**

**File:** `app/page.tsx:72,96`, `app/owner/organizers/page.tsx:88`

**Issue:**
```typescript
const user = auth.currentUser;
if (!user) return;
```

**Problem:** Multiple places use `auth.currentUser` directly in `useEffect` without waiting for auth state to initialize. This can cause:
- False negatives (user is logged in but `currentUser` is null initially)
- Inconsistent behavior across page loads
- Race conditions with Firebase Auth initialization

**Impact:** Functions may fail to execute even when user is authenticated.

**Fix:** Use `onAuthStateChanged` to wait for auth state (like in `DashboardOverview.tsx`).

**Severity:** 🟡 MEDIUM (Reliability)

---

### 4. **Incorrect Timestamp Property Access**

**File:** `lib/api/support.ts:113-114`

**Issue:**
```typescript
const aTime = a.updatedAt?.seconds || a.updatedAt?._seconds || 0;
const bTime = b.updatedAt?.seconds || b.updatedAt?._seconds || 0;
```

**Problem:** Firestore Timestamp objects have `.toMillis()` method or can be compared directly. The code assumes internal `seconds` or `_seconds` properties which:
- Are internal implementation details
- May not exist in all Firestore SDK versions
- Can cause sorting to fail silently

**Fix:**
```typescript
const aTime = a.updatedAt?.toMillis?.() || (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
const bTime = b.updatedAt?.toMillis?.() || (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
```

Or better:
```typescript
import { Timestamp } from "firebase/firestore";
const aTime = a.updatedAt instanceof Timestamp 
  ? a.updatedAt.toMillis() 
  : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
```

**Severity:** 🟡 MEDIUM (Reliability)

---

## ⚠️ HIGH PRIORITY BUGS

### 5. **Missing Error Handling for Booking Fetch Failures**

**File:** `lib/utils/stats.ts:158-160`

**Issue:**
```typescript
} catch (error) {
  console.error(`Error fetching bookings for event ${eventId}:`, error);
}
// Error is silently ignored, allBookings continues with partial data
```

**Problem:** If booking fetch fails for one event, the error is logged but execution continues. This can lead to:
- Incomplete stats (some events' bookings missing)
- Silent failures
- Incorrect revenue/ticket counts

**Impact:** Dashboard shows incorrect statistics.

**Fix:** Consider:
- Retry logic for transient failures
- Partial stats with warnings
- Failing fast for critical errors
- User-visible error messages

**Severity:** 🟠 HIGH

---

### 6. **Potential Memory Leak: Missing Cleanup in useEffect**

**File:** Multiple files using `useEffect` with async operations

**Issue:** Several `useEffect` hooks call async functions without cleanup or cancellation tokens.

**Example:** `app/page.tsx:50-61`
```typescript
useEffect(() => {
  loadKycStatus();
  checkOwnerAccess();
  // No cleanup - if component unmounts, state updates may still occur
}, []);
```

**Problem:** If component unmounts while async operation is in progress:
- State updates on unmounted component (React warning)
- Potential memory leaks
- Unnecessary network requests

**Fix:** Use cleanup function or abort controller:
```typescript
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    const data = await fetchData();
    if (!cancelled) setData(data);
  };
  load();
  return () => { cancelled = true; };
}, []);
```

**Severity:** 🟡 MEDIUM

---

### 7. **Inconsistent Event Owner Field Handling**

**Files:** Multiple files query events with `hostUserId` OR `organizerId`

**Issue:** Codebase uses both `hostUserId` and `organizerId` fields, but:
- `lib/utils/stats.ts:67` queries by `hostUserId` only
- `app/owner/organizers/page.tsx:135` queries by `organizerId` only
- Events might have both fields with different values

**Problem:** If an event has both fields:
- Stats might miss events if only one field is checked
- Owner panel might show different events than organizer dashboard
- Data inconsistency

**Impact:** Missing events in statistics or organizer views.

**Fix:** Standardize on one field OR query for both:
```typescript
// Option 1: Query both fields
const eventsQuery1 = query(collection(db, "events"), where("hostUserId", "==", userId));
const eventsQuery2 = query(collection(db, "events"), where("organizerId", "==", userId));
// Merge results...

// Option 2: Standardize on one field across codebase
```

**Severity:** 🟠 HIGH (Data Integrity)

---

### 8. **Missing Null Check for Firestore Timestamp Conversion**

**File:** `lib/api/events.ts:320`

**Issue:**
```typescript
lastSaved: event.updatedAt ? new Date(event.updatedAt) : null,
```

**Problem:** If `event.updatedAt` is a Firestore Timestamp object, `new Date(event.updatedAt)` may not work correctly. Should use `.toDate()` method.

**Fix:**
```typescript
lastSaved: event.updatedAt 
  ? (event.updatedAt.toDate ? event.updatedAt.toDate() : new Date(event.updatedAt))
  : null,
```

**Severity:** 🟡 MEDIUM

---

### 9. **Type Safety: Excessive Use of `any` Type**

**Files:** Multiple files

**Issue:** Many places use `any` type which:
- Bypasses TypeScript type checking
- Hides potential runtime errors
- Makes code harder to maintain

**Examples:**
- `lib/utils/stats.ts:78` - `as any`
- `app/owner/organizers/page.tsx:128` - `userProfile: any = {}`
- Many event/booking data structures use `any`

**Impact:** Type safety compromised, potential runtime errors.

**Severity:** 🟡 MEDIUM (Code Quality)

---

### 10. **Missing Error Handling in Bank Details Get**

**File:** `lib/api/bankDetails.ts:56-77`

**Issue:**
```typescript
const organizerDoc = await getDoc(organizerRef);
// No try-catch - Firestore errors will propagate
```

**Problem:** If Firestore query fails (permissions, network, etc.), error is not caught and will crash the calling component.

**Fix:** Add try-catch with appropriate error handling.

**Severity:** 🟡 MEDIUM

---

## 🔵 LOW PRIORITY / CODE QUALITY ISSUES

### 11. **Console.log Statements in Production Code**

**Files:** Multiple files contain `console.log` statements

**Issue:** Debug logging left in production code:
- `lib/api/events.ts:41-45` - Headers prepared log
- Multiple files with debug logs

**Impact:** Performance overhead, console pollution, potential information leakage.

**Fix:** Use proper logging library or remove/guard with environment check.

**Severity:** 🔵 LOW

---

### 12. **Hardcoded Owner Email**

**Files:** Multiple files have `const OWNER_EMAIL = "movigoo4@gmail.com"`

**Issue:** Owner email is hardcoded in multiple places:
- `app/page.tsx:48`
- `app/owner/organizers/page.tsx:70`
- Support email checks in `lib/api/support.ts`

**Impact:** Hard to change, risk of inconsistency.

**Fix:** Move to environment variable or config file.

**Severity:** 🔵 LOW

---

### 13. **Missing Input Validation**

**File:** `lib/api/volunteers.ts:57-76`

**Issue:** Password validation only checks length, not complexity. Username validation is minimal.

**Impact:** Weak passwords/usernames accepted.

**Severity:** 🔵 LOW (Security Enhancement)

---

### 14. **Inefficient Booking Fetch (Sequential Loop)**

**File:** `lib/utils/stats.ts:141-161`

**Issue:**
```typescript
for (const eventId of eventIds) {
  try {
    const bookingsQuery = query(...);
    const bookingsSnapshot = await getDocs(bookingsQuery);
    // Sequential fetching - slow for many events
  }
}
```

**Problem:** Bookings are fetched sequentially. For many events, this is slow.

**Fix:** Use `Promise.all()` for parallel fetching:
```typescript
const bookingPromises = eventIds.map(async (eventId) => {
  try {
    // ... fetch bookings
  } catch (error) {
    console.error(`Error fetching bookings for event ${eventId}:`, error);
    return [];
  }
});
const allBookingsArrays = await Promise.all(bookingPromises);
const allBookings = allBookingsArrays.flat();
```

**Severity:** 🔵 LOW (Performance)

---

### 15. **Missing Loading States**

**File:** `app/page.tsx:70-92`

**Issue:** `loadKycStatus()` and `checkOwnerAccess()` don't set loading states, so UI doesn't indicate data is being fetched.

**Impact:** Poor UX - users don't know data is loading.

**Severity:** 🔵 LOW (UX)

---

## 📋 SUMMARY

### By Severity:
- 🔴 **CRITICAL:** 1 bug
- 🟠 **HIGH:** 3 bugs
- 🟡 **MEDIUM:** 7 bugs
- 🔵 **LOW:** 5 issues

### By Category:
- **Authentication/Race Conditions:** 3
- **Performance:** 3
- **Error Handling:** 4
- **Type Safety:** 2
- **Code Quality:** 5

### Recommended Fix Order:
1. Fix `document.cookie` SSR issue (Critical)
2. Fix inefficient owner panel query (High Performance Impact)
3. Add error handling for booking fetches (High Data Integrity)
4. Fix auth state race conditions (Medium Reliability)
5. Fix timestamp handling (Medium Reliability)
6. Standardize event owner fields (High Data Integrity)
7. Add cleanup to useEffect hooks (Medium Memory)
8. Improve type safety (Medium Code Quality)
9. Address remaining issues as time permits

---

## 🔍 TESTING RECOMMENDATIONS

After fixes, test:
1. SSR/SSG rendering (check for `document` errors)
2. Dashboard stats accuracy (compare with manual counts)
3. Owner panel performance (check query counts)
4. Auth state transitions (login/logout)
5. Support ticket sorting (verify chronological order)
6. Event queries (ensure all events appear)
7. Error scenarios (network failures, permission errors)
