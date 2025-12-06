# Event Creation System - Implementation Guide

## 📋 Overview

A complete 3-step event creation wizard for Movigoo Host platform with comprehensive validation, draft saving, and backend integration placeholders.

## 🗂️ File Structure

```
host/
├── app/
│   └── events/
│       ├── create/
│       │   └── page.tsx                    # Create new event page
│       └── [eventId]/
│           └── edit/
│               └── page.tsx                # Edit existing event page
├── components/
│   ├── events/
│   │   ├── EventCreationWizard.tsx        # Main wizard orchestrator
│   │   ├── Step1BasicDetails.tsx         # Step 1: Event info & photos
│   │   ├── Step2EventSchedule.tsx        # Step 2: Locations, venues, dates
│   │   └── Step3TicketDetails.tsx        # Step 3: Ticket configuration
│   └── tabs/
│       └── EventListingsTab.tsx           # Event listings with create button
└── lib/
    ├── types/
    │   └── event.ts                       # TypeScript interfaces
    └── validation/
        └── eventValidation.ts             # Validation logic
```

## 🎯 Features Implemented

### ✅ Step 1: Basic Details
- Event title with character counter (max 50)
- Rich description textarea
- Multi-select genres and languages (pill UI)
- Age limit dropdown
- Duration with unit selector (minutes/hours)
- Terms & conditions checkbox
- Dual cover photo uploads (wide 16:9, portrait 9:16)
- Real-time validation with error messages
- File upload simulation (needs backend integration)

### ✅ Step 2: Event Schedule
- Hierarchical structure: Locations → Venues → Dates → Shows
- Collapsible location cards
- Add/remove any level with confirmation dialogs
- Default initialization (1 location, 1 venue, 1 date, 1 show)
- Live schedule summary sidebar
- Date picker and time inputs
- Validation for all required fields

### ✅ Step 3: Ticket Details
- Automatic venue tabs (one per venue with shows)
- Dynamic ticket type rows per venue
- Price input with ₹ symbol
- Quantity validation (positive integers)
- Single venue: simple layout
- Multiple venues: tabbed interface
- Error indicators on venue tabs

### ✅ Wizard Orchestration
- Progress stepper with visual feedback
- KYC status badge (verified/pending/required)
- Draft autosave status display
- Navigation: Back, Next, Cancel
- Save as Draft (any step, no validation)
- Host Event (final step, full validation)
- Unsaved changes detection & warning
- Session expiration handling
- Multiple dialog flows (cancel, KYC, success)

### ✅ Validation System
- Step-by-step validation
- All-steps validation for hosting
- Scroll to first error
- Field-level error highlighting
- Backend error mapping support
- Draft mode (no validation)

## 🔌 Backend Integration Points

### APIs to Implement

#### 1. **KYC Status Check**
```typescript
// GET /api/host/getKycStatus or use existing function
Response: { status: "verified" | "pending" | "not_started" | "rejected" }
```

#### 2. **Save Draft**
```typescript
// POST /api/events/draft or /api/events/:eventId/draft
Body: {
  formData: EventFormData,
  ticketConfigs: VenueTicketConfig[]
}
Response: {
  success: boolean,
  eventId: string,
  lastSaved: Date
}
```

#### 3. **Host Event**
```typescript
// POST /api/events/host or /api/events/:eventId/host
Body: {
  formData: EventFormData,
  ticketConfigs: VenueTicketConfig[]
}
Response: {
  success: boolean,
  eventId?: string,
  status: "hosted" | "draft" | "kyc_required",
  message?: string,
  errors?: ValidationError[]
}
```

#### 4. **Load Event for Editing**
```typescript
// GET /api/events/:eventId
Response: {
  formData: EventFormData,
  ticketConfigs: VenueTicketConfig[]
}
```

#### 5. **Upload Photos**
```typescript
// POST /api/events/upload-photo
Body: FormData with file
Response: {
  url: string // Firebase Storage URL or CDN URL
}
```

