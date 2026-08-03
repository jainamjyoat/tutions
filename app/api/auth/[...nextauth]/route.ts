import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedTeacherEmail = process.env.TEACHER_EMAIL;

      if (user?.email && user.email.toLowerCase() === allowedTeacherEmail?.toLowerCase()) {
        return true;
      }

      return "/login?error=AccessDenied";
    },
    async jwt({ token, user, profile }) {
      // Safely narrow the profile picture type or fall back to user.image
      if (profile && "picture" in profile && typeof profile.picture === "string") {
        token.picture = profile.picture;
      } else if (user?.image) {
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };