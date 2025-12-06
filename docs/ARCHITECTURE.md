# Event Creation System - Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Step 1:    │  │   Step 2:    │  │   Step 3:    │        │
│  │   Basic      │→ │   Schedule   │→ │   Tickets    │        │
│  │   Details    │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         ↓                 ↓                 ↓                  │
│  ┌──────────────────────────────────────────────────┐         │
│  │       EventCreationWizard (Orchestrator)         │         │
│  └──────────────────────────────────────────────────┘         │
│                          ↓                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────┼─────────────────────────────────────┐
│                   STATE MANAGEMENT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐           │
│  │  formData   │  │ticketConfigs │  │  errors[]  │           │
│  │ (EventForm) │  │ (Venue[])    │  │(Validation)│           │
│  └─────────────┘  └──────────────┘  └────────────┘           │
│                                                                 │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────┼─────────────────────────────────────┐
│                   VALIDATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │validateBasic │  │validateSche  │  │validateTick  │        │
│  │   Details()  │  │   dule()     │  │   ets()      │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         ↓                 ↓                 ↓                  │
│  ┌──────────────────────────────────────────────────┐         │
│  │         validateForHosting() / Draft()           │         │
│  └──────────────────────────────────────────────────┘         │
│                          ↓                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────┼─────────────────────────────────────┐
│                      API LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │saveDraft │  │hostEvent │  │loadEvent │  │uploadPhoto│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│       ↓              ↓              ↓              ↓          │
└───────┼──────────────┼──────────────┼──────────────┼───────────┘
        ↓              ↓              ↓              ↓
┌───────┼──────────────┼──────────────┼──────────────┼───────────┐
│                    BACKEND SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Firebase    │  │  Firestore   │  │   Storage    │        │
│  │  Functions   │  │  Database    │  │   (Images)   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow: Create Event

```
User Action: Click "Create Event"
     ↓
Navigate to /events/create
     ↓
Load KYC Status (API call)
     ↓
Initialize EventCreationWizard
     ↓
┌────────────────────────────────────────┐
│          STEP 1: BASIC DETAILS         │
├────────────────────────────────────────┤
│ User fills:                            │
│ - Title, Description                   │
│ - Genres, Languages                    │
│ - Age limit, Duration                  │
│ - Terms acceptance                     │
│                                        │
│ User uploads:                          │
│ - Wide cover photo ──→ uploadPhoto()  │
│ - Portrait cover photo ──→ uploadPhoto()│
│                                        │
│ Actions:                               │
│ - Save as Draft ──→ saveDraft()       │
│ - Next ──→ validateBasicDetails()     │
│         ↓ (if valid)                   │
│      Go to Step 2                      │
└────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────┐
│       STEP 2: EVENT SCHEDULE           │
├────────────────────────────────────────┤
│ User builds hierarchy:                 │
│                                        │
│ Location 1                             │
│   └→ Venue 1                           │
│       └→ Date 1                        │
│           └→ Show 1 (time)             │
│           └→ Show 2 (time)             │
│       └→ Date 2                        │
│           └→ Show 1 (time)             │
│   └→ Venue 2                           │
│       └→ ...                           │
│                                        │
│ Location 2                             │
│   └→ ...                               │
│                                        │
│ Actions:                               │
│ - Save as Draft ──→ saveDraft()       │
│ - Back ──→ Go to Step 1               │
│ - Next ──→ validateSchedule()         │
│         ↓ (if valid)                   │
│      Go to Step 3                      │
└────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────┐
│       STEP 3: TICKET DETAILS           │
├────────────────────────────────────────┤
│ For each venue with shows:             │
│                                        │
│ Venue 1 Tab:                           │
│   Ticket Type 1: Regular, ₹500, 100   │
│   Ticket Type 2: VIP, ₹1000, 50       │
│                                        │
│ Venue 2 Tab:                           │
│   Ticket Type 1: General, ₹300, 200   │
│                                        │
│ Actions:                               │
│ - Save as Draft ──→ saveDraft()       │
│ - Back ──→ Go to Step 2               │
│ - Host Event ──→ validateForHosting() │
│         ↓ (if valid)                   │
│      hostEvent()                       │
│         ↓                              │
│    ┌────┴────┐                         │
│    ↓         ↓                         │
│ Success   KYC Required                 │
│    ↓         ↓                         │
│ Dialog   Save as Draft                 │
└────────────────────────────────────────┘
```

