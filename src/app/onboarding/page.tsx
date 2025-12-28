"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { useUser } from "@/hooks/useUser";

function OnboardingContent() {
  const router = useRouter();
  const { profile, isLoading, initialize } = useUser();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && profile?.onboarding_completed) {
      router.push("/chat");
    }
  }, [isLoading, profile, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  return <OnboardingChat />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
