/**
 * Full NextAuth configuration with database access
 *
 * This file contains the complete auth setup including:
 * - Database user lookup (Prisma)
 * - Password verification (bcryptjs)
 *
 * Used by: API routes, server components (Node.js runtime only)
 * For edge runtime (middleware), use auth.config.ts instead
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

// Validate AUTH_SECRET at startup
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    "AUTH_SECRET must be set and at least 32 characters. Generate: openssl rand -base64 32"
  );
}

// Dummy hash for timing attack prevention
const DUMMY_HASH = "$2a$10$dummyHashToPreventTimingAttackXXXXXXXXXXXXXX";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Override providers with full authorize function (requires Node.js)
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
});
