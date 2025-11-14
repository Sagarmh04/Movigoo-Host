// /host/lib/cookies.ts
export function parseCookieHeader(cookieHeader: string | null) {
    const res: Record<string, string> = {};
    if (!cookieHeader) return res;
    const parts = cookieHeader.split(";");
    for (const p of parts) {
      const [k, ...rest] = p.split("=");
      if (!k) continue;
      res[k.trim()] = decodeURIComponent((rest || []).join("=").trim());
    }
    return res;
  }
  
  export function serializeCookie(name: string, value: string, opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    domain?: string | undefined;
    maxAge?: number | undefined;
  }) {
    const pieces: string[] = [];
    pieces.push(`${name}=${encodeURIComponent(value)}`);
    if (opts.httpOnly) pieces.push("HttpOnly");
    if (opts.secure) pieces.push("Secure");
    if (opts.sameSite) pieces.push(`SameSite=${opts.sameSite}`);
    if (opts.path) pieces.push(`Path=${opts.path}`);
    if (opts.domain) pieces.push(`Domain=${opts.domain}`);
    if (typeof opts.maxAge === "number") pieces.push(`Max-Age=${Math.floor(opts.maxAge)}`);
    return pieces.join("; ");
  }
  