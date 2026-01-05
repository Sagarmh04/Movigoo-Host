// /host/app/api/login/route.ts
import { NextRequest } from "next/server";
import { parseCookieHeader, serializeCookie } from "@/lib/cookies";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// For Firebase Functions v2 on Cloud Run, use the base URL (function name is in the service name)
const CF_CREATE_SESSION = process.env.FIREBASE_CF_ADMIN_CREATE_SESSION_URL || 
  "https://admincreatesession-nmi75xl45a-el.a.run.app";
const COOKIE_NAME_ID = "host_session_id";
const COOKIE_NAME_KEY = "host_session_key";

function cookieOptions() {
  const domain = process.env.HOST_COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    domain,
  };
}

function buildSetCookieHeaders(...cookies: string[]) {
  const headers = new Headers();
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return headers;
}

async function getUserRoleFromUsersCollection(idToken: string): Promise<{
  uid: string;
  role: string | null;
} | null> {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const snap = await adminDb.collection("users").doc(uid).get();
    const data = snap.exists ? (snap.data() as any) : null;
    const role = (data?.role ?? data?.profile?.role ?? null) as string | null;

    return { uid, role };
  } catch {
    return null;
  }
}

function looksLikeJwt(token: string) {
  return typeof token === "string" && token.split(".").length === 3;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken = body?.idToken;
    if (!idToken) {
      return new Response(JSON.stringify({ error: "MISSING_ID_TOKEN" }), { status: 400 });
    }

    const userInfo = await getUserRoleFromUsersCollection(idToken);

    console.log("[LOGIN API] Calling Cloud Function:", CF_CREATE_SESSION);

    // Forward idToken to Cloud Function
    let cfRes;
    try {
      cfRes = await fetch(CF_CREATE_SESSION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      console.log("[LOGIN API] Cloud Function response status:", cfRes.status, cfRes.statusText);
    } catch (fetchErr: any) {
      const fullError = {
        name: fetchErr?.name,
        message: fetchErr?.message,
        stack: fetchErr?.stack,
        cause: fetchErr?.cause,
        code: fetchErr?.code,
        errno: fetchErr?.errno,
        syscall: fetchErr?.syscall,
        hostname: fetchErr?.hostname,
        address: fetchErr?.address,
        port: fetchErr?.port,
        toString: fetchErr?.toString(),
      };
      console.error("[LOGIN API] Failed to fetch Cloud Function - FULL ERROR:", JSON.stringify(fullError, null, 2));
      if (userInfo?.role === "organizer" && looksLikeJwt(idToken)) {
        const opts = cookieOptions();
        const cookieId = serializeCookie(COOKIE_NAME_ID, userInfo.uid, { ...opts, httpOnly: true });
        const cookieKey = serializeCookie(COOKIE_NAME_KEY, idToken, { ...opts, httpOnly: true });
        return new Response(JSON.stringify({ success: true, mode: "fallback" }), {
          status: 200,
          headers: buildSetCookieHeaders(cookieId, cookieKey),
        });
      }

      return new Response(
        JSON.stringify({
          error: "CLOUD_FUNCTION_FETCH_FAILED",
          message: "Could not reach Cloud Function. Check your network and Cloud Function URL.",
          details: fullError,
        }),
        { status: 503 }
      );
    }

    if (!cfRes.ok) {
      const contentType = cfRes.headers.get("content-type");
      const responseHeaders: Record<string, string> = {};
      cfRes.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let errorText;
      let errorData: any = {
        status: cfRes.status,
        statusText: cfRes.statusText,
        headers: responseHeaders,
        url: CF_CREATE_SESSION,
      };

      if (contentType?.includes("application/json")) {
        try {
          errorData.response = await cfRes.json();
          errorText = JSON.stringify(errorData);
        } catch (e) {
          errorData.jsonParseError = String(e);
          errorText = JSON.stringify(errorData);
        }
      } else {
        errorText = await cfRes.text();
        errorData.responseText = errorText;
        // If it's HTML, include it but also add a note
        if (errorText.includes("<html") || errorText.includes("<!DOCTYPE")) {
          errorData.isHtmlErrorPage = true;
        }
        errorText = JSON.stringify(errorData);
      }

      console.error("[LOGIN API] Cloud Function error response - FULL ERROR:", errorText);

      if (userInfo?.role === "organizer" && looksLikeJwt(idToken)) {
        const opts = cookieOptions();
        const cookieId = serializeCookie(COOKIE_NAME_ID, userInfo.uid, { ...opts, httpOnly: true });
        const cookieKey = serializeCookie(COOKIE_NAME_KEY, idToken, { ...opts, httpOnly: true });
        return new Response(JSON.stringify({ success: true, mode: "fallback" }), {
          status: 200,
          headers: buildSetCookieHeaders(cookieId, cookieKey),
        });
      }

      return new Response(errorText, {
        status: cfRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    let sessionData;
    try {
      const responseText = await cfRes.text();
      console.log("[LOGIN API] Cloud Function response body:", responseText);
      sessionData = JSON.parse(responseText);
    } catch (jsonErr: any) {
      const fullError = {
        name: jsonErr?.name,
        message: jsonErr?.message,
        stack: jsonErr?.stack,
        responseText: await cfRes.clone().text().catch(() => "Could not read response"),
      };
      console.error("[LOGIN API] Failed to parse Cloud Function response - FULL ERROR:", JSON.stringify(fullError, null, 2));
      return new Response(JSON.stringify({ 
        error: "INVALID_RESPONSE", 
        message: "Cloud Function returned invalid JSON",
        details: fullError
      }), { status: 500 });
    }

    const { sessionId, sessionKey } = sessionData;
    if (!sessionId || !sessionKey) {
      console.error("[LOGIN API] Missing session data. Received:", JSON.stringify(sessionData, null, 2));

      if (userInfo?.role === "organizer" && looksLikeJwt(idToken)) {
        const opts = cookieOptions();
        const cookieId = serializeCookie(COOKIE_NAME_ID, userInfo.uid, { ...opts, httpOnly: true });
        const cookieKey = serializeCookie(COOKIE_NAME_KEY, idToken, { ...opts, httpOnly: true });
        return new Response(JSON.stringify({ success: true, mode: "fallback" }), {
          status: 200,
          headers: buildSetCookieHeaders(cookieId, cookieKey),
        });
      }

      return new Response(
        JSON.stringify({
          error: "MISSING_SESSION_DATA",
          message: "Cloud Function did not return session data",
          receivedData: sessionData,
        }),
        { status: 500 }
      );
    }

    // set cookies
    const opts = cookieOptions();
    const cookieId = serializeCookie(COOKIE_NAME_ID, sessionId, { ...opts, httpOnly: true });
    const cookieKey = serializeCookie(COOKIE_NAME_KEY, sessionKey, { ...opts, httpOnly: true });

    console.log("[LOGIN API] Success - Session created, cookies set");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: buildSetCookieHeaders(cookieId, cookieKey)
    });
  } catch (err: any) {
    const fullError = {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
      code: err?.code,
      toString: err?.toString(),
    };
    console.error("[LOGIN API] Unexpected error - FULL ERROR:", JSON.stringify(fullError, null, 2));
    return new Response(JSON.stringify({ 
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      details: fullError
    }), { status: 500 });
  }
}
