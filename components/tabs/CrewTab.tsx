"use client";

import { useState, useEffect } from "react";
import { Plus, Copy, Trash2, Eye, EyeOff, CheckCircle2, XCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createVolunteer, getVolunteers, deleteVolunteer, toggleVolunteerStatus, type Volunteer, type VolunteerPrivilege } from "@/lib/api/volunteers";
import ShowAssignmentDialog from "./ShowAssignmentDialog";

export default function CrewTab() {
  const [showForm, setShowForm] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    privileges: [] as VolunteerPrivilege[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createdVolunteer, setCreatedVolunteer] = useState<Volunteer | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedVolunteerForAssignment, setSelectedVolunteerForAssignment] = useState<Volunteer | null>(null);

  useEffect(() => {
    loadVolunteers();
  }, []);

  const loadVolunteers = async () => {
    try {
      setLoading(true);
      const data = await getVolunteers();
      setVolunteers(data);
    } catch (error) {
      console.error("Error loading volunteers:", error);
      toast.error("Failed to load volunteers");
    } finally {
      setLoading(false);
    }
  };

  const handlePrivilegeChange = (privilege: VolunteerPrivilege, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        privileges: [...formData.privileges, privilege],
      });
    } else {
      setFormData({
        ...formData,
        privileges: formData.privileges.filter((p) => p !== privilege),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error("Username and password are required");
      return;
    }

    if (formData.privileges.length === 0) {
      toast.error("Please select at least one privilege");
      return;
    }

    try {
      const volunteer = await createVolunteer(
        formData.username,
        formData.password,
        formData.privileges
      );

      toast.success("Volunteer created successfully!");
      setCreatedVolunteer(volunteer);
      setFormData({
        username: "",
        password: "",
        privileges: [],
      });
      setShowForm(false);
      await loadVolunteers();
    } catch (error: any) {
      console.error("Error creating volunteer:", error);
      toast.error(error.message || "Failed to create volunteer");
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this volunteer?")) {
      return;
    }

    try {
      await deleteVolunteer(uuid);
      toast.success("Volunteer deleted successfully");
      await loadVolunteers();
    } catch (error: any) {
      console.error("Error deleting volunteer:", error);
      toast.error(error.message || "Failed to delete volunteer");
    }
  };

  const handleToggleStatus = async (uuid: string, currentStatus: boolean) => {
    try {
      await toggleVolunteerStatus(uuid, !currentStatus);
      toast.success(`Volunteer ${!currentStatus ? "activated" : "deactivated"}`);
      await loadVolunteers();
    } catch (error: any) {
      console.error("Error toggling volunteer status:", error);
      toast.error(error.message || "Failed to update volunteer status");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  const getPrivilegeLabel = (privilege: VolunteerPrivilege): string => {
    switch (privilege) {
      case "ticket_checking":
        return "Ticket Checking";
      case "stats_view":
        return "Stats View";
      default:
        return privilege;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Crew Management</h1>
          <p className="text-gray-500 mt-1">
            Manage your volunteers and their access privileges.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-5 w-5 mr-2" />
          Add Volunteer
        </Button>
      </div>

      {/* Success Message with Link */}
      {createdVolunteer && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Volunteer Created Successfully!</CardTitle>
            <CardDescription className="text-green-700">
              Share this link with your volunteer to access their account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={createdVolunteer.accessLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(createdVolunteer.accessLink)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Username:</strong> {createdVolunteer.username}
              </p>
              <p>
                <strong>Privileges:</strong>{" "}
                {createdVolunteer.privileges.map(getPrivilegeLabel).join(", ")}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreatedVolunteer(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Volunteer Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Volunteer</CardTitle>
            <CardDescription>
              Create a volunteer account with specific access privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Privileges</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ticket_checking"
                      checked={formData.privileges.includes("ticket_checking")}
                      onCheckedChange={(checked) =>
                        handlePrivilegeChange("ticket_checking", checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="ticket_checking"
                      className="font-normal cursor-pointer"
                    >
                      Ticket Checking
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stats_view"
                      checked={formData.privileges.includes("stats_view")}
                      onCheckedChange={(checked) =>
                        handlePrivilegeChange("stats_view", checked as boolean)
                      }
                    />
                    <Label htmlFor="stats_view" className="font-normal cursor-pointer">
                      Stats View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 opacity-50">
                    <Checkbox id="more_coming" disabled />
                    <Label htmlFor="more_coming" className="font-normal">
                      More coming soon...
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Volunteer</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      username: "",
                      password: "",
                      privileges: [],
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Volunteers List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Volunteers</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading volunteers...</div>
        ) : volunteers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No volunteers yet. Create your first volunteer to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {volunteers.map((volunteer) => (
              <Card key={volunteer.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{volunteer.username}</CardTitle>
                      <CardDescription className="mt-1">
                        Created: {new Date(volunteer.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={volunteer.isActive ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {volunteer.isActive ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Privileges
                    </Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {volunteer.privileges.map((priv) => (
                        <Badge key={priv} variant="outline">
                          {getPrivilegeLabel(priv)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {volunteer.showAssignments && volunteer.showAssignments.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Assigned Shows ({volunteer.showAssignments.length})
                      </Label>
                      <div className="mt-1 space-y-1">
                        {volunteer.showAssignments.slice(0, 2).map((assignment) => (
                          <div key={assignment.id} className="text-xs text-gray-600 truncate">
                            {assignment.eventTitle} - {assignment.showName || "Show"}
                          </div>
                        ))}
                        {volunteer.showAssignments.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{volunteer.showAssignments.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Access Link
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        value={volunteer.accessLink}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(volunteer.accessLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVolunteerForAssignment(volunteer);
                          setShowAssignmentDialog(true);
                        }}
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Assign Shows ({volunteer.showAssignments?.length || 0})
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleStatus(volunteer.id, volunteer.isActive)
                        }
                        className="flex-1"
                      >
                        {volunteer.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(volunteer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Show Assignment Dialog */}
      {selectedVolunteerForAssignment && (
        <ShowAssignmentDialog
          open={showAssignmentDialog}
          onOpenChange={(open) => {
            setShowAssignmentDialog(open);
            if (!open) {
              setSelectedVolunteerForAssignment(null);
            }
          }}
          volunteerId={selectedVolunteerForAssignment.id}
          existingAssignments={selectedVolunteerForAssignment.showAssignments || []}
          onAssignmentsUpdated={() => {
            loadVolunteers();
          }}
        />
      )}
    </div>
  );
}

