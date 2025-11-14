import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME_ID = "host_session_id";
const COOKIE_NAME_KEY = "host_session_key";

// Publicly accessible routes
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api",           // Allow API (your login/logout handlers)
  "/favicon.ico",
  "/_next",         // Next.js internal assets
  "/robots.txt",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionId = req.cookies.get(COOKIE_NAME_ID)?.value;
  const sessionKey = req.cookies.get(COOKIE_NAME_KEY)?.value;

  // If cookie missing → redirect to login
  if (!sessionId || !sessionKey) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → allow routing to the page
  return NextResponse.next();
}

// Match ALL routes except API routes (handled above in PUBLIC_PATHS)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
