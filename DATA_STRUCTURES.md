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

#### Bookings Subcollection

**Collection Path:** `events/{eventId}/bookings/{bookingId}`

```typescript
{
  id: string;                          // Booking ID (document ID)
  eventId: string;                     // Event ID
  userId: string;                       // User ID who made the booking
  customerId: string;                   // Customer/user reference
  quantity: number;                     // Total number of tickets in this booking
  ticketCount: number;                  // Same as quantity (for compatibility)
  amount: number;                       // Total amount paid
  total: number;                        // Same as amount (for compatibility)
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  createdAt: string | Date;             // Booking creation timestamp
  updatedAt: string | Date;             // Last update timestamp
  
  // Ticket details
  tickets: TicketRecord[];              // Array of individual ticket records
  
  // Event details (snapshot at booking time)
  eventTitle: string;                   // Event title
  eventDate: string;                    // Event date
  eventTime: string;                   // Event time
  venueName: string;                    // Venue name
  locationName: string;                 // Location name
  
  // Show assignment
  locationId: string;                   // Location ID
  venueId: string;                      // Venue ID
  dateId: string;                       // Date ID
  showId: string;                       // Show ID
}
```

#### Ticket Record (within Booking)

```typescript
{
  ticketId: string;                     // Unique ticket ID (QR code identifier)
  ticketTypeId: string;                 // Reference to ticket type
  ticketTypeName: string;               // Ticket type name (e.g., "Regular", "VIP")
  price: number;                        // Price of this ticket
  qrCode: string;                       // QR code data/URL
  qrCodeId: string;                     // QR code identifier
  
  // Attendance tracking
  isAttended: boolean;                   // Whether ticket has been scanned/attended
  attendedAt?: string | Date;           // When ticket was scanned
  attendedBy?: string;                  // Volunteer UUID who scanned the ticket
  attendanceCount: number;             // Number of people who entered (for group tickets)
  remainingCount: number;               // Remaining entries for group tickets
  
  // For group tickets (quantity > 1)
  totalQuantity: number;                // Total quantity in booking
  enteredQuantity: number;              // How many have entered
}
```

#### Example Booking Document

```json
{
  "id": "booking_123",
  "eventId": "evt_123",
  "userId": "user_456",
  "customerId": "user_456",
  "quantity": 4,
  "ticketCount": 4,
  "amount": 2000,
  "total": 2000,
  "status": "confirmed",
  "paymentStatus": "paid",
  "createdAt": "2025-11-25T10:00:00Z",
  "updatedAt": "2025-11-25T10:00:00Z",
  "tickets": [
    {
      "ticketId": "ticket_001",
      "ticketTypeId": "ticket_1",
      "ticketTypeName": "Regular",
      "price": 500,
      "qrCode": "https://api.qrserver.com/v1/create-qr-code/?data=ticket_001",
      "qrCodeId": "ticket_001",
      "isAttended": false,
      "attendanceCount": 0,
      "remainingCount": 4,
      "totalQuantity": 4,
      "enteredQuantity": 0
    }
  ],
  "eventTitle": "Amazing Music Concert",
  "eventDate": "2025-12-25",
  "eventTime": "19:00",
  "venueName": "Movigoo Hall",
  "locationName": "Bangalore",
  "locationId": "loc_1",
  "venueId": "venue_1",
  "dateId": "date_1",
  "showId": "show_1"
}
```

#### Tickets Subcollection (Alternative Structure)

**Collection Path:** `events/{eventId}/tickets/{ticketId}`

This is an alternative flat structure where each ticket is a separate document:

```typescript
{
  id: string;                          // Ticket ID (document ID, also QR code ID)
  bookingId: string;                   // Reference to booking
  eventId: string;                     // Event ID
  userId: string;                      // User who owns the ticket
  ticketTypeId: string;                // Ticket type reference
  ticketTypeName: string;              // Ticket type name
  price: number;                       // Ticket price
  qrCode: string;                       // QR code data/URL
  isAttended: boolean;                 // Attendance status
  attendedAt?: string | Date;          // When scanned
  attendedBy?: string;                 // Volunteer UUID
  createdAt: string | Date;            // Ticket creation time
}
```

### Other Subcollections

- **reviews** - Reviews for this event
- **analytics** - Event analytics data

*Note: The bookings structure supports partial entry - if a booking has quantity 4, volunteers can mark 2-3 as attended and the remaining count is tracked.*

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

---

## 4. Volunteers Collection