#### 6. **List Events**
```typescript
// GET /api/events/list
Response: {
  events: EventFormData[]
}
```

## 🔧 Integration Steps

### 1. Update EventCreationWizard.tsx

**Replace placeholder in `handleSaveAsDraft`:**
```typescript
// Around line 145
try {
  const response = await fetch("/api/events/draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ formData, ticketConfigs }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || "Failed to save draft");
  }
  
  setFormData({
    ...formData,
    status: "draft",
    lastSaved: new Date(data.lastSaved),
  });
  
  toast.success("Draft saved successfully");
  
  if (!eventId) {
    router.push(`/events/${data.eventId}/edit`);
  }
} catch (error) {
  console.error("Error saving draft:", error);
  toast.error("Failed to save draft. Please try again.");
}
```

**Replace placeholder in `handleHostEvent`:**
```typescript
// Around line 190
try {
  const response = await fetch("/api/events/host", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ formData, ticketConfigs }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    if (data.status === "kyc_required") {
      setShowKycDialog(true);
      setFormData({
        ...formData,
        status: "draft",
        lastSaved: new Date(),
      });
      return;
    }
    
    if (data.errors) {
      setErrors(data.errors);
      const firstErrorStep = data.errors[0].step || 1;
      setCurrentStep(firstErrorStep);
      scrollToFirstError(data.errors);
      toast.error("Please fix validation errors");
      return;
    }
    
    throw new Error(data.message || "Failed to host event");
  }
  
  setFormData({
    ...formData,
    status: "hosted",
    lastSaved: new Date(),
  });
  setShowSuccessDialog(true);
} catch (error) {
  if ((error as any).code === "UNAUTHORIZED") {
    toast.error("Your session has expired. Please log in again.");
    router.push("/login");
    return;
  }
  
  toast.error("Failed to host event. Please try again.");
}
```

**Load event for editing:**
```typescript
// In useEffect around line 85
useEffect(() => {
  if (eventId) {
    const loadEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();
        
        if (response.ok) {
          setFormData(data.formData);
          setTicketConfigs(data.ticketConfigs);
        }
      } catch (error) {
        console.error("Error loading event:", error);
        toast.error("Failed to load event");
      }
    };
    
    loadEvent();
  }
}, [eventId]);
```

### 2. Update Step1BasicDetails.tsx

**Replace file upload in `handleFileUpload`:**
```typescript
// Around line 65
const handleFileUpload = async (file: File, type: "wide" | "portrait") => {
  const setUploading = type === "wide" ? setUploadingWide : setUploadingPortrait;
  
  setUploading(true);
  
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    
    const response = await fetch("/api/events/upload-photo", {
      method: "POST",
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }
    
    if (type === "wide") {
      onChange({ ...data, coverPhotoWide: data.url });
    } else {
      onChange({ ...data, coverPhotoPortrait: data.url });
    }
    
    toast.success(`${type} photo uploaded successfully`);
  } catch (error) {
    console.error("Upload error:", error);
    toast.error("Upload failed, please try again");
  } finally {
    setUploading(false);
  }
};
```

### 3. Update EventListingsTab.tsx

**Fetch events:**
```typescript
// Around line 12
const [events, setEvents] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events/list");
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchEvents();
}, []);
```

### 4. Update page routes

Both `app/events/create/page.tsx` and `app/events/[eventId]/edit/page.tsx` need KYC fetch:

```typescript
// Replace in useEffect
const response = await fetch("/api/host/getKycStatus");
const data = await response.json();

if (response.ok) {
  setKycStatus(data.status);
} else {
  setKycStatus("not_started");
}
```

## 🧪 Testing Checklist

### Draft Functionality
- [ ] Save draft from Step 1 (incomplete data)
- [ ] Save draft from Step 2 (incomplete data)
- [ ] Save draft from Step 3 (incomplete data)
- [ ] Draft timestamp updates correctly
- [ ] Navigate away with unsaved changes (warning dialog)
- [ ] Load existing draft for editing

