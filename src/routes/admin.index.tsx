// routes/admin.index.tsx — live dashboard: order counts + online users via onSnapshot.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, ChefHat, Package, CheckCircle2, Clock, Users } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

type OrderSummary = { id: string; userName: string; totalAmount: number; status: string };

function Dashboard() {
  const [counts, setCounts] = useState({ total: 0, pending: 0, preparing: 0, ready: 0, delivered: 0 });
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);

  // Real-time order counts
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const docs = snap.docs.map((d) => d.data().status as string);
      setCounts({
        total: docs.length,
        pending: docs.filter((s) => s === "pending").length,
        preparing: docs.filter((s) => s === "preparing").length,
        ready: docs.filter((s) => s === "ready").length,
        delivered: docs.filter((s) => s === "delivered").length,
      });
    });
    return () => unsub();
  }, []);

  // Real-time online customer count
  useEffect(() => {
    const q = query(collection(db, "sessions"), where("isOnline", "==", true));
    const unsub = onSnapshot(q, (snap) => setOnlineCount(snap.size));
    return () => unsub();
  }, []);

  // Recent orders (last 4)
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(4));
    const unsub = onSnapshot(q, (snap) => {
      setRecentOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderSummary)));
    });
    return () => unsub();
  }, []);

  const STATUS_COLOR: Record<string, string> = {
    pending: "text-primary", preparing: "text-[oklch(0.5_0.16_60)]",
    ready: "text-[oklch(0.4_0.18_250)]", delivered: "text-[oklch(0.4_0.14_145)]",
  };

  const STATS = [
    { label: "Total Orders", value: counts.total, icon: Receipt },
    { label: "Pending", value: counts.pending, icon: Clock },
    { label: "Preparing", value: counts.preparing, icon: ChefHat },
    { label: "Ready", value: counts.ready, icon: Package },
    { label: "Delivered", value: counts.delivered, icon: CheckCircle2 },
    { label: "Online Customers", value: onlineCount, icon: Users, live: true },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live overview of Junior Kitchen Briyani</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden rounded-xl border-l-4 border-primary bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-bold">{s.value}</p>
              {s.live && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.4_0.14_145)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.4_0.14_145)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.4_0.14_145)]" />
                  </span>
                  Live now
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-semibold">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5">
                <div>
                  <p className="font-medium">#{o.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{o.userName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{o.totalAmount}</p>
                  <p className={`text-xs font-medium capitalize ${STATUS_COLOR[o.status] ?? "text-primary"}`}>{o.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
