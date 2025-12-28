"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Dashboard is no longer the primary interface.
// Redirect to chat - users access tasks from the menu.
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[var(--background)]">
      <div className="text-[var(--foreground-muted)]">Redirecting...</div>
    </div>
  );
}
