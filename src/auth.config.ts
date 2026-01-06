/**
 * Edge-compatible NextAuth configuration
 *
 * This file contains auth config that works in edge runtime (middleware).
 * It excludes database access and bcrypt which require Node.js crypto.
 *
 * Used by: middleware.ts (edge runtime)
 * Extended by: auth.ts (Node.js runtime with full authorize logic)
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

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

/**
 * Base auth config - edge compatible (no DB/bcrypt)
 * The authorize function is intentionally omitted here.
 * It will be added in auth.ts which runs in Node.js runtime.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // Credentials provider placeholder - authorize added in auth.ts
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is intentionally not defined here for edge compatibility
      // It will be overridden in auth.ts
      authorize: () => null,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
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
    // Authorization callback for middleware route protection
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes
      const publicRoutes = ["/login", "/api/auth", "/forbidden"];
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (isPublicRoute) return true;

      // Require authentication for all other routes
      if (!isLoggedIn) return false;

      // Role-based route access
      const roleRoutes: Record<string, string[]> = {
        "/requests": ["ADMIN", "SELLER", "OPERATOR", "ACCOUNTANT"],
        "/operators": ["ADMIN", "OPERATOR", "ACCOUNTANT"],
        "/revenues": ["ADMIN", "ACCOUNTANT"],
        "/suppliers": ["ADMIN", "ACCOUNTANT"],
        "/settings": ["ADMIN"],
      };

      const userRole = auth?.user?.role;

      // Check role-based access
      for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
          if (userRole === "ADMIN") return true;
          if (!allowedRoles.includes(userRole as string)) {
            return Response.redirect(new URL("/forbidden", nextUrl));
          }
        }
      }

      return true;
    },
  },
};
