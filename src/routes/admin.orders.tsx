// routes/admin.orders.tsx — real-time live orders with search + pagination.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

type Status = "pending" | "preparing" | "ready" | "delivered";
const FLOW: Status[] = ["pending", "preparing", "ready", "delivered"];

const STATUS_STYLE: Record<Status, string> = {
  pending:   "bg-primary/10 text-primary",
  preparing: "bg-[oklch(0.95_0.08_60)] text-[oklch(0.5_0.16_60)]",
  ready:     "bg-[oklch(0.93_0.06_250)] text-[oklch(0.4_0.18_250)]",
  delivered: "bg-[oklch(0.92_0.08_145)] text-[oklch(0.4_0.14_145)]",
};

type Order = {
  id: string;
  userName: string;
  userPhone: string;
  deliveryAddress: { line1: string; line2?: string; city: string; pincode: string };
  items: { name: string; price: number; quantity: number }[];
  totalAmount: number;
  status: Status;
  createdAt: any;
  deliveryTime?: string; // "HH:MM" — customer's requested delivery time
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 10;

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function advanceStatus(order: Order) {
    const idx = FLOW.indexOf(order.status);
    if (idx >= FLOW.length - 1) return;
    const next = FLOW[idx + 1];
    setUpdating(order.id);
    try {
      await updateDoc(doc(db, "orders", order.id), { status: next, updatedAt: serverTimestamp() });
    } finally {
      setUpdating(null);
    }
  }

  function formatTime(ts: any) {
    if (!ts) return "";
    try {
      return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  // Filtered list
  const filtered = search
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.userName?.toLowerCase().includes(q) ||
          o.userPhone?.includes(q) ||
          o.status.toLowerCase().includes(q)
        );
      })
    : orders;

  // Sort: non-delivered orders by deliveryTime asc, then delivered at bottom
  const sorted = [...filtered].sort((a, b) => {
    const aDelivered = a.status === "delivered";
    const bDelivered = b.status === "delivered";
    if (aDelivered !== bDelivered) return aDelivered ? 1 : -1;
    if (a.deliveryTime && b.deliveryTime) return a.deliveryTime.localeCompare(b.deliveryTime);
    if (a.deliveryTime) return -1;
    if (b.deliveryTime) return 1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
        <p className="text-sm text-muted-foreground">Live orders, newest first</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by order ID, customer name, phone or status…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />)}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-xl bg-card p-12 text-center shadow-[var(--shadow-card)]">
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      )}

          {!loading && filtered.length === 0 && search && (
        <p className="py-8 text-center text-sm text-muted-foreground">No orders match "{search}".</p>
      )}

      {!loading && paginated.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {paginated.map((o) => {
              const addr = o.deliveryAddress;
              const nextLabel = FLOW[FLOW.indexOf(o.status) + 1];
              return (
                <article key={o.id} className="rounded-xl bg-card p-5 shadow-[var(--shadow-card)]">
                  <header className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.deliveryTime && (
                        <span className="flex items-center gap-1 rounded-full bg-[oklch(0.93_0.06_250)] px-2.5 py-0.5 text-xs font-bold text-[oklch(0.3_0.18_250)]">
                          🕐 By {o.deliveryTime}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[o.status]}`}>
                        {o.status}
                      </span>
                    </div>
                  </header>

                  <div className="mb-3 rounded-lg bg-secondary p-3 text-sm">
                    <p className="font-semibold">{o.userName}</p>
                    <p className="text-xs text-muted-foreground">{o.userPhone}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city} — {addr.pincode}
                    </p>
                  </div>

                  <ul className="mb-3 space-y-1 text-sm">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span><span className="font-semibold">{i.quantity}×</span> {i.name}</span>
                        <span className="text-muted-foreground">₹{i.price * i.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-base font-bold text-primary">₹{o.totalAmount}</p>
                    {o.status !== "delivered" ? (
                      <button
                        onClick={() => advanceStatus(o)}
                        disabled={updating === o.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-dark)] disabled:opacity-50 capitalize"
                      >
                        {updating === o.id ? "Updating…" : `Mark as ${nextLabel}`}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-[oklch(0.4_0.14_145)]">Completed</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
