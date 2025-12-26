// API route for owner to toggle payout KYC status
// Owner-only endpoint with email verification
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const OWNER_EMAIL = "movigoo4@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizerId, enabled } = body;

    // Validate request body
    if (!organizerId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request: organizerId and enabled (boolean) are required" },
        { status: 400 }
      );
    }

    // Get current user from Firebase Auth
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized: Not authenticated" },
        { status: 401 }
      );
    }

    // Verify owner email
    if (currentUser.email !== OWNER_EMAIL) {
      return NextResponse.json(
        { error: "Forbidden: Owner access only" },
        { status: 403 }
      );
    }

    // Update organizer document with payoutKyc field
    const organizerRef = doc(db, "organizers", organizerId);
    
    // Check if organizer exists
    const organizerSnap = await getDoc(organizerRef);
    if (!organizerSnap.exists()) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    await updateDoc(organizerRef, {
      "payoutKyc.enabled": enabled,
      "payoutKyc.updatedAt": serverTimestamp(),
      "payoutKyc.updatedBy": "OWNER"
    });

    return NextResponse.json({
      success: true,
      message: `Payout KYC ${enabled ? "enabled" : "disabled"} successfully`,
      payoutKyc: {
        enabled,
        updatedBy: "OWNER"
      }
    });

  } catch (error: any) {
    console.error("Error toggling payout KYC:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Failed to update payout KYC status"
      },
      { status: 500 }
    );
  }
}