## 🔄 State Transitions

```
┌─────────────┐
│  NOT_SAVED  │ (Initial state)
└──────┬──────┘
       │ User fills form
       ↓
┌─────────────┐
│   EDITING   │ (hasUnsavedChanges = true)
└──────┬──────┘
       │
       ├─────→ Cancel ─────→ Confirm Dialog ─────→ Leave
       │
       ├─────→ Save as Draft ─────→ saveDraft() ─────┐
       │                                              ↓
       │                                      ┌──────────────┐
       │                                      │    DRAFT     │
       │                                      │  (on server) │
       │                                      └──────────────┘
       │
       └─────→ Host Event ─────→ validateForHosting()
                                         │
                                    ┌────┴────┐
                                    ↓         ↓
                              Valid      Invalid
                                │           │
                                ↓           ↓
                          hostEvent()   Show Errors
                                │
                          ┌─────┴─────┐
                          ↓           ↓
                    KYC Verified  KYC Not Verified
                          │           │
                          ↓           ↓
                    ┌──────────┐  ┌──────────┐
                    │  HOSTED  │  │  DRAFT   │
                    │(Published)│  │(+Dialog) │
                    └──────────┘  └──────────┘
```

## 🗄️ Data Structure

### EventFormData Structure
```typescript
{
  // Step 1
  title: "Amazing Music Concert",
  description: "Join us for...",
  genres: ["Music", "Entertainment"],
  languages: ["English", "Hindi"],
  ageLimit: "18",
  duration: 120,
  durationUnit: "minutes",
  termsAccepted: true,
  coverPhotoWide: "https://storage/.../wide.jpg",
  coverPhotoPortrait: "https://storage/.../portrait.jpg",
  
  // Step 2
  locations: [
    {
      id: "loc_1",
      name: "Bangalore",
      venues: [
        {
          id: "venue_1",
          name: "Movigoo Hall",
          address: "123 MG Road, Bangalore",
          dates: [
            {
              id: "date_1",
              date: "2025-12-25",
              shows: [
                {
                  id: "show_1",
                  name: "Evening Show",
                  startTime: "19:00",
                  endTime: "21:00"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  
  // Metadata
  status: "draft" | "hosted",
  lastSaved: Date
}
```

### VenueTicketConfig Structure
```typescript
[
  {
    venueId: "venue_1",
    ticketTypes: [
      {
        id: "ticket_1",
        typeName: "Regular",
        price: 500,
        totalQuantity: 100
      },
      {
        id: "ticket_2",
        typeName: "VIP",
        price: 1000,
        totalQuantity: 50
      }
    ]
  }
]
```

## 🔐 API Request/Response Flow

### 1. Save Draft
```
Request:
POST /api/events/draft
Headers:
  x-session-id: abc123
  x-session-key: xyz789
Body:
  {
    formData: { ... },
    ticketConfigs: [ ... ]
  }

Response:
  {
    success: true,
    eventId: "evt_123",
    lastSaved: "2025-11-23T10:30:00Z"
  }
```

### 2. Host Event
```
Request:
POST /api/events/host
Headers:
  x-session-id: abc123
  x-session-key: xyz789
Body:
  {
    formData: { ... },
    ticketConfigs: [ ... ]
  }

Response (Success):
  {
    success: true,
    eventId: "evt_123",
    status: "hosted"
  }

Response (KYC Required):
  {
    success: false,
    status: "kyc_required",
    message: "KYC verification required"
  }

Response (Validation Error):
  {
    success: false,
    status: "draft",
    errors: [
      {
        field: "title",
        message: "Title already exists",
        step: 1
      }
    ]
  }
```

