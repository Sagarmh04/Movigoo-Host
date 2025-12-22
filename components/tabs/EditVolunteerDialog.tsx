"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  updateVolunteer,
  updateVolunteerPassword,
  type Volunteer,
  type VolunteerPrivilege,
} from "@/lib/api/volunteers";

interface EditVolunteerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: Volunteer | null;
  onUpdated: () => void;
}

export default function EditVolunteerDialog({
  open,
  onOpenChange,
  volunteer,
  onUpdated,
}: EditVolunteerDialogProps) {
  const [username, setUsername] = useState("");
  const [privileges, setPrivileges] = useState<VolunteerPrivilege[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);

  useEffect(() => {
    if (volunteer && open) {
      setUsername(volunteer.username);
      setPrivileges([...volunteer.privileges]);
      setNewPassword("");
      setConfirmPassword("");
      setResetPassword(false);
      setShowPassword(false);
    }
  }, [volunteer, open]);

  const handlePrivilegeChange = (privilege: VolunteerPrivilege, checked: boolean) => {
    if (checked) {
      setPrivileges([...privileges, privilege]);
    } else {
      setPrivileges(privileges.filter((p) => p !== privilege));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!volunteer) return;

    // Validate username
    if (!username || username.trim().length === 0) {
      toast.error("Username is required");
      return;
    }

    // Validate privileges
    if (privileges.length === 0) {
      toast.error("Please select at least one privilege");
      return;
    }

    // Validate password if resetting
    if (resetPassword) {
      if (!newPassword || newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      // Update username and privileges
      const updates: Partial<Volunteer> = {
        username: username.trim(),
        privileges,
      };

      await updateVolunteer(volunteer.id, updates);

      // Update password if resetting
      if (resetPassword && newPassword) {
        await updateVolunteerPassword(volunteer.id, newPassword);
      }

      toast.success("Volunteer updated successfully");
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating volunteer:", error);
      toast.error(error.message || "Failed to update volunteer");
    } finally {
      setLoading(false);
    }
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

  if (!volunteer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Volunteer</DialogTitle>
          <DialogDescription>
            Update volunteer information and privileges. Leave password empty to keep current password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          {/* Privileges */}
          <div className="space-y-3">
            <Label>Privileges</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-ticket_checking"
                  checked={privileges.includes("ticket_checking")}
                  onCheckedChange={(checked) =>
                    handlePrivilegeChange("ticket_checking", checked as boolean)
                  }
                />
                <Label htmlFor="edit-ticket_checking" className="font-normal cursor-pointer">
                  Ticket Checking
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-stats_view"
                  checked={privileges.includes("stats_view")}
                  onCheckedChange={(checked) =>
                    handlePrivilegeChange("stats_view", checked as boolean)
                  }
                />
                <Label htmlFor="edit-stats_view" className="font-normal cursor-pointer">
                  Stats View
                </Label>
              </div>
            </div>
          </div>

          {/* Password Reset */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-password"
                checked={resetPassword}
                onCheckedChange={(checked) => setResetPassword(checked as boolean)}
              />
              <Label htmlFor="reset-password" className="font-normal cursor-pointer">
                Reset Password
              </Label>
            </div>

            {resetPassword && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      required={resetPassword}
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

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required={resetPassword}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

