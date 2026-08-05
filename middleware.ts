import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if the authenticated user is a Teacher
    const isTeacher =
      token?.role === "TEACHER" || token?.role === "teacher";

    // 1. If Teacher tries to open Student Dashboard -> Send to Teacher Dashboard
    if (path.startsWith("/student-dashboard") && isTeacher) {
      return NextResponse.redirect(new URL("/teacher-dashboard", req.url));
    }

    // 2. If non-Teacher tries to open Teacher Dashboard -> Send to Student Dashboard
    if (path.startsWith("/teacher-dashboard") && !isTeacher) {
      return NextResponse.redirect(new URL("/student-dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Authorized only if session token exists
      authorized: ({ token }) => !!token,
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

// Protect ONLY dashboard routes (ignores login, api, and static files)
export const config = {
  matcher: [
    "/student-dashboard/:path*",
    "/teacher-dashboard/:path*",
  ],
};