### 3. Load Event
```
Request:
GET /api/events/evt_123
Headers:
  x-session-id: abc123
  x-session-key: xyz789

Response:
  {
    formData: { ... },
    ticketConfigs: [ ... ]
  }
```

### 4. Upload Photo
```
Request:
POST /api/events/upload-photo
Headers:
  x-session-id: abc123
  x-session-key: xyz789
Body (FormData):
  file: (binary)
  type: "wide" | "portrait"

Response:
  {
    url: "https://storage.googleapis.com/.../photo.jpg"
  }
```

## 🎯 Validation Rules Summary

### Step 1 (Basic Details)
- ✅ Title: Required, 1-50 chars
- ✅ Description: Required, non-empty
- ✅ Genres: Min 1 selected
- ✅ Languages: Min 1 selected
- ✅ Age limit: Required, valid value
- ✅ Duration: Required, > 0
- ✅ Terms: Must be accepted
- ✅ Photos: Both wide & portrait required

### Step 2 (Schedule)
- ✅ Min 1 location
- ✅ Each location: Name required
- ✅ Each location: Min 1 venue
- ✅ Each venue: Name & address required
- ✅ Each venue: Min 1 date
- ✅ Each date: Date required
- ✅ Each date: Min 1 show
- ✅ Each show: Start & end time required
- ✅ Each show: End > Start

### Step 3 (Tickets)
- ✅ Each venue with shows: Min 1 ticket type
- ✅ Each ticket: Name required
- ✅ Each ticket: Price > 0
- ✅ Each ticket: Quantity > 0 & integer

### Draft Mode
- ✅ NO validation required
- ✅ Can save incomplete data
- ✅ Can save from any step

## 🚨 Error Handling

```
User submits → Validate → Errors?
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
                   Yes                No
                    │                 │
                    ↓                 ↓
          1. Set errors[]      Call API
          2. Find first error       │
          3. Switch to step    ┌────┴────┐
          4. Scroll to field   ↓         ↓
          5. Show toast    Success   Error
                               │         │
                               ↓         ↓
                          Update UI   Show error
                          Show dialog  Parse errors
                          Redirect    Update UI
```

## 📱 Responsive Breakpoints

```
Mobile (< 640px):
  - Single column layout
  - Stacked stepper
  - Full-width buttons
  - Vertical ticket table

Tablet (640px - 1024px):
  - 2-column layout (Step 1)
  - Side-by-side schedule
  - Compact stepper

Desktop (> 1024px):
  - 3-column layout (Step 2: 2/3 + 1/3)
  - Full stepper
  - Optimized spacing
  - Sticky summary sidebar
```

## 🎨 Component Hierarchy

```
EventCreationWizard
├── Header
│   ├── Title
│   ├── KYC Badge
│   └── Draft Status
├── Stepper
│   └── Steps[1,2,3]
├── Content (conditional)
│   ├── Step1BasicDetails
│   │   ├── FormFields
│   │   └── PhotoUploads
│   ├── Step2EventSchedule
│   │   ├── LocationCards[]
│   │   │   └── VenueCards[]
│   │   │       └── DateCards[]
│   │   │           └── ShowRows[]
│   │   └── ScheduleSummary (sidebar)
│   └── Step3TicketDetails
│       └── VenueTabs[]
│           └── TicketRows[]
├── Footer
│   ├── Cancel Button
│   ├── Save Draft Button
│   └── Navigation (Back/Next/Host)
└── Dialogs
    ├── CancelDialog
    ├── KycDialog
    └── SuccessDialog
```

---

**This architecture ensures**:
- ✅ Clear separation of concerns
- ✅ Reusable validation logic
- ✅ Easy to test components
- ✅ Simple backend integration
- ✅ Scalable for future features
