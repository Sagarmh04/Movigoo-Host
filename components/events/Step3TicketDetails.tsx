"use client";

import { useState } from "react";
import { Plus, Trash2, IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventFormData, VenueTicketConfig, TicketType, ValidationError } from "@/lib/types/event";

interface Step3TicketDetailsProps {
  data: Partial<EventFormData>;
  ticketConfigs: VenueTicketConfig[];
  onChange: (configs: VenueTicketConfig[]) => void;
  errors: ValidationError[];
}

export default function Step3TicketDetails({
  data,
  ticketConfigs,
  onChange,
  errors,
}: Step3TicketDetailsProps) {
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Get all venues from locations
  const allVenues = (data.locations || []).flatMap((location) =>
    location.venues.map((venue) => ({
      ...venue,
      locationName: location.name,
      hasShows: venue.dates.some((date) => date.shows.length > 0),
    }))
  );

  // Filter to only venues with shows
  const venuesWithShows = allVenues.filter((v) => v.hasShows);

  // Initialize ticket configs for all venues with shows
  const ensureTicketConfig = (venueId: string): VenueTicketConfig => {
    let config = ticketConfigs.find((tc) => tc.venueId === venueId);
    if (!config) {
      config = {
        venueId,
        ticketTypes: [
          {
            id: generateId(),
            typeName: "",
            price: 0,
            totalQuantity: 0,
          },
        ],
      };
      onChange([...ticketConfigs, config]);
    }
    return config;
  };

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const updateTicketConfig = (venueId: string, ticketTypes: TicketType[]) => {
    const updatedConfigs = ticketConfigs.map((config) =>
      config.venueId === venueId ? { ...config, ticketTypes } : config
    );

    if (!ticketConfigs.find((tc) => tc.venueId === venueId)) {
      updatedConfigs.push({ venueId, ticketTypes });
    }

    onChange(updatedConfigs);
  };

  const addTicketType = (venueId: string) => {
    const config = ensureTicketConfig(venueId);
    const newTicket: TicketType = {
      id: generateId(),
      typeName: "",
      price: 0,
      totalQuantity: 0,
    };
    updateTicketConfig(venueId, [...config.ticketTypes, newTicket]);
  };

  const updateTicket = (venueId: string, ticketId: string, updates: Partial<TicketType>) => {
    const config = ensureTicketConfig(venueId);
    const updatedTickets = config.ticketTypes.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, ...updates } : ticket
    );
    updateTicketConfig(venueId, updatedTickets);
  };

  const deleteTicket = (venueId: string, ticketId: string) => {
    const config = ensureTicketConfig(venueId);
    const updatedTickets = config.ticketTypes.filter((ticket) => ticket.id !== ticketId);
    updateTicketConfig(venueId, updatedTickets);
  };

  // If no venues with shows, show message
  if (venuesWithShows.length === 0) {
    return (
      <Alert>
        <AlertTitle>No venues with shows</AlertTitle>
        <AlertDescription>
          Add at least one venue with schedule in Step 2 before configuring tickets.
        </AlertDescription>
      </Alert>
    );
  }

  // For a single venue, show simple layout
  if (venuesWithShows.length === 1) {
    const venue = venuesWithShows[0];
    const config = ensureTicketConfig(venue.id);
    const configError = getError(`ticketConfig[${venue.id}]`);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">
            {venue.locationName} – {venue.name}
          </h3>
          <p className="text-sm text-muted-foreground">Set ticket types and prices for this venue.</p>
        </div>

        {configError && (
          <Alert variant="destructive">
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                <div className="col-span-4">Ticket Type Name</div>
                <div className="col-span-3">Price (₹)</div>
                <div className="col-span-3">Total Tickets</div>
                <div className="col-span-2">Actions</div>
              </div>

              {/* Ticket Rows */}
              {config.ticketTypes.map((ticket, index) => (
                <div key={ticket.id} className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-4" data-field={`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`}>
                    <Input
                      placeholder="e.g., Regular, VIP, Student"
                      value={ticket.typeName}
                      onChange={(e) =>
                        updateTicket(venue.id, ticket.id, { typeName: e.target.value })
                      }
                      className={
                        getError(`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`)
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`) && (
                      <p className="text-xs text-red-500 mt-1">
                        {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-3" data-field={`ticketConfig[${venue.id}].ticketTypes[${index}].price`}>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={ticket.price || ""}
                        onChange={(e) =>
                          updateTicket(venue.id, ticket.id, { price: parseFloat(e.target.value) || 0 })
                        }
                        className={`pl-9 ${
                          getError(`ticketConfig[${venue.id}].ticketTypes[${index}].price`)
                            ? "border-red-500"
                            : ""
                        }`}
                      />
                    </div>
                    {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].price`) && (
                      <p className="text-xs text-red-500 mt-1">
                        {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].price`)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-3" data-field={`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`}>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="100"
                      value={ticket.totalQuantity || ""}
                      onChange={(e) =>
                        updateTicket(venue.id, ticket.id, {
                          totalQuantity: parseInt(e.target.value) || 0,
                        })
                      }
                      className={
                        getError(`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`)
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`) && (
                      <p className="text-xs text-red-500 mt-1">
                        {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    {config.ticketTypes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTicket(venue.id, ticket.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={() => addTicketType(venue.id)} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Ticket Type
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For multiple venues, use tabs
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Ticket Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Set ticket types and prices for each venue. Switch between tabs to configure different venues.
        </p>
      </div>

      <Tabs defaultValue={venuesWithShows[0]?.id} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent">
          {venuesWithShows.map((venue) => {
            const hasError = errors.some((e) => e.field.includes(`ticketConfig[${venue.id}]`));
            return (
              <TabsTrigger
                key={venue.id}
                value={venue.id}
                className={`data-[state=active]:bg-background ${
                  hasError ? "border-b-2 border-red-500" : ""
                }`}
              >
                {venue.locationName} – {venue.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {venuesWithShows.map((venue) => {
          const config = ensureTicketConfig(venue.id);
          const configError = getError(`ticketConfig[${venue.id}]`);

          return (
            <TabsContent key={venue.id} value={venue.id} className="space-y-4">
              {configError && (
                <Alert variant="destructive">
                  <AlertDescription>{configError}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                      <div className="col-span-4">Ticket Type Name</div>
                      <div className="col-span-3">Price (₹)</div>
                      <div className="col-span-3">Total Tickets</div>
                      <div className="col-span-2">Actions</div>
                    </div>

                    {/* Ticket Rows */}
                    {config.ticketTypes.map((ticket, index) => (
                      <div key={ticket.id} className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-4" data-field={`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`}>
                          <Input
                            placeholder="e.g., Regular, VIP, Student"
                            value={ticket.typeName}
                            onChange={(e) =>
                              updateTicket(venue.id, ticket.id, { typeName: e.target.value })
                            }
                            className={
                              getError(`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`)
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`) && (
                            <p className="text-xs text-red-500 mt-1">
                              {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].typeName`)}
                            </p>
                          )}
                        </div>

                        <div className="col-span-3" data-field={`ticketConfig[${venue.id}].ticketTypes[${index}].price`}>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={ticket.price || ""}
                              onChange={(e) =>
                                updateTicket(venue.id, ticket.id, {
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className={`pl-9 ${
                                getError(`ticketConfig[${venue.id}].ticketTypes[${index}].price`)
                                  ? "border-red-500"
                                  : ""
                              }`}
                            />
                          </div>
                          {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].price`) && (
                            <p className="text-xs text-red-500 mt-1">
                              {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].price`)}
                            </p>
                          )}
                        </div>

                        <div className="col-span-3" data-field={`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`}>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="100"
                            value={ticket.totalQuantity || ""}
                            onChange={(e) =>
                              updateTicket(venue.id, ticket.id, {
                                totalQuantity: parseInt(e.target.value) || 0,
                              })
                            }
                            className={
                              getError(`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`)
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`) && (
                            <p className="text-xs text-red-500 mt-1">
                              {getError(`ticketConfig[${venue.id}].ticketTypes[${index}].totalQuantity`)}
                            </p>
                          )}
                        </div>

                        <div className="col-span-2">
                          {config.ticketTypes.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTicket(venue.id, ticket.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      onClick={() => addTicketType(venue.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Ticket Type
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
