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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return <OnboardingChat />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
