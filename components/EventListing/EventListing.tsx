"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Step1BasicDetails from "./Step1BasicDetails";
import Step2EventDetails from "./Step2EventDetails";
import Step3TicketSetup from "./Step3TicketSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Form } from "@/components/ui/form";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Zod schema for the complete event form
const eventFormSchema = z.object({
  // Step 1: Basic Details
  title: z.string().min(1, "Event title is required").max(50, "Event title must be 50 characters or less"),
  coverWide: z.union([z.instanceof(File), z.string()]).refine((val) => val !== undefined && (val instanceof File || (typeof val === "string" && val.length > 0)), {
    message: "Cover photo (wide) is required",
  }),
  coverPortrait: z.union([z.instanceof(File), z.string()]).refine((val) => val !== undefined && (val instanceof File || (typeof val === "string" && val.length > 0)), {
    message: "Portrait photo is required",
  }),
  genre: z.string().min(1, "Genre is required"),
  language: z.string().min(1, "Language is required"),
  ageLimit: z.string().min(1, "Age limit is required"),
  duration: z.string().min(1, "Duration is required"),
  terms: z.string().min(1, "Terms & Conditions are required"),

  // Step 2: Event Details
  locations: z.array(
    z.object({
      venue: z.string().min(1, "Venue name is required"),
      address: z.string().min(1, "Address is required"),
      city: z.string().min(1, "City is required"),
      mapLink: z.string().optional(),
    })
  ).min(1, "At least one location is required"),

  schedules: z.array(
    z.object({
      startDate: z.string().min(1, "Start date is required"),
      startTime: z.string().min(1, "Start time is required"),
      endTime: z.string().min(1, "End time is required"),
    })
  ).min(1, "At least one schedule is required"),

  // Step 3: Ticket Setup
  tickets: z.array(
    z.object({
      name: z.string().min(1, "Ticket name is required"),
      price: z.string().min(1, "Price is required"),
      quantity: z.string().min(1, "Quantity is required"),
      description: z.string().optional(),
    })
  ).min(1, "At least one ticket type is required"),
});

export type EventFormData = z.infer<typeof eventFormSchema>;

interface EventListingProps {
  onSubmit?: (data: EventFormData) => void;
}

export default function EventListing({ onSubmit }: EventListingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Initialize form with default values
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      genre: "",
      language: "",
      ageLimit: "",
      duration: "",
      terms: "",
      locations: [{ venue: "", address: "", city: "", mapLink: "" }],
      schedules: [{ startDate: "", startTime: "", endTime: "" }],
      tickets: [{ name: "", price: "", quantity: "", description: "" }],
    },
    mode: "onChange",
  });

  const { handleSubmit, trigger, formState: { errors } } = form;

  // Handle next step with validation
  const handleNext = async () => {
    let fieldsToValidate: (keyof EventFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["title", "coverWide", "coverPortrait", "genre", "language", "ageLimit", "duration", "terms"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["locations", "schedules"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form submission
  const onSubmitForm = async (data: EventFormData) => {
    // Convert form data to final JSON structure
    const eventData = {
      title: data.title,
      coverWide: data.coverWide instanceof File ? data.coverWide.name : data.coverWide, // In production, you'd upload and get URL
      coverPortrait: data.coverPortrait instanceof File ? data.coverPortrait.name : data.coverPortrait, // In production, you'd upload and get URL
      genre: data.genre,
      language: data.language,
      ageLimit: data.ageLimit,
      duration: data.duration,
      terms: data.terms,
      locations: data.locations.map((loc) => ({
        venue: loc.venue,
        address: loc.address,
        city: loc.city,
        mapLink: loc.mapLink || "",
      })),
      schedules: data.schedules.map((sched) => ({
        startDate: sched.startDate,
        startTime: sched.startTime,
        endTime: sched.endTime,
      })),
      tickets: data.tickets.map((ticket) => ({
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
        description: ticket.description || "",
      })),
    };

    console.log("Event JSON:", JSON.stringify(eventData, null, 2));
    
    if (onSubmit) {
      onSubmit(data);
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Event</CardTitle>
          <div className="mt-4">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
              {/* Step 1: Basic Details */}
              {currentStep === 1 && <Step1BasicDetails form={form} />}

              {/* Step 2: Event Details */}
              {currentStep === 2 && <Step2EventDetails form={form} />}

              {/* Step 3: Ticket Setup */}
              {currentStep === 3 && <Step3TicketSetup form={form} />}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="flex items-center gap-2">
                  Submit Event
                </Button>
              )}
            </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
