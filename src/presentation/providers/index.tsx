"use client";

import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

/**
 * Composes all client-side providers in one place so the root layout (a server
 * component) stays clean. Order: Query outermost, Auth inside (auth-driven
 * queries can then read the client).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
