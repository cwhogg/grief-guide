"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useUser } from "@/hooks/useUser";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, initialize } = useUser();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (!isLoading && profile?.onboarding_completed) {
      router.push("/dashboard");
    }
  }, [isLoading, user, profile, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <OnboardingWizard />
      </div>
    </main>
  );
}
