import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Pencil, Trash2, Plus, X, Search, Loader2 } from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, limit, startAfter, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Dish } from "@/lib/cart-context";

export const Route = createFileRoute("/admin/menu")({ component: AdminMenu });

type DishForm = {
  name: string; description: string; price: string; category: string; imageUrl: string;
  availability: { breakfast: boolean; lunch: boolean; dinner: boolean };
  isAvailable: boolean;
};

const EMPTY_FORM: DishForm = {
  name: "", description: "", price: "", category: "", imageUrl: "",
  availability: { breakfast: false, lunch: false, dinner: false },
  isAvailable: true,
};

function AdminMenu() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [form, setForm] = useState<DishForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 12;

  useEffect(() => {
    fetchDishes();
  }, []);

  async function fetchDishes(loadMore = false) {
    if (loadMore) setLoadingMore(true);
    else setLoading(true);
    
    try {
      let q = query(
        collection(db, "menu"),
        orderBy("category"),
        orderBy("name"),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Dish));
      
      setDishes(prev => loadMore ? [...prev, ...list] : list);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Menu fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(d: Dish) {
    setEditing(d);
    setForm({
      name: d.name, description: d.description, price: String(d.price),
      category: d.category, imageUrl: d.imageUrl ?? "",
      availability: d.availability ?? { breakfast: false, lunch: false, dinner: false },
      isAvailable: d.isAvailable,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name || !form.price || !form.category) return;
    setSaving(true);
    const data = {
      name: form.name.trim(), description: form.description.trim(),
      price: Number(form.price), category: form.category.trim(),
      imageUrl: form.imageUrl.trim(), availability: form.availability,
      isAvailable: form.isAvailable,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, "menu", editing.id), { ...data, updatedAt: serverTimestamp() });
        setDishes(prev => prev.map(d => d.id === editing.id ? { ...d, ...data } : d));
      } else {
        const ref = await addDoc(collection(db, "menu"), { ...data, createdAt: serverTimestamp() });
        // Optionally fetch the new doc or just append. Appending is cheaper.
        setDishes(prev => [{ id: ref.id, ...data } as Dish, ...prev]);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await deleteDoc(doc(db, "menu", deleteId));
    setDishes(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
  }

  async function toggleAvailable(d: Dish) {
    const next = !d.isAvailable;
    await updateDoc(doc(db, "menu", d.id), { isAvailable: next });
    setDishes(prev => prev.map(item => item.id === d.id ? { ...item, isAvailable: next } : item));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-sm text-muted-foreground">Add, edit and toggle dish availability</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-dark)]">
          <Plus className="h-4 w-4" /> Add Dish
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes by name or category…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />)}</div>}

      {!loading && (() => {
        const q = search.toLowerCase();
        const filtered = dishes.filter(d =>
          d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
        );
        return (
          <>
            {filtered.length === 0 && search && (
              <p className="py-8 text-center text-sm text-muted-foreground">No dishes match "{search}".</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => (
                <div key={d.id} className="rounded-xl bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{d.name}</h3>
                      <p className="text-xs text-muted-foreground">{d.category}</p>
                    </div>
                    <p className="text-base font-bold text-primary">₹{d.price}</p>
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    <Tag active={!!d.availability?.breakfast}>Breakfast</Tag>
                    <Tag active={!!d.availability?.lunch}>Lunch</Tag>
                    <Tag active={!!d.availability?.dinner}>Dinner</Tag>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                      <Toggle on={d.isAvailable} onChange={() => toggleAvailable(d)} />
                      {d.isAvailable ? "Available" : "Unavailable"}
                    </label>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(d.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => fetchDishes(true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors shadow-sm"
                >
                  {loadingMore ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                  ) : (
                    "Show More Dishes"
                  )}
                </button>
              </div>
            )}
          </>
        );
      })()}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{editing ? "Edit Dish" : "Add Dish"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <MField label="Name *" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
              <MField label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} textarea />
              <div className="grid grid-cols-2 gap-3">
                <MField label="Price (₹) *" type="number" value={form.price} onChange={(v) => setForm((p) => ({ ...p, price: v }))} />
                <MField label="Category *" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} />
              </div>
              <MField label="Image URL (optional)" value={form.imageUrl} onChange={(v) => setForm((p) => ({ ...p, imageUrl: v }))} />
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Availability</p>
                <div className="flex gap-4">
                  {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                    <label key={m} className="flex items-center gap-1.5 text-sm capitalize">
                      <input type="checkbox" checked={form.availability[m]} onChange={(e) => setForm((p) => ({ ...p, availability: { ...p.availability, [m]: e.target.checked } }))} className="accent-primary" />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))} className="accent-primary" />
                Mark as Available
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-dark)] disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Dish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl text-center">
            <h2 className="mb-2 font-bold">Delete dish?</h2>
            <p className="mb-5 text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-dark)]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MField({ label, value, onChange, textarea, type }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; type?: string }) {
  const cls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={cls} /> : <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />}
    </label>
  );
}

function Tag({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${active ? "bg-[var(--primary-light)] text-primary" : "bg-secondary text-muted-foreground"}`}>{children}</span>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={`relative h-5 w-9 rounded-full transition ${on ? "bg-primary" : "bg-border"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-4" : "left-0.5"}`} />
    </button>
  );
}
