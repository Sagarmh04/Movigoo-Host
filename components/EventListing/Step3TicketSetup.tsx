"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { EventFormData } from "./EventListing";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Ticket } from "lucide-react";

interface Step3TicketSetupProps {
  form: UseFormReturn<EventFormData>;
}

export default function Step3TicketSetup({ form }: Step3TicketSetupProps) {
  // Field array for dynamic tickets
  const {
    fields: ticketFields,
    append: appendTicket,
    remove: removeTicket,
  } = useFieldArray({
    control: form.control,
    name: "tickets",
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Ticket Setup</h2>
        <p className="text-sm text-muted-foreground">
          Create ticket types for your event. You can add multiple ticket types with different prices.
        </p>
      </div>

      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Ticket Types
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendTicket({ name: "", price: "", quantity: "", description: "" })
              }
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Ticket
            </Button>
          </div>

          {ticketFields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Ticket Type {index + 1}</CardTitle>
                  {ticketFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTicket(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name={`tickets.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., VIP, Regular, Early Bird"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a descriptive name for this ticket type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`tickets.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Price per ticket</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`tickets.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Available *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="1"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Total tickets available</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`tickets.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter additional details about this ticket type"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  );
}
