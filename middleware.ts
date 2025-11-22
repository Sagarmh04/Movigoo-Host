import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME_ID = "host_session_id";
const COOKIE_NAME_KEY = "host_session_key";

const VERIFY_SESSION_URL =
  process.env.FIREBASE_CF_VERIFY_SESSION_URL ||
  "https://verifysession-nmi75xl45a-el.a.run.app";

// Publicly accessible routes
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api",           // Allow API (your login/logout handlers)
  "/favicon.ico",
  "/_next",         // Next.js internal assets
  "/robots.txt",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionId = req.cookies.get(COOKIE_NAME_ID)?.value;
  const sessionKey = req.cookies.get(COOKIE_NAME_KEY)?.value;

  // If cookies missing → redirect to login immediately
  if (!sessionId || !sessionKey) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session with cloud function
  try {
    const verifyRes = await fetch(VERIFY_SESSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        sessionKey,
      }),
    });

    if (!verifyRes.ok) {
      // Session invalid → redirect to login
      const errorText = await verifyRes.text().catch(() => "unknown error");
      console.warn("Session verification failed:", verifyRes.status, errorText);
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Session valid → allow access
    return NextResponse.next();
  } catch (err) {
    // Network error or cloud function unavailable → redirect to login
    console.error("Session verification error:", err);
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Match ALL routes except API routes (handled above in PUBLIC_PATHS)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
