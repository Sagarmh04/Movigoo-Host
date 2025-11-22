// /host/app/api/logout/route.ts
import { NextRequest } from "next/server";
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

export async function POST(req: NextRequest) {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME_ID)?.value || null;

  // Extract idToken from client request body
  const body = await req.json().catch(() => ({}));
  const { idToken } = body;

  const clearId = serializeCookie(COOKIE_NAME_ID, "", cookieOptionsForClear());
  const clearKey = serializeCookie(COOKIE_NAME_KEY, "", cookieOptionsForClear());
  const headers = buildSetCookieHeaders(clearId, clearKey);

  // If missing critical info, just clear cookies and return
  if (!sessionId || !idToken) {
    console.log("Logout: Missing sessionId or idToken, clearing cookies only.");
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  try {
    console.log("LogoutCloud → Sending cleanup request");

    const logoutRes = await fetch(CF_LOGOUT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, idToken }),
    });

    if (!logoutRes.ok) {
      const errText = await logoutRes.text();
      console.warn("LogoutCloud warning:", errText);
    }
  } catch (err) {
    console.error("LogoutCloud fetch error:", err);
  }

  // Always return success with cleared cookies
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}
