// /host/app/api/logout-all/route.ts
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { serializeCookie } from "@/lib/cookies";

const CF_LOGOUT_ALL =
  process.env.FIREBASE_CF_LOGOUT_ALL_URL ||
  "https://logoutalldevices-nmi75xl45a-el.a.run.app";

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
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return headers;
}

export async function POST(req: NextRequest) {
  const store = await cookies();

  // Extract idToken from client request body
  const body = await req.json().catch(() => ({}));
  const { idToken } = body;

  const clearId = serializeCookie(COOKIE_NAME_ID, "", cookieOptionsForClear());
  const clearKey = serializeCookie(COOKIE_NAME_KEY, "", cookieOptionsForClear());
  const headers = buildSetCookieHeaders(clearId, clearKey);

  // If missing idToken, just clear cookies and return
  if (!idToken) {
    console.log("Logout all: Missing idToken, clearing cookies only.");
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  try {
    console.log("LogoutAllCloud → Sending cleanup request");

    const logoutAllRes = await fetch(CF_LOGOUT_ALL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!logoutAllRes.ok) {
      const errText = await logoutAllRes.text();
      console.warn("LogoutAllCloud warning:", errText);
    }
  } catch (err) {
    console.error("LogoutAllCloud fetch error:", err);
  }

  // Always return success with cleared cookies
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}
