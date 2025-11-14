// /host/app/api/register-host/route.ts
import { NextRequest } from "next/server";

const CF_REGISTER_HOST =
  process.env.FIREBASE_CF_REGISTER_HOST_URL ||
  "https://registerhost-nmi75xl45a-el.a.run.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { idToken, name, phone } = body;

    if (!idToken || !name) {
      return new Response(JSON.stringify({ error: "MISSING_FIELDS" }), {
        status: 400,
      });
    }

    const cfRes = await fetch(CF_REGISTER_HOST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        name,
        phone: phone ?? null,
      }),
    });

    if (!cfRes.ok) {
      const text = await cfRes.text();
      return new Response(
        JSON.stringify({
          error: "REGISTER_HOST_FAILED",
          status: cfRes.status,
          body: text,
        }),
        { status: cfRes.status }
      );
    }

    const result = await cfRes.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: err?.message,
      }),
      { status: 500 }
    );
  }
}
