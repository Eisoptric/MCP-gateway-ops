import { NextRequest, NextResponse } from "next/server";

import { originAllowed } from "@/lib/edge";

// Runs before every page and before the /gateway-api rewrite, so nothing on this service answers
// a request that did not come through Cloudflare (and with it, Cloudflare Access).
export function proxy(request: NextRequest) {
  if (!originAllowed((name) => request.headers.get(name), process.env)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  // Static build files carry no data. Everything else, the API rewrite included, is gated.
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
