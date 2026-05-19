import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Heart, Plus, Minus, Check, Flame, ShoppingBag, LogOut, Receipt, LogIn, Search, X, Loader2 } from "lucide-react";
import { useCart, type Dish } from "@/lib/cart-context";
import { Logo } from "@/components/logo";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { collection, query, where, getDocs, limit, startAfter, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
});

function currentMeal(): "breakfast" | "lunch" | "dinner" {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  return "dinner";
}

const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const MEAL_EMOJI = { breakfast: "🌅", lunch: "🍽", dinner: "🌙" };

function MenuPage() {
  const meal = currentMeal();
  const cart = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  // Fetch 20 at a time — meal-filter runs client-side so we always have enough to show
  const PAGE_SIZE = 20;
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial fetch on mount
  useEffect(() => {
    fetchDishes(false);
  }, []);

  // Redirect staff users away from the customer menu
  // (Fixes the issue where an old PWA shortcut opens /menu directly)
  useEffect(() => {
    if (userProfile?.role === "admin") {
      navigate({ to: "/admin", replace: true });
    } else if (userProfile?.role === "delivery") {
      navigate({ to: "/admin/orders", replace: true });
    }
  }, [userProfile, navigate]);


  async function fetchDishes(loadMore: boolean) {
    if (loadMore) setLoadingMore(true);
    else setLoadingDishes(true);
    
    try {
      const baseConstraints = [
        where("isAvailable", "==", true),
        orderBy("category"),
        orderBy("name"),
        limit(PAGE_SIZE),
      ] as const;

      let q = query(collection(db, "menu"), ...baseConstraints);

      if (loadMore && lastDoc) {
        q = query(collection(db, "menu"), ...baseConstraints, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Dish));
      
      setDishes(prev => loadMore ? [...prev, ...list] : list);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Menu fetch error:", err);
    } finally {
      setLoadingDishes(false);
      setLoadingMore(false);
    }
  }

  // Attach / reattach intersection observer whenever pagination state changes
  useEffect(() => {
    if (loadingDishes || !hasMore || !bottomRef.current) return;
    
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        fetchDishes(true);
      }
    }, { threshold: 0.1 });

    if (bottomRef.current) {
      observerRef.current.observe(bottomRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadingDishes, loadingMore, hasMore, lastDoc]);

  // Filter by current meal period in-memory (no extra reads, no composite index needed)
  const mealDishes = useMemo(
    () => dishes.filter((d) => (d as any).availability?.[meal] === true),
    [dishes, meal]
  );

  // Apply search filter
  const searchedDishes = useMemo(() => {
    if (!search.trim()) return mealDishes;
    const q = search.toLowerCase();
    return mealDishes.filter(
      (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [mealDishes, search]);

  // Group by category
  const grouped = useMemo(() => {
    const g: Record<string, Dish[]> = {};
    searchedDishes.forEach((d) => {
      (g[d.category] ||= []).push(d);
    });
    return g;
  }, [searchedDishes]);

  function handleAdd(d: Dish) {
    cart.add(d);
    setAdded((p) => ({ ...p, [d.id]: true }));
    setTimeout(() => setAdded((p) => ({ ...p, [d.id]: false })), 1200);
  }

  async function handleLogout() {
    await signOut();
    navigate({ to: "/menu" });
  }

  const displayName = userProfile?.name || user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-secondary pb-32">
      {/* Sticky navbar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo className="h-10 w-auto" />
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  Hi, {displayName}
                </span>
                <button
                  onClick={() => navigate({ to: "/orders" })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  aria-label="My Orders"
                  title="My Orders"
                >
                  <Receipt className="h-4 w-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate({ to: "/login" })}
                className="flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Meal badge + Search */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-[0_4px_12px_oklch(0.52_0.21_27/0.3)]">
            <span>{MEAL_EMOJI[meal]}</span> {MEAL_LABEL[meal]} Menu
          </span>
          <p className="text-xs text-muted-foreground">Eat Heavy, Feel Lighter</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes or category…"
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {loadingDishes && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingDishes && mealDishes.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-12 text-center shadow-[var(--shadow-card)]">
            <Flame className="mb-3 h-12 w-12 text-primary" />
            <h2 className="text-lg font-semibold">No dishes available right now</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Come back at the next meal time for fresh options.
            </p>
          </div>
        )}

        {/* Search empty state */}
        {!loadingDishes && mealDishes.length > 0 && searchedDishes.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No dishes match "{search}".</p>
        )}

        {/* Dish list grouped by category */}
        {!loadingDishes && mealDishes.length > 0 && (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, catDishes]) => (
              <section key={cat}>
                <h2 className="mb-3 text-lg font-bold text-foreground">{cat}</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {catDishes.map((d) => (
                    <li
                      key={d.id}
                      className="flex overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)] transition hover:bg-[var(--primary-light)]/40"
                    >
                      {/* Dish image or placeholder */}
                      <div className="flex h-auto w-24 shrink-0 items-center justify-center overflow-hidden bg-[var(--primary-light)]">
                        {d.imageUrl ? (
                          <img
                            src={d.imageUrl}
                            alt={d.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Heart className="h-8 w-8 text-primary/50" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold leading-tight">{d.name}</h3>
                          <span className="shrink-0 text-sm font-bold text-primary">₹{d.price}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {d.description}
                        </p>
                        {(() => {
                          const item = cart.items.find((i) => i.id === d.id);
                          const q = item?.quantity || 0;

                          if (q === 0) {
                            return (
                              <button
                                onClick={() => handleAdd(d)}
                                className={`mt-auto self-end flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  added[d.id]
                                    ? "bg-[var(--success,oklch(0.5_0.14_145))] text-white"
                                    : "bg-primary text-primary-foreground hover:bg-[var(--primary-dark)] shadow-[0_4px_12px_oklch(0.52_0.21_27/0.3)]"
                                }`}
                              >
                                {added[d.id] ? (
                                  <><Check className="h-3.5 w-3.5" /> Added</>
                                ) : (
                                  <><Plus className="h-3.5 w-3.5" /> Add</>
                                )}
                              </button>
                            );
                          }

                          return (
                            <div className="mt-auto self-end flex items-center overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-0.5">
                              <button
                                onClick={() => cart.dec(d.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-foreground">
                                {q}
                              </span>
                              <button
                                onClick={() => cart.inc(d.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={bottomRef} className="h-4 w-full" />
        
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </main>

      {/* Floating cart button */}
      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <button
            onClick={() => navigate({ to: "/cart" })}
            className="flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_oklch(0.52_0.21_27/0.4)] transition hover:bg-[var(--primary-dark)]"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>
              View Cart · {cart.count} item{cart.count > 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">₹{cart.total}</span>
          </button>
        </div>
      )}
    </div>
  );
}
