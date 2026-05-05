// routes/index.tsx — splash screen, redirects based on auth state.
// Admin → /admin | Customer → /menu | Unauthenticated → /menu (free browse)

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: SplashPage,
});

function SplashPage() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (userProfile?.role === "admin") {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/menu" });
    }
  }, [loading, user, userProfile, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4">
      <div className="flex flex-col items-center gap-6">
        <Logo className="h-28 w-auto" />
        <p className="font-[Dancing_Script] text-2xl text-primary">Eat Heavy, Feel Lighter</p>
        <div className="mt-2 h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    </div>
  );
}
