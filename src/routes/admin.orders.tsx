import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, X, History, Activity, Loader2 } from "lucide-react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, serverTimestamp, where, getDocs, limit, startAfter } from "firebase/firestore";
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
  deliveryTime?: string;
};

function AdminOrders() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [previousOrders, setPreviousOrders] = useState<Order[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 10;

  // 1. Real-time listener for ACTIVE orders ONLY (pending, preparing, ready)
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "preparing", "ready"]),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoadingActive(false);
    }, (err) => {
      console.error("Orders listener error:", err);
      setLoadingActive(false);
    });
    return () => unsub();
  }, []);

  // 2. Paginated fetch for PREVIOUS orders (delivered)
  async function fetchPrevious(loadMore = false) {
    setLoadingPrev(true);
    try {
      let q = query(
        collection(db, "orders"),
        where("status", "==", "delivered"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastDoc) {
        q = query(
          collection(db, "orders"),
          where("status", "==", "delivered"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE),
          startAfter(lastDoc)
        );
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      
      setPreviousOrders(prev => loadMore ? [...prev, ...list] : list);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setShowPrevious(true);
    } catch (err) {
      console.error("Failed to fetch previous orders:", err);
    } finally {
      setLoadingPrev(false);
    }
  }

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

  const displayedOrders = showPrevious ? previousOrders : activeOrders;

  const filtered = search
    ? displayedOrders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.userName?.toLowerCase().includes(q) ||
          o.userPhone?.includes(q) ||
          o.status.toLowerCase().includes(q)
        );
      })
    : displayedOrders;

  // Sort active orders: by deliveryTime asc if available, else by createdAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (showPrevious) return 0; // Server already sorted these
    if (a.deliveryTime && b.deliveryTime) return a.deliveryTime.localeCompare(b.deliveryTime);
    if (a.deliveryTime) return -1;
    if (b.deliveryTime) return 1;
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
          <p className="text-sm text-muted-foreground">
            {showPrevious ? "Viewing delivered orders" : "Live orders, newest first"}
          </p>
        </div>
        
        <div className="flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setShowPrevious(false)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              !showPrevious ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" /> Active
          </button>
          <button
            onClick={() => { if (previousOrders.length === 0) fetchPrevious(); else setShowPrevious(true); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              showPrevious ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" /> Previous
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${showPrevious ? "previous" : "active"} orders…`}
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(loadingActive || (loadingPrev && previousOrders.length === 0)) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />)}
        </div>
      )}

      {!(loadingActive || loadingPrev) && filtered.length === 0 && (
        <div className="rounded-xl bg-card p-12 text-center shadow-[var(--shadow-card)]">
          <p className="text-muted-foreground">No {showPrevious ? "previous" : "active"} orders found.</p>
        </div>
      )}

      {!loadingActive && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {sorted.map((o) => {
              const addr = o.deliveryAddress;
              const nextLabel = FLOW[FLOW.indexOf(o.status) + 1];
              return (
                <article key={o.id} className="rounded-xl bg-card p-5 shadow-[var(--shadow-card)]">
                  <header className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">#{o.id.slice(0, 8).toUpperCase()}</p>
                        {o.userPhone ? (
                          <a 
                            href={`tel:${o.userPhone}`} 
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            📞 {o.userPhone}
                          </a>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">No phone</span>
                        )}
                      </div>
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
                    <p className="text-xs text-muted-foreground">
                      {o.userPhone ? `Phone: ${o.userPhone}` : "No phone provided"}
                    </p>
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

          {showPrevious && hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchPrevious(true)}
                disabled={loadingPrev}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors shadow-sm"
              >
                {loadingPrev ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  "Show More Previous Orders"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