### Validation Testing
- [ ] Step 1: All required fields validated
- [ ] Step 1: Character limit on title enforced
- [ ] Step 1: Photo uploads required
- [ ] Step 2: Location name required
- [ ] Step 2: At least one venue required
- [ ] Step 2: Venue name and address required
- [ ] Step 2: At least one date required
- [ ] Step 2: At least one show required per date
- [ ] Step 2: Show times required
- [ ] Step 2: End time after start time
- [ ] Step 3: At least one ticket type per venue
- [ ] Step 3: Ticket name required
- [ ] Step 3: Price > 0 required
- [ ] Step 3: Quantity > 0 and integer required
- [ ] Scroll to first error works
- [ ] Error highlighting works

### KYC Scenarios
- [ ] KYC verified: Allow hosting
- [ ] KYC pending: Show dialog, save as draft
- [ ] KYC not started: Show dialog, save as draft
- [ ] KYC rejected: Show dialog, save as draft

### Edge Cases
- [ ] Delete location with venues/dates/shows
- [ ] Delete venue with dates/shows/tickets
- [ ] Delete date with shows
- [ ] Delete show (last show on date)
- [ ] Navigate back from Step 3 to Step 1
- [ ] Multiple locations/venues work correctly
- [ ] Single location/venue UI is simple
- [ ] Multi-venue ticket tabs work
- [ ] Backend validation errors display correctly
- [ ] Session expiration redirects to login

### UI/UX
- [ ] Stepper shows current step correctly
- [ ] Stepper marks completed steps
- [ ] KYC badge shows correct status
- [ ] Draft status displays time correctly
- [ ] Loading states work (spinners)
- [ ] Success dialog works
- [ ] Cancel dialog works
- [ ] Toast notifications appear
- [ ] Responsive on mobile
- [ ] Unsaved changes warning on browser close

## 🎨 UI Components Used

All components from shadcn/ui:
- Button
- Input
- Textarea
- Label
- Select
- Checkbox
- Badge
- Card
- Dialog
- Alert
- Tabs
- Toaster (sonner)

Icons from `lucide-react`

## 🔐 Security Considerations

1. **Session Management**: All API calls should include session authentication
2. **File Upload**: Validate file types and sizes on backend
3. **Input Sanitization**: Sanitize all text inputs on backend
4. **Rate Limiting**: Implement rate limits on draft save and host endpoints
5. **Authorization**: Verify user owns the event before edit/delete
6. **XSS Prevention**: Escape user content when displaying

## 📝 Notes

- All backend integration points are marked with `// TODO:` or `// PLACEHOLDER:`
- All console.logs with `[PLACEHOLDER]` prefix should be removed after integration
- Toast notifications use `sonner` library
- File uploads create local preview URLs - replace with actual storage URLs
- Event ID generation is placeholder - backend should return actual IDs
- Consider adding image compression before upload
- Consider adding event status transitions (draft → pending → hosted)
- Consider adding email notifications for status changes

## 🚀 Next Steps

1. Create backend API endpoints
2. Replace placeholder API calls
3. Test each integration point
4. Add Firebase Storage for photos
5. Add real-time draft autosave (optional)
6. Add event preview before hosting
7. Add event analytics dashboard
8. Add bulk operations (delete multiple events)
9. Add event duplication feature
10. Add export event data feature

## 🐛 Known Issues / Future Enhancements

- [ ] Photo preview uses `URL.createObjectURL` (memory leak potential)
- [ ] No image compression before upload
- [ ] No drag-and-drop reordering for shows/tickets
- [ ] No event templates
- [ ] No recurring event support
- [ ] No event cloning
- [ ] No bulk ticket operations
- [ ] No venue search/autocomplete
- [ ] No map integration for venues
- [ ] No rich text editor for description

## 📞 Support

For backend integration help, refer to:
- Repository instructions: `/.github/copilot-instructions.md`
- Firebase functions: `/functions/src/`
- Existing API patterns: `/functions/src/host/`

---

**Created**: November 23, 2025  
**Status**: ✅ Frontend Complete - Awaiting Backend Integration
