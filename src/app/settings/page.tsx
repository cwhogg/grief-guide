"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, isLoading, initialize, signOut } = useUser();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    }
  }, [isLoading, profile, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleRestartOnboarding = async () => {
    await signOut();
    router.push("/onboarding");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--background)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--gray-200)] px-5 py-3 safe-area-top">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/chat"
            className="text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-semibold text-[var(--gray-900)]">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Profile Section */}
        <section className="card">
          <h2 className="font-semibold text-[var(--gray-900)] mb-4">Your Profile</h2>

          <div className="space-y-3 text-sm">
            {profile?.full_name && (
              <div className="flex justify-between">
                <span className="text-[var(--gray-500)]">Name</span>
                <span className="text-[var(--gray-900)]">{profile.full_name}</span>
              </div>
            )}
            {profile?.deceased_name && (
              <div className="flex justify-between">
                <span className="text-[var(--gray-500)]">Parent's name</span>
                <span className="text-[var(--gray-900)]">{profile.deceased_name}</span>
              </div>
            )}
            {profile?.state && (
              <div className="flex justify-between">
                <span className="text-[var(--gray-500)]">State</span>
                <span className="text-[var(--gray-900)]">{profile.state}</span>
              </div>
            )}
            {profile?.grief_stage && (
              <div className="flex justify-between">
                <span className="text-[var(--gray-500)]">Stage</span>
                <span className="text-[var(--gray-900)] capitalize">
                  {profile.grief_stage === "anticipating"
                    ? "Preparing"
                    : profile.grief_stage === "immediate"
                    ? "Just happened"
                    : "Navigating"}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Actions Section */}
        <section className="card space-y-4">
          <h2 className="font-semibold text-[var(--gray-900)] mb-4">Actions</h2>

          <button
            onClick={handleRestartOnboarding}
            className="w-full text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--gray-200)] hover:bg-[var(--gray-50)] transition-colors min-h-[56px]"
          >
            <div className="font-medium text-[var(--gray-900)]">Restart onboarding</div>
            <div className="text-sm text-[var(--gray-500)]">Update your situation and preferences</div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--error)]/30 hover:bg-[var(--error)]/5 transition-colors min-h-[56px]"
          >
            <div className="font-medium text-[var(--error)]">Log out</div>
            <div className="text-sm text-[var(--gray-500)]">Clear your data and start fresh</div>
          </button>
        </section>

        {/* About Section */}
        <section className="card">
          <h2 className="font-semibold text-[var(--gray-900)] mb-4">About</h2>
          <p className="text-sm text-[var(--gray-600)] mb-4">
            Grief Guide helps you navigate the practical matters after losing a parent.
            This is a demo version—your data is stored locally in your browser.
          </p>
          <div className="text-xs text-[var(--gray-400)]">
            Version 0.1.0 (Demo)
          </div>
        </section>

        {/* Crisis Resources */}
        <section className="bg-[var(--purple-light)]/30 rounded-[var(--radius-lg)] border border-[var(--purple-light)] p-6">
          <h2 className="font-semibold text-[var(--gray-900)] mb-2">Crisis Support</h2>
          <p className="text-sm text-[var(--gray-600)] mb-4">
            If you're in crisis or need immediate support, help is available 24/7.
          </p>
          <div className="flex gap-4">
            <a
              href="tel:988"
              className="text-sm font-medium text-[var(--purple-main)] hover:underline"
            >
              Call or text 988
            </a>
            <a
              href="https://988lifeline.org/chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--purple-main)] hover:underline"
            >
              Chat online
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
