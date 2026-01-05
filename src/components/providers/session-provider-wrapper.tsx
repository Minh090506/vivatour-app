"use client";

/**
 * SessionProvider Wrapper
 *
 * Client component wrapper for NextAuth SessionProvider.
 * Required because SessionProvider must be used in client components,
 * but layout.tsx is a server component by default.
 */

import { SessionProvider } from "next-auth/react";

interface SessionProviderWrapperProps {
  children: React.ReactNode;
}

export function SessionProviderWrapper({
  children,
}: SessionProviderWrapperProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
