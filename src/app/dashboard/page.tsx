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
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-stone-600">Redirecting...</div>
    </div>
  );
}
