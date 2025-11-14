// /host/app/api/logout-all/route.ts
import { cookies } from "next/headers";
import { serializeCookie } from "@/lib/cookies";

const CF_LOGOUT_ALL =
  process.env.FIREBASE_CF_LOGOUT_ALL_URL ||
  "https://logoutalldevices-nmi75xl45a-el.a.run.app";

const COOKIE_NAME_ID = "host_session_id";
const COOKIE_NAME_KEY = "host_session_key";

function cookieOptionsForClear() {
  const isProd = process.env.NODE_ENV === "production";
  const domain = process.env.HOST_COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    domain,
    maxAge: 0,
  };
}

function buildSetCookieHeaders(...cookies: string[]) {
  const headers = new Headers();
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return headers;
}

export async function POST() {
  const store = cookies();

  const sessionId = store.get(COOKIE_NAME_ID)?.value || null;
  const sessionKey = store.get(COOKIE_NAME_KEY)?.value || null;

  const clearId = serializeCookie(
    COOKIE_NAME_ID,
    "",
    cookieOptionsForClear()
  );
  const clearKey = serializeCookie(
    COOKIE_NAME_KEY,
    "",
    cookieOptionsForClear()
  );

  // If no active session exists, just clear cookies and exit
  if (!sessionId || !sessionKey) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: buildSetCookieHeaders(clearId, clearKey),
    });
  }

  try {
    const logoutAllRes = await fetch(CF_LOGOUT_ALL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        "x-session-key": sessionKey,
      },
      body: JSON.stringify({}),
    });

    if (!logoutAllRes.ok) {
      return new Response(JSON.stringify({ error: "LOGOUT_ALL_FAILED" }), {
        status: logoutAllRes.status,
        headers: buildSetCookieHeaders(clearId, clearKey),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: buildSetCookieHeaders(clearId, clearKey),
    });
  } catch (err) {
    console.error("API /api/logout-all error:", err);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: buildSetCookieHeaders(clearId, clearKey),
    });
  }
}
