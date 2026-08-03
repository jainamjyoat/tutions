import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const allowedTeacherEmail = process.env.TEACHER_EMAIL;

    const isTeacher =
      token?.email &&
      token.email.toLowerCase() === allowedTeacherEmail?.toLowerCase();

    // If attempting to access /teacher-dashboard and is not the authorized teacher
    if (req.nextUrl.pathname.startsWith("/teacher-dashboard") && !isTeacher) {
      return NextResponse.redirect(new URL("/login?error=AccessDenied", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Apply middleware strictly to the teacher dashboard route and its sub-routes
export const config = {
  matcher: ["/teacher-dashboard/:path*"],
};