"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, MapPin, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventFormData, EventLocation, EventVenue, EventDate, EventShow, ValidationError } from "@/lib/types/event";

interface Step2EventScheduleProps {
  data: Partial<EventFormData>;
  onChange: (data: Partial<EventFormData>) => void;
  errors: ValidationError[];
}

export default function Step2EventSchedule({ data, onChange, errors }: Step2EventScheduleProps) {
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set([data.locations?.[0]?.id || ""]));
  const [deleteDialog, setDeleteDialog] = useState<{
    type: "location" | "venue" | "date" | "show";
    locationId?: string;
    venueId?: string;
    dateId?: string;
    showId?: string;
  } | null>(null);

  const locations = data.locations || [];

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Location operations
  const addLocation = () => {
    const newLocation: EventLocation = {
      id: generateId(),
      name: "",
      venues: [createDefaultVenue()],
    };
    onChange({ ...data, locations: [...locations, newLocation] });
    setExpandedLocations(new Set([...Array.from(expandedLocations), newLocation.id]));
  };

  const updateLocation = (locationId: string, updates: Partial<EventLocation>) => {
    const updatedLocations = locations.map((loc) =>
      loc.id === locationId ? { ...loc, ...updates } : loc
    );
    onChange({ ...data, locations: updatedLocations });
  };

  const deleteLocation = (locationId: string) => {
    const updatedLocations = locations.filter((loc) => loc.id !== locationId);
    onChange({ ...data, locations: updatedLocations });
    setDeleteDialog(null);
  };

  // Venue operations
  const createDefaultVenue = (): EventVenue => ({
    id: generateId(),
    name: "",
    address: "",
    dates: [createDefaultDate()],
  });

  const addVenue = (locationId: string) => {
    updateLocation(locationId, {
      venues: [
        ...locations.find((loc) => loc.id === locationId)!.venues,
        createDefaultVenue(),
      ],
    });
  };

  const updateVenue = (locationId: string, venueId: string, updates: Partial<EventVenue>) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const updatedVenues = location.venues.map((venue) =>
      venue.id === venueId ? { ...venue, ...updates } : venue
    );
    updateLocation(locationId, { venues: updatedVenues });
  };

  const deleteVenue = (locationId: string, venueId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const updatedVenues = location.venues.filter((venue) => venue.id !== venueId);
    updateLocation(locationId, { venues: updatedVenues });
    setDeleteDialog(null);
  };

  // Date operations
  const createDefaultDate = (): EventDate => ({
    id: generateId(),
    date: "",
    shows: [createDefaultShow()],
  });

  const addDate = (locationId: string, venueId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const venue = location.venues.find((v) => v.id === venueId);
    if (!venue) return;

    updateVenue(locationId, venueId, {
      dates: [...venue.dates, createDefaultDate()],
    });
  };

  const updateDate = (locationId: string, venueId: string, dateId: string, updates: Partial<EventDate>) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const venue = location.venues.find((v) => v.id === venueId);
    if (!venue) return;

    const updatedDates = venue.dates.map((date) =>
      date.id === dateId ? { ...date, ...updates } : date
    );
    updateVenue(locationId, venueId, { dates: updatedDates });
  };

  const deleteDate = (locationId: string, venueId: string, dateId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const venue = location.venues.find((v) => v.id === venueId);
    if (!venue) return;

    const updatedDates = venue.dates.filter((date) => date.id !== dateId);
    updateVenue(locationId, venueId, { dates: updatedDates });
    setDeleteDialog(null);
  };

  // Show operations
  const createDefaultShow = (): EventShow => ({
    id: generateId(),
    name: "",
    startTime: "",
    endTime: "",
  });

  const addShow = (locationId: string, venueId: string, dateId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const venue = location.venues.find((v) => v.id === venueId);
    if (!venue) return;

    const date = venue.dates.find((d) => d.id === dateId);
    if (!date) return;

    updateDate(locationId, venueId, dateId, {
      shows: [...date.shows, createDefaultShow()],
    });
  };

  const updateShow = (
    locationId: string,
    venueId: string,
    dateId: string,
    showId: string,
    updates: Partial<EventShow>
  ) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const venue = location.venues.find((v) => v.id === venueId);
    if (!venue) return;

    const date = venue.dates.find((d) => d.id === dateId);
    if (!date) return;

    const updatedShows = date.shows.map((show) =>
      show.id === showId ? { ...show, ...updates } : show
    );
    updateDate(locationId, venueId, dateId, { shows: updatedShows });
  };

  const deleteShow = (locationId: string, venueId: string, dateId: string, showId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location) return;

    const venue = location.venues.find((v) => v.id === venueId);
    if (!venue) return;

    const date = venue.dates.find((d) => d.id === dateId);
    if (!date) return;

    const updatedShows = date.shows.filter((show) => show.id !== showId);
    updateDate(locationId, venueId, dateId, { shows: updatedShows });
    setDeleteDialog(null);
  };

  const toggleLocation = (locationId: string) => {
    const newExpanded = new Set(Array.from(expandedLocations));
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  // Initialize with one location if empty
  if (locations.length === 0) {
    addLocation();
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side - Editable Form (2/3 width) */}
      <div className="lg:col-span-2 space-y-4">
        {locations.map((location, locIndex) => (
          <Card key={location.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleLocation(location.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    Location {locIndex + 1} – {location.name || "Untitled location"}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {locations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialog({ type: "location", locationId: location.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  {expandedLocations.has(location.id) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedLocations.has(location.id) && (
              <CardContent className="space-y-6 pt-4">
                {/* Location Name */}
                <div className="space-y-2" data-field={`locations[${locIndex}].name`}>
                  <Label htmlFor={`location-name-${location.id}`}>Location Name *</Label>
                  <Input
                    id={`location-name-${location.id}`}
                    placeholder="e.g., Bangalore, Mumbai"
                    value={location.name}
                    onChange={(e) => updateLocation(location.id, { name: e.target.value })}
                    className={getError(`locations[${locIndex}].name`) ? "border-red-500" : ""}
                  />
                  {getError(`locations[${locIndex}].name`) && (
                    <p className="text-sm text-red-500">{getError(`locations[${locIndex}].name`)}</p>
                  )}
                </div>

                {/* Venues */}
                <div className="space-y-4">
                  <Label>Venues</Label>
                  {location.venues.map((venue, venueIndex) => (
                    <Card key={venue.id} className="border-2">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">
                            Venue {venueIndex + 1} – {venue.name || "Untitled venue"}
                          </h4>
                          {location.venues.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteDialog({
                                  type: "venue",
                                  locationId: location.id,
                                  venueId: venue.id,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        {/* Venue Name */}
                        <div className="space-y-2" data-field={`locations[${locIndex}].venues[${venueIndex}].name`}>
                          <Label htmlFor={`venue-name-${venue.id}`}>Venue Name *</Label>
                          <Input
                            id={`venue-name-${venue.id}`}
                            placeholder="e.g., Movigoo Corporate Hall"
                            value={venue.name}
                            onChange={(e) =>
                              updateVenue(location.id, venue.id, { name: e.target.value })
                            }
                            className={
                              getError(`locations[${locIndex}].venues[${venueIndex}].name`)
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {getError(`locations[${locIndex}].venues[${venueIndex}].name`) && (
                            <p className="text-sm text-red-500">
                              {getError(`locations[${locIndex}].venues[${venueIndex}].name`)}
                            </p>
                          )}
                        </div>

                        {/* Venue Address */}
                        <div className="space-y-2" data-field={`locations[${locIndex}].venues[${venueIndex}].address`}>
                          <Label htmlFor={`venue-address-${venue.id}`}>Venue Address *</Label>
                          <Input
                            id={`venue-address-${venue.id}`}
                            placeholder="Full address"
                            value={venue.address}
                            onChange={(e) =>
                              updateVenue(location.id, venue.id, { address: e.target.value })
                            }
                            className={
                              getError(`locations[${locIndex}].venues[${venueIndex}].address`)
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {getError(`locations[${locIndex}].venues[${venueIndex}].address`) && (
                            <p className="text-sm text-red-500">
                              {getError(`locations[${locIndex}].venues[${venueIndex}].address`)}
                            </p>
                          )}
                        </div>

                        {/* Dates & Shows */}
                        <div className="space-y-3 pl-4 border-l-2">
                          <Label className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Dates & Shows
                          </Label>

                          {venue.dates.map((date, dateIndex) => (
                            <Card key={date.id} className="bg-muted/30">
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex justify-between items-start">
                                  <Label htmlFor={`date-${date.id}`}>Date {dateIndex + 1} *</Label>
                                  {venue.dates.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setDeleteDialog({
                                          type: "date",
                                          locationId: location.id,
                                          venueId: venue.id,
                                          dateId: date.id,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </div>

                                <Input
                                  id={`date-${date.id}`}
                                  type="date"
                                  value={date.date}
                                  onChange={(e) =>
                                    updateDate(location.id, venue.id, date.id, { date: e.target.value })
                                  }
                                  className={
                                    getError(
                                      `locations[${locIndex}].venues[${venueIndex}].dates[${dateIndex}].date`
                                    )
                                      ? "border-red-500"
                                      : ""
                                  }
                                />

                                {/* Shows */}
                                <div className="space-y-2 pl-3">
                                  <Label className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Shows
                                  </Label>
                                  {date.shows.map((show, showIndex) => (
                                    <div key={show.id} className="flex gap-2 items-start">
                                      <Input
                                        placeholder="Show name (optional)"
                                        value={show.name || ""}
                                        onChange={(e) =>
                                          updateShow(location.id, venue.id, date.id, show.id, {
                                            name: e.target.value,
                                          })
                                        }
                                        className="flex-1"
                                      />
                                      <Input
                                        type="time"
                                        placeholder="Start"
                                        value={show.startTime}
                                        onChange={(e) =>
                                          updateShow(location.id, venue.id, date.id, show.id, {
                                            startTime: e.target.value,
                                          })
                                        }
                                        className="w-32"
                                      />
                                      <Input
                                        type="time"
                                        placeholder="End"
                                        value={show.endTime}
                                        onChange={(e) =>
                                          updateShow(location.id, venue.id, date.id, show.id, {
                                            endTime: e.target.value,
                                          })
                                        }
                                        className="w-32"
                                      />
                                      {date.shows.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            setDeleteDialog({
                                              type: "show",
                                              locationId: location.id,
                                              venueId: venue.id,
                                              dateId: date.id,
                                              showId: show.id,
                                            })
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addShow(location.id, venue.id, date.id)}
                                    className="w-full"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Show
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addDate(location.id, venue.id)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Date
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => addVenue(location.id)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Venue
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        <Button variant="outline" onClick={addLocation} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add Location
        </Button>
      </div>

      {/* Right side - Schedule Summary (1/3 width) */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-base">Schedule Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {locations.map((location) => (
              <div key={location.id} className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.name || "Untitled"}
                </h4>
                <div className="pl-4 space-y-2 text-xs text-muted-foreground">
                  {location.venues.map((venue) => (
                    <div key={venue.id}>
                      <p className="font-medium text-foreground">{venue.name || "Untitled venue"}</p>
                      {venue.dates.map((date) => (
                        <div key={date.id} className="pl-3 mt-1">
                          <p>{date.date ? new Date(date.date).toLocaleDateString() : "No date"}</p>
                          <div className="pl-2">
                            {date.shows.map((show, idx) => (
                              <p key={show.id}>
                                {show.name || `Show ${idx + 1}`} – {show.startTime || "?"} – {show.endTime || "?"}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deleteDialog?.type === "location" &&
                "Deleting this location will remove all its venues, dates, shows, and ticket settings. Continue?"}
              {deleteDialog?.type === "venue" &&
                "Deleting this venue will remove all its dates, shows, and ticket settings. Continue?"}
              {deleteDialog?.type === "date" && "Deleting this date will remove all its shows. Continue?"}
              {deleteDialog?.type === "show" && "Are you sure you want to delete this show?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteDialog) return;

                if (deleteDialog.type === "location" && deleteDialog.locationId) {
                  deleteLocation(deleteDialog.locationId);
                } else if (deleteDialog.type === "venue" && deleteDialog.locationId && deleteDialog.venueId) {
                  deleteVenue(deleteDialog.locationId, deleteDialog.venueId);
                } else if (
                  deleteDialog.type === "date" &&
                  deleteDialog.locationId &&
                  deleteDialog.venueId &&
                  deleteDialog.dateId
                ) {
                  deleteDate(deleteDialog.locationId, deleteDialog.venueId, deleteDialog.dateId);
                } else if (
                  deleteDialog.type === "show" &&
                  deleteDialog.locationId &&
                  deleteDialog.venueId &&
                  deleteDialog.dateId &&
                  deleteDialog.showId
                ) {
                  deleteShow(
                    deleteDialog.locationId,
                    deleteDialog.venueId,
                    deleteDialog.dateId,
                    deleteDialog.showId
                  );
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
