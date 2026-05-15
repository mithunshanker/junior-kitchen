// routes/admin.delivery.tsx — Delivery Partners management page for admin.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Phone, Mail, ChevronLeft, ChevronRight, Search, X, UserMinus } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/delivery")({ component: AdminDelivery });

type UserDoc = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  createdAt: any;
};

type OrderDoc = {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  deliveryAddress: { line1: string; line2?: string; city: string; pincode: string };
};

function AdminDelivery() {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "admin";
  const [partners, setPartners] = useState<UserDoc[]>([]);
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [search, setSearch] = useState("");

  // Load all delivery partners
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "delivery"));
    const unsub = onSnapshot(q, (snap) => {
      setPartners(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserDoc)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load all orders for joining
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc)));
    });
    return () => unsub();
  }, []);

  function formatDate(ts: any) {
    if (!ts) return "—";
    try { return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "—"; }
  }

  function ordersFor(uid: string) {
    return orders.filter((o) => o.userId === uid);
  }

  function addrString(addr: OrderDoc["deliveryAddress"]) {
    return `${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city} — ${addr.pincode}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery Partners</h1>
        <p className="text-sm text-muted-foreground">Manage your delivery team</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email or phone…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}
        </div>
      )}

      {!loading && partners.length === 0 && (
        <div className="rounded-xl bg-card p-12 text-center shadow-[var(--shadow-card)]">
          <p className="text-muted-foreground">No delivery partners yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Go to Customers and assign someone the delivery role.</p>
        </div>
      )}

      {!loading && partners.length > 0 && (() => {
        const q = search.toLowerCase();
        const filtered = search
          ? partners.filter(c =>
              c.name?.toLowerCase().includes(q) ||
              c.email?.toLowerCase().includes(q) ||
              c.phone?.includes(q)
            )
          : partners;
        const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        return (
          <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)]">
            {/* Table header */}
            <div className="hidden grid-cols-12 gap-3 border-b border-border bg-secondary px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <p className="col-span-3">Name</p>
              <p className="col-span-3">Email</p>
              <p className="col-span-3">Phone</p>
              <p className="col-span-2">Joined</p>
              <p className="col-span-1 text-right">Deliveries</p>
            </div>

            <ul className="divide-y divide-border">
              {paginated.map((c) => {
                const expanded = open === c.uid;
                const userOrders = ordersFor(c.uid);
                return (
                  <li key={c.uid}>
                    <button
                      onClick={() => setOpen(expanded ? null : c.uid)}
                      className="grid w-full grid-cols-1 gap-2 px-5 py-4 text-left transition hover:bg-secondary md:grid-cols-12 md:items-center md:gap-3"
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[oklch(0.4_0.18_250)] text-xs font-bold text-white">
                          {(c.name?.trim() || "?").split(" ").filter(Boolean).map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <p className="font-semibold">{c.name}</p>
                      </div>
                      <p className="col-span-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 md:hidden" /> {c.email}
                      </p>
                      <p className="col-span-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 md:hidden" /> {c.phone}
                      </p>
                      <p className="col-span-2 text-sm text-muted-foreground">{formatDate(c.createdAt)}</p>
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <span className="rounded-full bg-[oklch(0.93_0.06_250)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.3_0.18_250)]">
                          {userOrders.length}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isAdmin && (
                      <div className="flex justify-end border-t border-border px-5 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Demote ${c.name} back to Customer?`)) {
                              updateDoc(doc(db, "users", c.uid), { role: "customer" });
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Demote to Customer
                        </button>
                      </div>
                    )}

                    {expanded && (
                      <div className="border-t border-border bg-secondary/50 px-5 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Order History ({userOrders.length})
                        </p>
                        {userOrders.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No orders yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {userOrders.map((o) => (
                              <li key={o.id} className="flex flex-col gap-1 rounded-lg bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold">#{o.id.slice(0, 8).toUpperCase()}</p>
                                  <p className="text-xs text-muted-foreground">{addrString(o.deliveryAddress)}</p>
                                  <p className="text-xs capitalize text-muted-foreground">{formatDate(o.createdAt)}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                  <p className="font-bold text-primary">₹{o.totalAmount}</p>
                                  <p className="text-xs capitalize text-muted-foreground">{o.status}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))}
                  disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                  className="flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
