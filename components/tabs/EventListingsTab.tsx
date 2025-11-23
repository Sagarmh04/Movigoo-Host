"use client";

import { useRouter } from "next/navigation";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EventListingsTab() {
  const router = useRouter();

  // TODO: Fetch actual events from backend
  const events: any[] = []; // PLACEHOLDER: Replace with actual data

  const handleCreateEvent = () => {
    router.push("/events/create");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Event Listings</h1>
          <p className="text-gray-500 mt-1">
            Manage all your Movigoo events and listings.
          </p>
        </div>
        <Button onClick={handleCreateEvent} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Get started by creating your first event. You can save drafts and come back to complete them later.
            </p>
            <Button onClick={handleCreateEvent} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="aspect-video bg-muted rounded-md mb-4 overflow-hidden">
                  {event.coverPhotoWide ? (
                    <img
                      src={event.coverPhotoWide}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                  <Badge variant={event.status === "hosted" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">{event.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.locations?.[0]?.name || "No location"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {event.locations?.[0]?.venues?.[0]?.dates?.[0]?.date
                        ? new Date(event.locations[0].venues[0].dates[0].date).toLocaleDateString()
                        : "No date"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>0 tickets sold</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/events/${event.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/events/${event.id}`)}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
