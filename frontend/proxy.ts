import { NextResponse, type NextRequest } from "next/server";

// First gate for the staff dashboard: no session cookie means straight to login.
// This only checks that a cookie exists; the Express API verifies the session on every /api/staff request,
// which is the real access control.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("qw_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
