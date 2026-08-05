import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account", // Forces Google account selector screen
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      const allowedTeacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
      const currentEmail = (user?.email || token?.email)?.trim().toLowerCase();

      if (currentEmail && allowedTeacherEmail && currentEmail === allowedTeacherEmail) {
        token.role = "TEACHER";
        token.isApproved = true;
      } else {
        token.role = "STUDENT";
        if (currentEmail) {
          const dbUser = await prisma.user.findFirst({
            where: { email: { equals: currentEmail, mode: "insensitive" } },
          });
          token.isApproved = dbUser?.status === "APPROVED";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.image = token.picture as string;
        (session.user as any).role = token.role;
        (session.user as any).isApproved = token.isApproved;
      }
      return session;
    },
  },
  // 💡 GUARANTEE: Fires immediately when a deleted student signs back in, marking them PENDING in Supabase
  events: {
    async createUser({ user }) {
      const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
      const userEmail = user.email?.trim().toLowerCase();

      if (userEmail && userEmail !== teacherEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: "STUDENT",
            status: "PENDING",
          },
        });
      }
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