import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Get session token from cookies
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isPublicPage = request.nextUrl.pathname === "/";

  // Debug logging
  console.log("[Middleware]", {
    pathname: request.nextUrl.pathname,
    hasSessionToken: !!sessionToken,
    isAuthPage,
    isPublicPage,
  });

  // If no session and trying to access protected route, redirect to login
  if (!sessionToken && !isAuthPage && !isPublicPage) {
    console.log("[Middleware] Redirecting to login - no session");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has session and trying to access auth pages, redirect to dashboard
  if (sessionToken && isAuthPage) {
    console.log("[Middleware] Redirecting to dashboard - has session on auth page");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handled separately)
     * - _next (Next.js internals)
     * - static files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
