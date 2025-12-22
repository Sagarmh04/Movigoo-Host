"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save, AlertCircle, CheckCircle, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Step1BasicDetails from "./Step1BasicDetails";
import Step2EventSchedule from "./Step2EventSchedule";
import Step3TicketDetails from "./Step3TicketDetails";
import { EventFormData, VenueTicketConfig, ValidationError, KycStatus } from "@/lib/types/event";
import {
  validateBasicDetails,
  validateSchedule,
  validateTickets,
  validateForHosting,
  validateForDraft,
  scrollToFirstError,
} from "@/lib/validation/eventValidation";
import { toast } from "sonner";
import { saveEventDraft, hostEvent, fetchEvent, fetchTicketConfigs } from "@/lib/api/events";

interface EventCreationWizardProps {
  eventId?: string; // For editing existing events
  kycStatus: KycStatus;
}

const STEPS = [
  { id: 1, label: "Basic Details" },
  { id: 2, label: "Event Schedule" },
  { id: 3, label: "Ticket Details" },
];

export default function EventCreationWizard({ eventId, kycStatus }: EventCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<EventFormData>>({
    title: "",
    description: "",
    genres: [],
    languages: [],
    ageLimit: "",
    duration: 0,
    durationUnit: "minutes",
    termsAccepted: false,
    coverPhotoWide: "",
    coverPhotoPortrait: "",
    locations: [],
    status: "draft",
    lastSaved: null,
  });
  const [ticketConfigs, setTicketConfigs] = useState<VenueTicketConfig[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showKycDialog, setShowKycDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  const isEditMode = !!eventId;
  const pageTitle = isEditMode ? "Edit Event" : "Create Event";

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData, ticketConfigs]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load existing event data if editing
  useEffect(() => {
    if (eventId) {
      const loadEvent = async () => {
        setIsLoadingEvent(true);
        try {
          const eventData = await fetchEvent(eventId);
          const ticketData = await fetchTicketConfigs(eventId);
          
          if (eventData) {
            setFormData(eventData);
            setHasUnsavedChanges(false);
          }
          
          if (ticketData.length > 0) {
            setTicketConfigs(ticketData);
          }
        } catch (error) {
          console.error("Error loading event:", error);
          toast.error("Failed to load event data");
        } finally {
          setIsLoadingEvent(false);
        }
      };
      
      loadEvent();
    }
  }, [eventId]);

  const handleFormChange = (updates: Partial<EventFormData>) => {
    setFormData({ ...formData, ...updates });
  };

  const handleTicketConfigChange = (configs: VenueTicketConfig[]) => {
    setTicketConfigs(configs);
  };

  const handleSaveAsDraft = async () => {
    setIsSaving(true);
    setErrors([]);

    try {
      // Validate for draft (minimal validation)
      const draftErrors = validateForDraft(formData);
      if (draftErrors.length > 0) {
        setErrors(draftErrors);
        scrollToFirstError(draftErrors);
        toast.error("Please fix validation errors");
        return;
      }

      // Call backend API to save draft
      const result = await saveEventDraft(formData, ticketConfigs, eventId);
      const savedEventId = result.eventId;

      setFormData({
        ...formData,
        status: "draft",
        lastSaved: new Date(),
      });
      setHasUnsavedChanges(false);

      toast.success("Draft saved successfully");

      // Redirect to edit URL if it's a new event
      if (!eventId) {
        router.push(`/events/${savedEventId}/edit`);
      }
    } catch (error) {
      console.error("[PLACEHOLDER] Error saving draft:", error);
      toast.error("Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    setErrors([]);

    // Validate current step
    let stepErrors: ValidationError[] = [];

    if (currentStep === 1) {
      stepErrors = validateBasicDetails(formData);
    } else if (currentStep === 2) {
      stepErrors = validateSchedule(formData);
    }

    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      scrollToFirstError(stepErrors);
      toast.error(`Please fix errors in ${STEPS[currentStep - 1].label}`);
      return;
    }

    // Move to next step
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      router.push("/");
    }
  };

  const handleHostEvent = async () => {
    setIsHosting(true);
    setErrors([]);

    try {
      // Validate all steps
      const allErrors = validateForHosting(formData, ticketConfigs);

      if (allErrors.length > 0) {
        setErrors(allErrors);
        
        // Find the step with the first error
        const firstErrorStep = allErrors[0].step || 1;
        setCurrentStep(firstErrorStep);
        
        scrollToFirstError(allErrors);
        toast.error("Please fix all validation errors before hosting");
        return;
      }

      // Call backend API to host event
      const result = await hostEvent(formData, ticketConfigs, eventId);
      
      // Handle KYC not verified
      if (result.status === "kyc_required") {
        setShowKycDialog(true);
        setFormData({
          ...formData,
          status: "draft",
          lastSaved: new Date(),
        });
        setHasUnsavedChanges(false);
        return;
      }
      
      // Handle validation errors
      if (!result.success && result.errors && result.errors.length > 0) {
        setErrors(result.errors);
        const firstErrorStep = result.errors[0].step || 1;
        setCurrentStep(firstErrorStep);
        scrollToFirstError(result.errors);
        toast.error("Please fix validation errors before hosting");
        return;
      }
      
      // Success!
      if (result.success) {
        setFormData({
          ...formData,
          status: "hosted",
          lastSaved: new Date(),
        });
        setHasUnsavedChanges(false);
        setShowSuccessDialog(true);
      }

    } catch (error) {
      console.error("[PLACEHOLDER] Error hosting event:", error);
      
      // Handle session expiration
      if ((error as any).code === "UNAUTHORIZED") {
        toast.error("Your session has expired. Please log in again.");
        router.push("/login");
        return;
      }

      toast.error("Failed to host event. Please try again.");
    } finally {
      setIsHosting(false);
    }
  };

  const getKycBadge = () => {
    switch (kycStatus) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            KYC: Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            KYC: Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            KYC: Required
          </Badge>
        );
    }
  };

  const getDraftStatusText = () => {
    if (!formData.lastSaved) return "Not saved yet";
    
    const now = new Date();
    const lastSaved = new Date(formData.lastSaved);
    const diffMinutes = Math.floor((now.getTime() - lastSaved.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return "Draft (saved just now)";
    if (diffMinutes === 1) return "Draft (autosaved 1 min ago)";
    return `Draft (autosaved ${diffMinutes} min ago)`;
  };

  // Show loading state while fetching event data
  if (isEditMode && isLoadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading event data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
            
            <div className="flex items-center gap-3">
              {getKycBadge()}
              
              {formData.status === "draft" && (
                <Badge variant="outline">{getDraftStatusText()}</Badge>
              )}
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center pb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep > step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <div className="ml-2 text-sm font-medium">
                  <div
                    className={
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-20 h-0.5 mx-4 ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert (if errors from backend) */}
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              Please fix the highlighted errors below to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <Step1BasicDetails data={formData} onChange={handleFormChange} errors={errors} />
        )}

        {currentStep === 2 && (
          <Step2EventSchedule data={formData} onChange={handleFormChange} errors={errors} />
        )}

        {currentStep === 3 && (
          <Step3TicketDetails
            data={formData}
            ticketConfigs={ticketConfigs}
            onChange={handleTicketConfigChange}
            errors={errors}
          />
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t bg-white fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving || isHosting}>
              Cancel
            </Button>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleSaveAsDraft}
                disabled={isSaving || isHosting}
              >
                {isSaving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>

              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={isSaving || isHosting}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep < 3 && (
                <Button onClick={handleNext} disabled={isSaving || isHosting}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {currentStep === 3 && (
                <Button onClick={handleHostEvent} disabled={isSaving || isHosting}>
                  {isHosting ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      Hosting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Host Event
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Do you want to save them as a draft before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Stay
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCancelDialog(false);
                handleSaveAsDraft().then(() => router.push("/"));
              }}
            >
              Save as Draft & Leave
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowCancelDialog(false);
                router.push("/");
              }}
            >
              Leave without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Required Dialog */}
      <Dialog open={showKycDialog} onOpenChange={setShowKycDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KYC Verification Required</DialogTitle>
            <DialogDescription>
              You can save drafts, but to host an event you must complete KYC verification. Your changes
              have been saved as a draft.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKycDialog(false)}>
              Close
            </Button>
            <Button onClick={() => router.push("/?tab=profile")}>
              Go to KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Event Hosted Successfully!</DialogTitle>
            <DialogDescription className="text-center">
              Your event has been published and is now live on the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                router.push("/");
              }}
              className="w-full"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                // TODO: Navigate to event preview/detail page
                router.push(`/events/${eventId || "new-id"}`);
              }}
              className="w-full"
            >
              View Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spacer for fixed footer */}
      <div className="h-24" />
    </div>
  );
}