**Collection Path:** `volunteers/{volunteerId}` (where volunteerId is the UUID)

### Document Structure

```typescript
{
  id: string;                          // UUID (document ID)
  hostUserId: string;                  // ID of the host who created this volunteer
  username: string;                     // Login username
  password: string;                     // Password (should be hashed in production)
  privileges: VolunteerPrivilege[];     // Array of privileges
  isActive: boolean;                    // Whether volunteer account is active
  accessLink: string;                   // Full access link: crew.movigoo.in/{uuid}
  createdAt: string;                    // ISO date string
  updatedAt: string;                    // ISO date string
  
  // Show Assignments (per show, not per event/location)
  showAssignments: ShowAssignment[];    // Array of show assignments
}

type VolunteerPrivilege = "ticket_checking" | "stats_view";

interface ShowAssignment {
  id: string;                          // Unique assignment ID
  eventId: string;                     // Event ID
  eventTitle: string;                  // Event title (for display)
  locationId: string;                  // Location ID
  locationName: string;                // Location name (for display)
  venueId: string;                     // Venue ID
  venueName: string;                   // Venue name (for display)
  dateId: string;                      // Date ID
  date: string;                        // Date string (ISO format)
  showId: string;                      // Show ID
  showName?: string;                   // Show name (optional)
  showStartTime: string;               // Show start time (HH:mm format)
  showEndTime: string;                 // Show end time (HH:mm format)
  assignedAt: string;                  // When assignment was created
  assignedBy: string;                  // Host user ID who assigned
}
```

### Example Volunteer Document

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "hostUserId": "host_user_123",
  "username": "volunteer_john",
  "password": "hashed_password_here",
  "privileges": ["ticket_checking", "stats_view"],
  "isActive": true,
  "accessLink": "crew.movigoo.in/550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-11-25T10:00:00Z",
  "updatedAt": "2025-11-25T10:00:00Z",
  "showAssignments": [
    {
      "id": "assign_001",
      "eventId": "evt_123",
      "eventTitle": "Amazing Music Concert",
      "locationId": "loc_1",
      "locationName": "Bangalore",
      "venueId": "venue_1",
      "venueName": "Movigoo Hall",
      "dateId": "date_1",
      "date": "2025-12-25",
      "showId": "show_1",
      "showName": "Evening Show",
      "showStartTime": "19:00",
      "showEndTime": "21:00",
      "assignedAt": "2025-11-25T10:30:00Z",
      "assignedBy": "host_user_123"
    }
  ]
}
```

### Key Points

- **UUID Source**: The UUID is generated using `crypto.randomUUID()` (or fallback) when creating a volunteer. It serves as both the document ID and the access link identifier.
  - Location: `lib/api/volunteers.ts` - `generateUUID()` function
  - Format: Standard UUID v4 format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
  - Usage: Used as document ID in `volunteers/{uuid}` collection and in access link `crew.movigoo.in/{uuid}`
- **Per Show Assignment**: Volunteers are assigned to specific shows, not entire events or locations. This allows granular control.
- **Multiple Shows**: A volunteer can be assigned to multiple shows across different events, locations, venues, and dates.
- **Collaboration**: Multiple volunteers can work on the same show, allowing collaborative ticket checking.

---

## 5. Attendance Records (for QR Scanning)

When a volunteer scans a QR code and marks attendance, the booking document is updated. The attendance tracking supports:

- **Partial Entry**: If a booking has quantity 4, volunteers can mark 2-3 people as attended, and the remaining count is saved.
- **Multiple Volunteers**: Different volunteers can scan different tickets from the same booking.
- **Real-time Updates**: All volunteers see the same updated attendance status.

### Attendance Update Structure

When a ticket is scanned:

```typescript
{
  // In the ticket record within booking
  isAttended: true;
  attendedAt: string | Date;           // Timestamp of scan
  attendedBy: string;                   // Volunteer UUID who scanned
  attendanceCount: number;             // Incremented count
  remainingCount: number;              // Decremented count
  enteredQuantity: number;              // How many have entered from this booking
}
```

---

## Notes

- This documentation is based on the frontend codebase analysis
- The actual backend Firestore structure may have additional fields or subcollections
- KYC-related data structures have been excluded as requested
- Subcollection structures are inferred from UI components and may need backend verification
- **UUID Generation**: Uses `crypto.randomUUID()` in modern browsers, with fallback for older browsers
- **QR Code Format**: QR codes contain the ticket ID which is used to look up the booking

