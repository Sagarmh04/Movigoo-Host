# Data Structures Documentation

This document outlines the data structures for **users**, **events**, and **host users** collections, along with their subcollections, as found in the Movigoo Host project.

---

## 1. Users Collection

**Collection Path:** `users/{userId}`

### Document Structure

```typescript
{
  profile: {
    name: string;        // User's full name
    email: string;       // User's email address
    phone: string;       // User's phone number (optional)
  }
}
```

### Example

```json
{
  "profile": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }
}
```

### Subcollections

Based on the codebase structure, potential subcollections under `users/{userId}/`:
- **bookings** - User's event bookings
- **reviews** - Reviews written by the user
- **payments** - Payment history
- **messages** - User messages/conversations

*Note: These subcollections are referenced in the UI tabs but their exact structure is not defined in the frontend codebase.*

---

## 2. Events Collection

**Collection Path:** `events/{eventId}`

### Document Structure

```typescript
{
  // Basic Details (Step 1)
  basicDetails: {
    title: string;                    // Event title (max 50 chars)
    description: string;              // Event description
    genres: string[];                 // Array of genre strings
    languages: string[];              // Array of language strings
    ageLimit: string | number;        // Age limit for the event
    durationMinutes: number;          // Duration in minutes
    termsAccepted: boolean;           // Whether terms were accepted
    termsText?: string;               // Optional: event-specific terms
    coverWideUrl: string;             // URL to wide cover photo (16:9)
    coverPortraitUrl: string;         // URL to portrait cover photo (9:16)
  },
  
  // Schedule (Step 2)
  schedule: {
    locations: EventLocation[];       // Array of locations
  },
  
  // Tickets (Step 3)
  tickets: {
    venueConfigs: VenueTicketConfig[]; // Ticket configuration per venue
  },
  
  // Metadata
  status: "draft" | "hosted" | "pending" | "published";
  createdAt: string;                  // ISO date string
  updatedAt: string;                  // ISO date string
  publishedAt?: string;                // ISO date string (optional)
  lastSaved?: Date | null;            // Last saved timestamp
  hostUserId: string;                 // ID of the host user who created this event
}
```

### Nested Types

#### EventLocation

```typescript
{
  id: string;                          // Unique location ID
  name: string;                        // Location name (e.g., "Bangalore")
  venues: EventVenue[];                // Array of venues in this location
}
```

#### EventVenue

```typescript
{
  id: string;                          // Unique venue ID
  name: string;                        // Venue name
  address: string;                     // Venue address
  dates: EventDate[];                  // Array of dates for this venue
}
```

#### EventDate

```typescript
{
  id: string;                          // Unique date ID
  date: string;                        // ISO date string (e.g., "2025-12-25")
  shows: EventShow[];                  // Array of shows on this date
}
```

#### EventShow

```typescript
{
  id: string;                          // Unique show ID
  name?: string;                       // Optional show name (defaults to "Show 1", "Show 2", etc.)
  startTime: string;                   // Start time in HH:mm format (e.g., "19:00")
  endTime: string;                     // End time in HH:mm format (e.g., "21:00")
}
```

#### VenueTicketConfig

```typescript
{
  venueId: string;                      // ID of the venue this config applies to
  ticketTypes: TicketType[];           // Array of ticket types for this venue
}
```

#### TicketType

```typescript
{
  id: string;                          // Unique ticket type ID
  typeName: string;                    // Ticket type name (e.g., "Regular", "VIP")
  price: number;                       // Ticket price
  totalQuantity: number;               // Total number of tickets available
}
```

### Example Event Document

