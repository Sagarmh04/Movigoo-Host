// API route for hashing volunteer passwords
// This ensures passwords are hashed server-side using bcrypt
import { NextRequest } from "next/server";
import { randomBytes, scrypt as _scrypt } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

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
    const hashedPassword = await hashPassword(password);

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

