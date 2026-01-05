import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

// Validate AUTH_SECRET at startup
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    "AUTH_SECRET must be set and at least 32 characters. Generate: openssl rand -base64 32"
  );
}

// Dummy hash for timing attack prevention
const DUMMY_HASH = "$2a$10$dummyHashToPreventTimingAttackXXXXXXXXXXXXXX";

type RoleType = "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR";

// Extend types for role
declare module "next-auth" {
  interface User {
    role: RoleType;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: RoleType;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleType;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        // Always run bcrypt to prevent timing attacks
        const hashedPassword = user?.password ?? DUMMY_HASH;
        const isValid = await compare(
          credentials.password as string,
          hashedPassword
        );

        if (!user || !user.password || !isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours per validation
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleType;
      }
      return session;
    },
  },
});
