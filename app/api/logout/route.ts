// /host/app/api/logout/route.ts
import { cookies } from "next/headers";
import { serializeCookie } from "@/lib/cookies";

const CF_LOGOUT =
  process.env.FIREBASE_CF_LOGOUT_DEVICE_URL ||
  "https://logoutdevice-nmi75xl45a-el.a.run.app";

const COOKIE_NAME_ID = "host_session_id";
const COOKIE_NAME_KEY = "host_session_key";

function cookieOptionsForClear() {
  const domain = process.env.HOST_COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    domain,
    maxAge: 0,
  };
}

function buildSetCookieHeaders(...cookies: string[]) {
  const headers = new Headers();
  cookies.forEach((c) => headers.append("Set-Cookie", c));
  return headers;
}

export async function POST() {
  const store = cookies();

  const sessionId = store.get(COOKIE_NAME_ID)?.value || null;
  const sessionKey = store.get(COOKIE_NAME_KEY)?.value || null;

  const clearId = serializeCookie(COOKIE_NAME_ID, "", cookieOptionsForClear());
  const clearKey = serializeCookie(COOKIE_NAME_KEY, "", cookieOptionsForClear());

  if (!sessionId || !sessionKey) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: buildSetCookieHeaders(clearId, clearKey),
    });
  }

  try {
    console.log("LogoutCloud → Sending:", {
      url: CF_LOGOUT,
      sessionId,
      sessionKey,
    });

    const logoutRes = await fetch(CF_LOGOUT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        "x-session-key": sessionKey,
      },
      body: JSON.stringify({ sessionId }),
    });

    // 🔥 ALWAYS READ BODY BEFORE CHECKING OK
    const rawText = await logoutRes.text();
    console.log("LogoutCloud ← Response:", rawText);

    if (!logoutRes.ok) {
      return new Response(JSON.stringify({ error: "LOGOUT_FAILED" }), {
        status: logoutRes.status,
        headers: buildSetCookieHeaders(clearId, clearKey),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: buildSetCookieHeaders(clearId, clearKey),
    });
  } catch (err) {
    console.error("API /api/logout fatal error:", err);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: buildSetCookieHeaders(clearId, clearKey),
    });
  }
}
