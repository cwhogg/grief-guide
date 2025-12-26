"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

export default function Home() {
  const router = useRouter();
  const { user, profile, isLoading, initialize } = useUser();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && user) {
      if (profile?.onboarding_completed) {
        router.push("/chat");
      } else {
        router.push("/onboarding");
      }
    }
  }, [isLoading, user, profile, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold text-stone-900 mb-6">
            Grief Guide
          </h1>
          <p className="text-xl text-stone-600 mb-4 max-w-2xl mx-auto">
            A gentle companion for navigating life after losing a parent.
          </p>
          <p className="text-lg text-stone-500 mb-10 max-w-xl mx-auto">
            We help you manage the practical tasks while honoring your need to grieve.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="px-8 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="font-semibold text-stone-900 mb-2">Guided Task Lists</h3>
            <p className="text-stone-600 text-sm">
              Know what to do and when, from immediate needs to long-term tasks, personalized to your situation.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-stone-900 mb-2">Supportive Guidance</h3>
            <p className="text-stone-600 text-sm">
              Get answers to your questions and emotional support whenever you need it, day or night.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-stone-900 mb-2">Find Help</h3>
            <p className="text-stone-600 text-sm">
              Connect with grief counselors, attorneys, CPAs, and other professionals when you need them.
            </p>
          </div>
        </div>

        {/* Reassurance */}
        <div className="mt-16 text-center">
          <p className="text-stone-500 text-sm">
            You don't have to figure this out alone. We're here to help.
          </p>
        </div>
      </div>

      {/* Crisis Footer */}
      <footer className="border-t border-stone-200 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-stone-500 mb-2">
            In crisis or need immediate support?
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="tel:988" className="text-violet-600 hover:text-violet-700 font-medium">
              Call or text 988
            </a>
            <span className="text-stone-300">|</span>
            <a
              href="https://988lifeline.org/chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 font-medium"
            >
              Chat online
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