```json
{
  "basicDetails": {
    "title": "Amazing Music Concert",
    "description": "Join us for an amazing music concert...",
    "genres": ["Music", "Entertainment"],
    "languages": ["English", "Hindi"],
    "ageLimit": "18",
    "durationMinutes": 120,
    "termsAccepted": true,
    "termsText": "",
    "coverWideUrl": "https://storage.googleapis.com/.../wide.jpg",
    "coverPortraitUrl": "https://storage.googleapis.com/.../portrait.jpg"
  },
  "schedule": {
    "locations": [
      {
        "id": "loc_1",
        "name": "Bangalore",
        "venues": [
          {
            "id": "venue_1",
            "name": "Movigoo Hall",
            "address": "123 MG Road, Bangalore",
            "dates": [
              {
                "id": "date_1",
                "date": "2025-12-25",
                "shows": [
                  {
                    "id": "show_1",
                    "name": "Evening Show",
                    "startTime": "19:00",
                    "endTime": "21:00"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "tickets": {
    "venueConfigs": [
      {
        "venueId": "venue_1",
        "ticketTypes": [
          {
            "id": "ticket_1",
            "typeName": "Regular",
            "price": 500,
            "totalQuantity": 100
          },
          {
            "id": "ticket_2",
            "typeName": "VIP",
            "price": 1000,
            "totalQuantity": 50
          }
        ]
      }
    ]
  },
  "status": "hosted",
  "createdAt": "2025-11-23T10:00:00Z",
  "updatedAt": "2025-11-23T10:30:00Z",
  "publishedAt": "2025-11-23T10:30:00Z",
  "hostUserId": "host_user_123"
}
```

### Subcollections

Based on the codebase structure, potential subcollections under `events/{eventId}/`:
- **bookings** - Bookings for this event
- **tickets** - Individual ticket records
- **reviews** - Reviews for this event
- **analytics** - Event analytics data

*Note: These subcollections are referenced in the UI tabs but their exact structure is not defined in the frontend codebase.*

---

## 3. Host Users Collection

**Collection Path:** `hostUsers/{hostUserId}`

### Document Structure

Based on the registration API (`/api/register-host`), the host user document likely contains:

```typescript
{
  userId: string;                      // Reference to Firebase Auth user ID
  name: string;                        // Host's name
  phone?: string | null;               // Host's phone number (optional)
  createdAt: string;                   // ISO date string
  updatedAt: string;                   // ISO date string
  // Additional host-specific fields may exist
}
```

### Example

```json
{
  "userId": "firebase_auth_uid_123",
  "name": "Event Host Name",
  "phone": "+1234567890",
  "createdAt": "2025-11-20T08:00:00Z",
  "updatedAt": "2025-11-20T08:00:00Z"
}
```

### Subcollections

Based on the codebase structure, potential subcollections under `hostUsers/{hostUserId}/`:
- **events** - Events created by this host (or reference to events collection with hostUserId field)
- **bookings** - Bookings managed by this host
- **payments** - Payment/payout records
- **messages** - Messages/conversations
- **offers** - Promotional offers/coupons created by host
- **analytics** - Host analytics data

*Note: These subcollections are referenced in the UI tabs (BookingsTab, PaymentsTab, MessagesTab, OffersTab, AnalyticsTab) but their exact structure is not defined in the frontend codebase.*

---

## Summary

### Collections

1. **users** - General user accounts
   - Document: `users/{userId}`
   - Contains: profile information (name, email, phone)

2. **events** - Event listings
   - Document: `events/{eventId}`
   - Contains: Complete event details including basic info, schedule, and ticket configurations

3. **hostUsers** - Host user accounts
   - Document: `hostUsers/{hostUserId}`
   - Contains: Host-specific information (name, phone, userId reference)

### Common Subcollection Patterns

While not explicitly defined in the frontend code, the following subcollections are likely present based on UI components:

- **bookings** - Booking records
- **tickets** - Individual ticket records
- **reviews** - Review/rating records
- **payments** - Payment/payout records
- **messages** - Message/conversation records
- **offers** - Promotional offer/coupon records
- **analytics** - Analytics/metrics data

---

## Notes

- This documentation is based on the frontend codebase analysis
- The actual backend Firestore structure may have additional fields or subcollections
- KYC-related data structures have been excluded as requested
- Subcollection structures are inferred from UI components and may need backend verification

