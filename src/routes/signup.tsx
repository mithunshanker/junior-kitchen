// routes/signup.tsx — Firebase email/password registration.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { signUp, getUserProfile, signInWithGoogle } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    // Validate phone: 7–15 digits, optional leading +
    if (!/^\+?[0-9]{7,15}$/.test(form.phone.replace(/\s/g, ""))) {
      setError("Please enter a valid phone number (digits only, 7–15 characters).");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(form.email, form.password, form.name, form.phone);
      navigate({ to: "/menu" });
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError(err.message ?? "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    try {
      const user = await signInWithGoogle();
      const profile = await getUserProfile(user.uid);
      if (!profile?.name || !profile?.phone) {
        navigate({ to: "/complete-profile" });
      } else if (profile?.role === "admin") {
        navigate({ to: "/admin" });
      } else if (profile?.role === "delivery") {
        navigate({ to: "/admin/orders" });
      } else {
        navigate({ to: "/menu" });
      }
    } catch (err: any) {
      if (err.code === "auth/account-exists-with-different-credential") {
        setError("An account exists with a different credential. Use email/password.");
      } else {
        setError(err.message ?? "Google Sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-20 w-auto" />
          <p className="mt-3 font-[Dancing_Script] text-2xl text-primary">Eat Heavy, Feel Lighter</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <h1 className="mb-1 text-xl font-bold">Create your account</h1>
          <p className="mb-5 text-sm text-muted-foreground">Join us in seconds</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Field icon={<User className="h-4 w-4" />} label="Full Name">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field icon={<Phone className="h-4 w-4" />} label="Phone Number">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field icon={<Mail className="h-4 w-4" />} label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field icon={<Lock className="h-4 w-4" />} label="Password">
            <input
              type={show ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-dark)] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating account…
              </span>
            ) : (
              <>Sign Up <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background py-3 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}
