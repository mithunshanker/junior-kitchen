// routes/orders.$orderId.tsx — real-time order tracking via Firestore onSnapshot.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Receipt, ChefHat, Package, CheckCircle2, MapPin, User, Clock } from "lucide-react";
import { Logo } from "@/components/logo";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderTrackingPage });

const STEPS = [
  { key: "pending",   label: "Pending",   icon: Receipt,      message: "We've received your order 🎉" },
  { key: "preparing", label: "Preparing", icon: ChefHat,      message: "Your order is being prepared with love 🍛" },
  { key: "ready",     label: "Ready",     icon: Package,      message: "Your order is ready and on its way 🛵" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, message: "Enjoy your meal! Eat Heavy, Feel Lighter ❤️" },
];

type OrderDoc = {
  status: string;
  userName: string;
  userPhone: string;
  totalAmount: number;
  deliveryAddress: { line1: string; line2?: string; city: string; pincode: string };
  items: { name: string; price: number; quantity: number }[];
  deliveryTime?: string;
};

function OrderTrackingPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) setOrder(snap.data() as OrderDoc);
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 text-center">
        <h1 className="text-xl font-bold">Order not found</h1>
        <Link to="/menu" className="mt-4 text-sm text-primary hover:underline">Back to menu</Link>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const currentStep = stepIndex >= 0 ? stepIndex : 0;
  const status = STEPS[currentStep];
  const addr = order.deliveryAddress;

  return (
    <div className="min-h-screen bg-secondary pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo className="h-9 w-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {/* Status card */}
        <section className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Order #{orderId.slice(0, 8).toUpperCase()}
            </p>
            <span className="rounded-full bg-[var(--primary-light)] px-2.5 py-0.5 text-xs font-semibold text-primary">
              {status.label}
            </span>
          </div>
          <p className="text-base font-semibold text-foreground">{status.message}</p>

          {order.deliveryTime && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[oklch(0.93_0.06_250)]/60 px-3 py-2 text-sm">
              <Clock className="h-4 w-4 text-[oklch(0.35_0.18_250)]" />
              <span className="font-medium text-[oklch(0.3_0.18_250)]">
                Requested delivery by <strong>{order.deliveryTime}</strong>
              </span>
            </div>
          )}

          {/* Progress stepper */}
          <div className="mt-6 flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center">
                  <div className="relative flex w-full items-center">
                    {i > 0 && <div className={`absolute left-0 right-1/2 top-1/2 h-1 -translate-y-1/2 ${done ? "bg-primary" : "bg-border"}`} />}
                    {i < STEPS.length - 1 && <div className={`absolute left-1/2 right-0 top-1/2 h-1 -translate-y-1/2 ${i < currentStep ? "bg-primary" : "bg-border"}`} />}
                    <div className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full transition ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"} ${active ? "ring-4 ring-primary/20" : ""}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className={`mt-2 text-center text-[11px] font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Order summary */}
        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Receipt className="h-4 w-4 text-primary" /> Order Summary</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span><span className="font-medium">{i.quantity}×</span> {i.name}</span>
                <span className="text-muted-foreground">₹{i.price * i.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-border" />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">₹{order.totalAmount}</span>
          </div>
        </section>

        {/* Delivery address */}
        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Delivery Address</h2>
          <p className="text-sm text-muted-foreground">
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
            {addr.city} — {addr.pincode}
          </p>
        </section>

        {/* Customer info */}
        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-primary" /> Customer Info</h2>
          <p className="text-sm text-muted-foreground">
            {order.userName}<br />
            {order.userPhone}
          </p>
        </section>
      </main>
    </div>
  );
}
