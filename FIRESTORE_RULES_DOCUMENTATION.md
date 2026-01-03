# Firestore Security Rules Documentation

This document explains the Firestore security rules for the Movigoo Host application.

## Overview

The security rules are based on a comprehensive analysis of the codebase, covering all Firestore collections and their access patterns.

## Collections Covered

1. **users** - User profiles
2. **events** - Event documents
3. **events/{eventId}/bookings** - Booking subcollection
4. **organizers** - Organizer documents (includes bank details, KYC status)
5. **supportTickets** - Support tickets
6. **supportTickets/{ticketId}/messages** - Support ticket messages
7. **volunteers** - Volunteer accounts

## Access Control Model

### User Roles

- **Authenticated Users**: Any user logged in via Firebase Auth
- **Organizers**: Users who create events (identified by `hostUserId` or `organizerId` matching their `auth.uid`)
- **Owner**: Single owner account (`movigoo4@gmail.com`)
- **Support Staff**: Support team members (`movigootech@gmail.com`, `movigoo4@gmail.com`)

## Detailed Rules by Collection

### 1. Users Collection (`users/{userId}`)

**Read:**
- Users can read their own profile document

**Write:**
- Users can update their own profile document

### 2. Events Collection (`events/{eventId}`)

**Read:**
- Organizers can read events where `hostUserId` or `organizerId` matches their `auth.uid`
- Owner can read all events

**Create:**
- Authenticated users can create events (backend validates and sets `hostUserId`)

**Update:**
- Organizers can update events they own (where `hostUserId` or `organizerId` matches)
- Owner can update payout-related fields (`manualPayoutPaid`, `manualPayoutNote`, `manualPayoutPaidAt`, `updatedAt`) on any event

**Delete:**
- Organizers can delete events they own

#### Bookings Subcollection (`events/{eventId}/bookings/{bookingId}`)

**Read:**
- Organizers can read bookings for their events (checks parent event's `hostUserId`/`organizerId`)
- Owner can read all bookings

**Create:**
- Authenticated users can create bookings (backend should handle validation)

**Update:**
- Organizers can update bookings for their events
- Owner can update any booking

**Delete:**
- Only owner can delete bookings (typically handled by backend)

### 3. Organizers Collection (`organizers/{organizerId}`)

**Read:**
- Organizers can read their own document
- Owner can read all organizer documents

**Write:**
- Organizers can write/update their own document (e.g., bank details, KYC status)

**Note:** `accountNumberFull` is stored in Firestore but should be filtered out on the client-side for non-owner users (as implemented in `lib/api/bankDetails.ts`).

### 4. Support Tickets Collection (`supportTickets/{ticketId}`)

**Read:**
- Users can read their own tickets (where `userId` matches `auth.uid`)
- Support staff can read all tickets

**Create:**
- Authenticated users can create tickets (must set `userId` to their `auth.uid`)

**Update:**
- Only support staff can update tickets (status, priority, etc.)

**Delete:**
- Only support staff can delete tickets

#### Messages Subcollection (`supportTickets/{ticketId}/messages/{messageId}`)

**Read:**
- Users can read messages for their own tickets
- Support staff can read messages for all tickets

**Create:**
- Users can add messages to their own tickets
- Support staff can add messages to any ticket

**Update/Delete:**
- Only support staff can update/delete messages

### 5. Volunteers Collection (`volunteers/{volunteerId}`)

**Read:**
- Organizers can read volunteers they created (where `hostUserId` matches `auth.uid`)

**Create:**
- Organizers can create volunteers (must set `hostUserId` to their `auth.uid`)

**Update:**
- Organizers can update volunteers they created

**Delete:**
- Organizers can delete volunteers they created

## Security Features

### Helper Functions

- `isOwner()`: Checks if the current user is the owner (`movigoo4@gmail.com`)
- `isSupport()`: Checks if the current user is support staff
- `isAuthenticated()`: Checks if the user is logged in

### Default Deny

All collections not explicitly defined in the rules are denied by default (security by default).

## Important Notes

1. **Bookings Subcollection**: Uses `get()` to check parent event's `hostUserId`/`organizerId`. This is necessary for security but has performance implications. Consider this when scaling.

2. **Bank Details Security**: While `accountNumberFull` is stored in Firestore, the application filters it out on the client-side for non-owner users. The rules allow owner to read full organizer documents, but client-side filtering provides an additional security layer.

3. **Event Creation**: Rules allow authenticated users to create events, assuming the backend validates and sets `hostUserId` correctly. If events are created only via backend APIs, consider restricting create access.

4. **Booking Creation**: Rules allow authenticated users to create bookings. If bookings are created only via backend webhooks (e.g., payment confirmation), consider restricting create access or using Firebase Admin SDK.

5. **Owner Access**: The owner email (`movigoo4@gmail.com`) is hardcoded in the rules. If this needs to change, update the `isOwner()` helper function.

## Deployment

To deploy these rules:

```bash
firebase deploy --only firestore:rules
```

Or use the Firebase Console:
1. Go to Firestore Database → Rules
2. Paste the rules
3. Click "Publish"

## Testing Recommendations

1. Test organizer access to their own events and bookings
2. Test owner access to all collections
3. Test support staff access to tickets
4. Verify that users cannot access other users' data
5. Test booking creation (if done from client)
6. Verify event update restrictions (organizers vs owner)
7. Test volunteer access patterns

## Future Considerations

1. If booking creation is backend-only, restrict create access in rules
2. Consider adding custom claims for roles instead of email checks
3. Monitor performance impact of `get()` calls in booking subcollection rules
4. Consider adding rate limiting for write operations
5. Add validation rules for field types and values (if needed)
