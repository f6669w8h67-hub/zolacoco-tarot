"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useContext, type ReactNode } from "react";

// Who is signed in, for public pages that show private things to members (覺察卡).
// Inside ClerkProvider it follows sign-in, sign-out and account switches; without Clerk
// (local preview) it stays "unknown", so the page asks the server once.
type Identity = { known: boolean; loaded: boolean; userId: string | null };

const IdentityContext = createContext<Identity>({ known: false, loaded: true, userId: null });

export function ClerkIdentityProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  return <IdentityContext.Provider value={{ known: true, loaded: isLoaded, userId: userId ?? null }}>{children}</IdentityContext.Provider>;
}

/**
 * A key that changes whenever the person changes: null while Clerk loads, "signed-out",
 * the Clerk user id, or "unknown" when Clerk is not set up.
 */
export function useIdentityKey() {
  const identity = useContext(IdentityContext);
  if (!identity.known) return "unknown";
  if (!identity.loaded) return null;
  return identity.userId ?? "signed-out";
}
