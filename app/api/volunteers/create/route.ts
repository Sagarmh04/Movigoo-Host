// API route for hashing volunteer passwords
// This ensures passwords are hashed server-side using bcrypt
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export interface HashPasswordRequest {
  password: string;
}

export interface HashPasswordResponse {
  hashedPassword: string;
}

/**
 * Hash a password using bcrypt
 * This API route ensures password hashing happens server-side for security
 */
export async function POST(req: NextRequest) {
  try {
    const body: HashPasswordRequest = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length === 0) {
      return new Response(
        JSON.stringify({ error: "INVALID_PASSWORD", message: "Password is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Hash password with bcrypt (10 salt rounds)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    return new Response(
      JSON.stringify({
        hashedPassword,
      } as HashPasswordResponse),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error hashing password:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: error.message || "Failed to hash password",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

