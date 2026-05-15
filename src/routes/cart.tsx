// routes/cart.tsx — cart review + delivery address + auth gate modal.
// Unauthenticated users see a login modal with Google Sign-In highlighted.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash2, MapPin, Clock, CheckCircle2, X, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { signIn, signInWithGoogle, getUserProfile } from "@/lib/auth";

export const Route = createFileRoute("/cart")({ component: CartPage });

type Addr = { line1: string; line2: string; city: string; pincode: string };
type Errors = Partial<Record<keyof Addr, string>>;

function validate(a: Addr): Errors {
  const e: Errors = {};
  if (!a.line1.trim() || a.line1.trim().length < 5) e.line1 = "Address must be at least 5 characters";
  if (!a.city.trim()) e.city = "City is required";
  else if (!/^[A-Za-z\s]+$/.test(a.city)) e.city = "City must contain letters only";
  if (!/^\d{6}$/.test(a.pincode)) e.pincode = "Pincode must be exactly 6 digits";
  return e;
}

// ── Google SVG ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ── Auth Gate Modal ──────────────────────────────────────────────────────────
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      const u = await signInWithGoogle();
      const profile = await getUserProfile(u.uid);
      if (!profile?.name || !profile?.phone) {
        navigate({ to: "/complete-profile" });
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message ?? "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pwd) { setError("Please enter email and password."); return; }
    setLoading(true);
    setError("");
    try {
      await signIn(email, pwd);
      onSuccess();
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError(err.message ?? "Sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-0 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-card shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold">Sign in to place order</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your cart is saved — just sign in to continue!</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google — highlighted */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="relative flex w-full items-center justify-center gap-3 rounded-xl border-2 border-blue-500 bg-blue-50 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          <GoogleIcon />
          Continue with Google
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
            EASY
          </span>
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or sign in with email</span>
          </div>
        </div>

        {/* Email/Password */}
        <form onSubmit={handleEmail} className="space-y-3">
          <label className="block">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </label>

          <label className="block">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={show ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-dark)] disabled:opacity-50"
          >
            {loading ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in…</>
            ) : (
              <>Sign In <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          No account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create one — it's free
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Cart Page ────────────────────────────────────────────────────────────────
function CartPage() {
  const cart = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [addr, setAddr] = useState<Addr>({ line1: "", line2: "", city: "", pincode: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof Addr>>(new Set());
  const [placing, setPlacing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  function touch(k: keyof Addr) {
    setTouchedFields((prev) => new Set(prev).add(k));
    setErrors(validate(addr));
  }

  function update<K extends keyof Addr>(k: K, v: string) {
    const next = { ...addr, [k]: v };
    setAddr(next);
    if (touchedFields.has(k)) setErrors(validate(next));
  }

  async function doPlaceOrder() {
    if (!user) return;
    setPlacing(true);
    try {
      // 1. Parallel availability check — faster and narrower race window than sequential
      const availabilityChecks = await Promise.all(
        cart.items.map((item) => getDoc(doc(db, "menu", item.id)))
      );
      const unavailable = cart.items.find(
        (item, idx) => !availabilityChecks[idx].exists() || !availabilityChecks[idx].data()?.isAvailable
      );
      if (unavailable) {
        alert(`Sorry, "${unavailable.name}" is no longer available. Please remove it from your cart.`);
        setPlacing(false);
        return;
      }

      const ref = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userName: userProfile?.name ?? user.email ?? "Guest",
        userPhone: userProfile?.phone ?? "",
        userEmail: user.email ?? "",
        deliveryAddress: { line1: addr.line1, line2: addr.line2 || "", city: addr.city, pincode: addr.pincode },
        items: cart.items.map((i) => ({ dishId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        totalAmount: cart.total,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Fire-and-forget: notify all admins and delivery partners
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "new_order", orderId: ref.id }),
      }).catch(() => {/* non-critical */});

      cart.clear();
      navigate({ to: "/orders/$orderId", params: { orderId: ref.id } });
    } catch (err) {
      console.error("Order failed:", err);
      alert("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  async function handlePlaceOrder() {
    const e = validate(addr);
    setErrors(e);
    // Mark all required fields as touched so errors become visible
    setTouchedFields(new Set(["line1", "city", "pincode"]));
    let hasError = Object.keys(e).length > 0;
    if (hasError) return;

    if (!user) {
      // Show auth modal — after login call doPlaceOrder
      setShowAuthModal(true);
      return;
    }
    await doPlaceOrder();
  }

  async function handleAuthSuccess() {
    setShowAuthModal(false);
    // Small delay to let auth state propagate
    setTimeout(() => doPlaceOrder(), 400);
  }

  const liveErrors: Errors = {
    line1: touchedFields.has("line1") ? errors.line1 : undefined,
    city:  touchedFields.has("city")  ? errors.city  : undefined,
    pincode: touchedFields.has("pincode") ? errors.pincode : undefined,
  };
  const isValid = useMemo(
    () => Object.keys(validate(addr)).length === 0 && cart.items.length > 0,
    [addr, cart.items.length]
  );

  if (cart.items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 text-center">
        <ShoppingBag className="mb-4 h-16 w-16 text-primary/60" strokeWidth={1.5} />
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a biryani to get started.</p>
        <Link to="/menu" className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-dark)]">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <>
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      <div className="min-h-screen bg-secondary pb-10">
        <header className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Link to="/menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-bold">Your Cart</h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
          {/* Items */}
          <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <ul className="divide-y divide-border">
              {cart.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--primary-light)]">
                    {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5 text-primary/60" strokeWidth={1.5} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">₹{i.price} each · ₹{i.price * i.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-secondary px-1 py-1">
                    <button aria-label={`Decrease quantity of ${i.name}`} onClick={() => cart.dec(i.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-primary hover:bg-primary hover:text-primary-foreground"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-5 text-center text-sm font-semibold">{i.quantity}</span>
                    <button aria-label={`Increase quantity of ${i.name}`} onClick={() => cart.inc(i.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-primary hover:bg-primary hover:text-primary-foreground"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button aria-label={`Remove ${i.name} from cart`} onClick={() => cart.remove(i.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold">₹{cart.total}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-base font-bold">Total</span>
              <span className="text-lg font-bold text-primary">₹{cart.total}</span>
            </div>
          </section>

          {/* Delivery address */}
          <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Delivery Address</h2>
            <div className="grid gap-3">
              <FormField label="Address Line 1" required value={addr.line1} onChange={(v) => update("line1", v)} onBlur={() => touch("line1")} placeholder="House / Flat, Street" error={liveErrors.line1} />
              <FormField label="Address Line 2" value={addr.line2} onChange={(v) => update("line2", v)} placeholder="Landmark (optional)" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City" required value={addr.city} onChange={(v) => update("city", v)} onBlur={() => touch("city")} placeholder="City" error={liveErrors.city} />
                <FormField label="Pincode" required value={addr.pincode} onChange={(v) => update("pincode", v.replace(/\D/g, "").slice(0, 6))} onBlur={() => touch("pincode")} placeholder="6 digits" error={liveErrors.pincode} />
              </div>
            </div>
          </section>

          <button
            onClick={handlePlaceOrder}
            disabled={!isValid || placing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition enabled:hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {placing
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Placing Order…</>
              : <><CheckCircle2 className="h-4 w-4" /> Place Order · ₹{cart.total}</>}
          </button>
        </main>
      </div>
    </>
  );
}

function FormField({ label, value, onChange, onBlur, placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string; required?: boolean; error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label} {required && <span className="text-primary">*</span>}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 ${error ? "border-primary" : "border-input focus:border-primary"}`}
      />
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </label>
  );
}
