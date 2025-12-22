"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, LogOut, QrCode, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getVolunteerByUuid, type Volunteer } from "@/lib/api/volunteers";

export default function CrewPortalPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params.uuid as string;

  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    loadVolunteer();
  }, [uuid]);

  const loadVolunteer = async () => {
    try {
      setLoading(true);
      const volunteerData = await getVolunteerByUuid(uuid);
      if (!volunteerData) {
        toast.error("Volunteer not found");
        router.push("/");
        return;
      }
      if (!volunteerData.isActive) {
        toast.error("This volunteer account is inactive");
        router.push("/");
        return;
      }
      setVolunteer(volunteerData);
    } catch (error) {
      console.error("Error loading volunteer:", error);
      toast.error("Failed to load volunteer data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteer) return;

    setLoggingIn(true);
    try {
      // Simple authentication (in production, use proper hashing)
      if (username === volunteer.username && password === volunteer.password) {
        setAuthenticated(true);
        toast.success("Login successful");
      } else {
        toast.error("Invalid username or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setUsername("");
    setPassword("");
    toast.success("Logged out");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Volunteer not found or inactive</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Crew Portal Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the volunteer portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>
                {loggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Crew Portal</h1>
              <p className="text-sm text-gray-500">Welcome, {volunteer.username}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ticket Checking */}
          {volunteer.privileges.includes("ticket_checking") && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Ticket Checking
                </CardTitle>
                <CardDescription>
                  Scan QR codes and mark attendance for assigned shows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Assigned Shows: {volunteer.showAssignments?.length || 0}
                </p>
                <Button className="w-full" onClick={() => router.push(`/crew/${uuid}/scan`)}>
                  Open Scanner
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats View */}
          {volunteer.privileges.includes("stats_view") && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  View Stats
                </CardTitle>
                <CardDescription>
                  View statistics for assigned shows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => router.push(`/crew/${uuid}/stats`)}>
                  View Statistics
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assigned Shows */}
        {volunteer.showAssignments && volunteer.showAssignments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Assigned Shows</CardTitle>
              <CardDescription>
                Shows you are assigned to work on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {volunteer.showAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-3 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{assignment.eventTitle}</div>
                      <div className="text-sm text-gray-500">
                        {assignment.locationName} • {assignment.venueName} •{" "}
                        {new Date(assignment.date).toLocaleDateString()} •{" "}
                        {assignment.showName || "Show"} ({assignment.showStartTime} -{" "}
                        {assignment.showEndTime})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

