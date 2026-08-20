import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      return true;
    },

    async jwt({ token, user }) {
      const allowedTeacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
      const currentEmail = (user?.email || token?.email)?.trim().toLowerCase();

      if (currentEmail && allowedTeacherEmail && currentEmail === allowedTeacherEmail) {
        token.role = "TEACHER";
        token.isApproved = true;
      } else {
        token.role = "STUDENT";

        if (currentEmail) {
          try {
            const dbUser = await prisma.user.findFirst({
              where: { email: { equals: currentEmail, mode: "insensitive" } },
              select: { id: true, status: true, role: true },
            });

            if (dbUser) {
              token.id = dbUser.id;
              const statusStr = (dbUser.status || "").toLowerCase();
              token.isApproved = statusStr === "approved" || statusStr === "active";
            }
          } catch (err) {
            console.error("Database lookup warning inside jwt callback:", err);
          }
        }
      }

      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role || "STUDENT";
        (session.user as any).isApproved = token.isApproved || false;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
      const userEmail = user.email?.trim().toLowerCase();

      if (userEmail && userEmail !== teacherEmail) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              role: "STUDENT",
              status: "pending",
            },
          });
        } catch (err) {
          console.error("Error setting initial student status:", err);
        }
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