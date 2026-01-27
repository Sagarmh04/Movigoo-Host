"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchEvents } from "@/lib/api/events";
import { EventSummary } from "@/lib/types/event";
import { getMultipleEventAnalytics, EventAnalytics } from "@/lib/utils/analytics";

export default function EventListingsTab() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventAnalytics, setEventAnalytics] = useState<Record<string, EventAnalytics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchEvents();
        setEvents(data);
        
        // Fetch analytics for all events in parallel (READ analytics ONLY)
        if (data.length > 0) {
          const eventIds = data.map(event => event.id);
          console.log("📊 [Event Listings] Fetching analytics for events:", eventIds);
          
          try {
            const analytics = await getMultipleEventAnalytics(eventIds);
            console.log("✅ [Event Listings] Analytics fetched:", analytics);
            setEventAnalytics(analytics);
          } catch (analyticsError) {
            console.error("❌ [Event Listings] Error fetching analytics:", analyticsError);
            // Continue even if analytics fails - will show 0 tickets
          }
        }
      } catch (error) {
        console.error("Failed to load events", error);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const handleCreateEvent = () => {
    router.push("/events/create");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                  <Badge variant={event.status === "hosted" || event.status === "published" ? "default" : "secondary"}>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        {eventAnalytics[event.id]?.totalTicketsSold ?? 0} tickets sold
                      </span>
                      {eventAnalytics[event.id]?.totalRevenue > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          ₹{eventAnalytics[event.id].totalRevenue.toLocaleString('en-IN')} earned
                        </Badge>
                      )}
                    </div>
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
                    asChild
                  >
                    <Link 
                      href={`/events/${event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Link>
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
