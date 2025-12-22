"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KycNotificationProps {
  kycStatus: string;
  onOpenKyc: () => void;
}

export default function KycNotification({ kycStatus, onOpenKyc }: KycNotificationProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show if verified (only hide when verified, not when pending)
  if (kycStatus === "verified" || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-yellow-400">
              <AlertCircle className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <p className="ml-3 font-medium text-yellow-800 truncate">
              <span className="md:hidden">Complete your KYC to access all features</span>
              <span className="hidden md:inline">
                Your KYC verification is pending. Complete it now to access all features of the platform.
              </span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
            <Button
              onClick={onOpenKyc}
              variant="outline"
              size="sm"
              className="bg-white text-yellow-800 hover:bg-yellow-50 border-yellow-300"
            >
              Complete KYC
            </Button>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="-mr-1 flex p-2 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5 text-yellow-800" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
