// routes/orders.index.tsx — customer's order history.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Receipt, ChevronRight, Search, X, Clock, Bell } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/contexts/AuthContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const Route = createFileRoute("/orders/")({ component: CustomerOrdersPage });

type OrderSummary = {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  items: { name: string; quantity: number }[];
};

function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState("");
  const { permission, loading: pushLoading, requestPermission } = usePushNotifications();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderSummary));
        // Orders with null createdAt (pending serverTimestamp write) sort to the end
        docs.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() ?? -1;
          const tB = b.createdAt?.toMillis?.() ?? -1;
          return tB - tA; // descending
        });
        setOrders(docs);
        setLoadingOrders(false);
      },
      (err) => {
        console.error("Failed to fetch orders:", err);
        setLoadingOrders(false);
      }
    );

    return () => unsub();
  }, [user, loading, navigate]);

  function formatDate(ts: any) {
    if (!ts) return "";
    try {
      return ts.toDate().toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch { return ""; }
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: "text-primary", preparing: "text-[oklch(0.5_0.16_60)]",
    ready: "text-[oklch(0.4_0.18_250)]", delivered: "text-[oklch(0.4_0.14_145)]",
  };

  if (loading || loadingOrders) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo className="h-9 w-auto" />
          <h1 className="ml-2 font-bold">My Orders</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Notification opt-in banner */}
        {permission === "unknown" && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-[var(--primary-light)] px-4 py-3">
            <Bell className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Get order updates</p>
              <p className="text-xs text-muted-foreground">Enable notifications to know when your order is ready.</p>
            </div>
            <button
              onClick={requestPermission}
              disabled={pushLoading}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-[var(--primary-dark)] disabled:opacity-50"
            >
              {pushLoading ? "…" : "Enable"}
            </button>
          </div>
        )}

        {/* Search */}
        {orders.length > 0 && (
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders by ID, status or item…"
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {(() => {
          const q = search.toLowerCase();
          const filtered = search
            ? orders.filter(o =>
                o.id.toLowerCase().includes(q) ||
                o.status.toLowerCase().includes(q) ||
                o.items.some(i => i.name.toLowerCase().includes(q))
              )
            : orders;

          if (filtered.length === 0 && search) {
            return <p className="py-8 text-center text-sm text-muted-foreground">No orders match "{search}".</p>;
          }

          if (filtered.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-12 text-center shadow-[var(--shadow-card)]">
                <Receipt className="mb-3 h-12 w-12 text-primary/60" strokeWidth={1.5} />
                <h2 className="text-lg font-semibold">No orders yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">You haven't placed any orders.</p>
                <Link to="/menu" className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-dark)]">
                  Browse Menu
                </Link>
              </div>
            );
          }

          return (
            <div className="space-y-4">
            {filtered.map((o) => (
              <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="block rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] transition hover:bg-[var(--primary-light)]/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Order #{o.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold capitalize ${STATUS_COLOR[o.status] || "text-primary"}`}>
                      {o.status}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="truncate text-sm text-foreground">
                    {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </p>
                  <p className="mt-1 font-bold text-primary">₹{o.totalAmount}</p>
                </div>
              </Link>
            ))}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
