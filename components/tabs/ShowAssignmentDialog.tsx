"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  addShowAssignment,
  removeShowAssignment,
  updateShowAssignment,
  type ShowAssignment,
} from "@/lib/api/volunteers";
import { getAllShowsForHost, formatShowDisplay, type ShowInfo } from "@/lib/utils/events";

interface ShowAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteerId: string;
  existingAssignments: ShowAssignment[];
  onAssignmentsUpdated: () => void;
}

export default function ShowAssignmentDialog({
  open,
  onOpenChange,
  volunteerId,
  existingAssignments,
  onAssignmentsUpdated,
}: ShowAssignmentDialogProps) {
  const [shows, setShows] = useState<ShowInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShow, setSelectedShow] = useState<string>("");
  const [editingAssignment, setEditingAssignment] = useState<ShowAssignment | null>(null);

  useEffect(() => {
    if (open) {
      loadShows();
    }
  }, [open]);

  const loadShows = async () => {
    try {
      setLoading(true);
      const allShows = await getAllShowsForHost();
      setShows(allShows);
    } catch (error) {
      console.error("Error loading shows:", error);
      toast.error("Failed to load shows");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedShow) {
      toast.error("Please select a show");
      return;
    }

    const show = shows.find((s) => {
      const showKey = `${s.eventId}-${s.locationId}-${s.venueId}-${s.dateId}-${s.showId}`;
      return showKey === selectedShow;
    });

    if (!show) {
      toast.error("Selected show not found");
      return;
    }

    // Check if already assigned
    const alreadyAssigned = existingAssignments.some(
      (assignment) =>
        assignment.eventId === show.eventId &&
        assignment.locationId === show.locationId &&
        assignment.venueId === show.venueId &&
        assignment.dateId === show.dateId &&
        assignment.showId === show.showId
    );

    if (alreadyAssigned) {
      toast.error("This show is already assigned to this volunteer");
      return;
    }

    try {
      await addShowAssignment(volunteerId, {
        eventId: show.eventId,
        eventTitle: show.eventTitle,
        locationId: show.locationId,
        locationName: show.locationName,
        venueId: show.venueId,
        venueName: show.venueName,
        dateId: show.dateId,
        date: show.date,
        showId: show.showId,
        showName: show.showName,
        showStartTime: show.showStartTime,
        showEndTime: show.showEndTime,
      });

      toast.success("Show assigned successfully");
      setSelectedShow("");
      onAssignmentsUpdated();
    } catch (error: any) {
      console.error("Error adding assignment:", error);
      toast.error(error.message || "Failed to assign show");
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this show assignment?")) {
      return;
    }

    try {
      await removeShowAssignment(volunteerId, assignmentId);
      toast.success("Show assignment removed");
      onAssignmentsUpdated();
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast.error(error.message || "Failed to remove assignment");
    }
  };

  // Get available shows (not already assigned)
  const availableShows = shows.filter((show) => {
    const showKey = `${show.eventId}-${show.locationId}-${show.venueId}-${show.dateId}-${show.showId}`;
    return !existingAssignments.some(
      (assignment) =>
        assignment.eventId === show.eventId &&
        assignment.locationId === show.locationId &&
        assignment.venueId === show.venueId &&
        assignment.dateId === show.dateId &&
        assignment.showId === show.showId
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Show Assignments</DialogTitle>
          <DialogDescription>
            Assign shows to this volunteer. Volunteers can only check tickets for assigned shows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Assignment */}
          <div className="space-y-2">
            <Label>Select Show to Assign</Label>
            <div className="flex gap-2">
              <Select value={selectedShow} onValueChange={setSelectedShow} disabled={loading}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loading ? "Loading shows..." : "Select a show"} />
                </SelectTrigger>
                <SelectContent>
                  {availableShows.length === 0 ? (
                    <SelectItem value="" disabled>
                      No available shows
                    </SelectItem>
                  ) : (
                    availableShows.map((show) => {
                      const showKey = `${show.eventId}-${show.locationId}-${show.venueId}-${show.dateId}-${show.showId}`;
                      return (
                        <SelectItem key={showKey} value={showKey}>
                          {formatShowDisplay(show)}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button onClick={handleAddAssignment} disabled={!selectedShow || loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Assignments */}
          <div className="space-y-2">
            <Label>Assigned Shows ({existingAssignments.length})</Label>
            {existingAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                No shows assigned yet
              </div>
            ) : (
              <div className="space-y-2">
                {existingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{assignment.eventTitle}</div>
                      <div className="text-sm text-gray-500">
                        {assignment.locationName} • {assignment.venueName} •{" "}
                        {new Date(assignment.date).toLocaleDateString()} •{" "}
                        {assignment.showName || "Show"} ({assignment.showStartTime} -{" "}
                        {assignment.showEndTime})
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

