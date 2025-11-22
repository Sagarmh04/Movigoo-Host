"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

export default function LogoutButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function doLogout(url: string) {
    try {
      setLoading(true);
      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        console.error("Logout failed:", res.status, text);
        alert(`Logout failed (${res.status}): ${text}`);
        return;
      }

      // sign out client auth
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Firebase signOut failed:", err);
      }

      // redirect to login
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      alert("Logout failed. See console for details.");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div className={className}>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Logout
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md shadow-lg p-6 w-80">
            <h3 className="text-lg font-medium mb-2">Sign out</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose whether to sign out from this device only or from all devices.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => doLogout("/api/logout")}
                disabled={loading}
              >
                This device
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    !confirm(
                      "Are you sure you want to sign out from ALL devices?"
                    )
                  )
                    return;
                  doLogout("/api/logout-all");
                }}
                disabled={loading}
              >
                All devices
              </Button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
