"use client";

// Clerk + data wiring for /account. Every screen itself lives in account-view.tsx.
import { SignInButton, SignOutButton, useAuth, useClerk } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { type ClientMember, type MemberLoadFailure, loadMemberProfile, saveMemberProfile } from "@/lib/member-client";
import {
  AccountErrorView,
  AccountLoadingView,
  MemberAccountView,
  type SaveProfile,
  SignedOutView,
} from "./account-view";

export default function AccountClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [member, setMember] = useState<ClientMember | null>(null);
  const [failure, setFailure] = useState<MemberLoadFailure | null>(null);
  const [now, setNow] = useState(0);

  const applyLoad = useCallback((result: Awaited<ReturnType<typeof loadMemberProfile>>) => {
    if (result.ok) {
      setMember(result.member);
      setFailure(null);
      setNow(Date.now());
    } else {
      setFailure(result.failure);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    void loadMemberProfile().then((result) => { if (active) applyLoad(result); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, applyLoad]);

  const retry = useCallback(() => {
    setFailure(null);
    void loadMemberProfile().then(applyLoad);
  }, [applyLoad]);

  const save: SaveProfile = useCallback(async (input) => {
    const result = await saveMemberProfile(input);
    if (!result.ok) return result;
    setMember(result.member);
    setNow(Date.now());
    return { ok: true };
  }, []);

  const signOut = <SignOutButton><button className="account-signout" type="button">登出帳號</button></SignOutButton>;

  if (!isLoaded) return <AccountLoadingView />;
  if (!isSignedIn) {
    return <SignedOutView signIn={<SignInButton mode="modal"><button className="account-primary" type="button">Email 登入</button></SignInButton>} />;
  }
  // A failed request is shown as its own screen, never as "not yet activated".
  if (failure) {
    return <AccountErrorView failure={failure} onRetry={retry} signOut={signOut} onManageAccount={() => clerk.openUserProfile()} />;
  }
  if (!member) return <AccountLoadingView />;
  return <MemberAccountView member={member} now={now} onSave={save} signOut={signOut} />;
}
