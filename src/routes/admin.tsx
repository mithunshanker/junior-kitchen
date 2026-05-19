// routes/admin.tsx — admin layout with sidebar + role guard.
// Redirects non-admin users to /menu.

import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Utensils, Receipt, Users, LogOut, Menu, X, Truck } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const ALL_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, roles: ["admin"] },
  { to: "/admin/menu", label: "Menu", icon: Utensils, roles: ["admin"] },
  { to: "/admin/orders", label: "Orders", icon: Receipt, roles: ["admin", "delivery"] },
  { to: "/admin/customers", label: "Customers", icon: Users, roles: ["admin", "delivery"] },
  { to: "/admin/delivery", label: "Delivery Partners", icon: Truck, roles: ["admin"] },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const role = userProfile?.role;
  const NAV = ALL_NAV.filter((item) => item.roles.includes(role as string));

  // Role guard — redirect based on role
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    // If user exists but profile is missing (broken account), redirect to login
    if (!role) { navigate({ to: "/login" }); return; }
    if (role === "customer") { navigate({ to: "/menu" }); return; }
    if (role === "delivery") {
      // Delivery partners can only access orders and customers
      const allowed = ["/admin/orders", "/admin/customers"];
      const isAllowed = allowed.some((p) => path === p || path.startsWith(p + "/"));
      if (!isAllowed) { navigate({ to: "/admin/orders" }); }
    }
  }, [loading, user, role, navigate, path]);

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  // Block render until auth + profile fully resolved to prevent flash of forbidden content
  if (loading || (user && !userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-secondary">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-primary-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white p-1">
            <Logo className="h-full w-auto" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Junior Kitchen</p>
            <p className="text-[10px] uppercase tracking-wider opacity-80">{role === "delivery" ? "Delivery Portal" : "Admin Portal"}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, (item as any).exact);
            return (
              <Link key={item.to} to={item.to as any} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white text-primary shadow-sm" : "text-white/90 hover:bg-white/10"}`}>
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Logo className="h-9 w-auto" />
          <button onClick={() => setOpen((o) => !o)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        {open && (
          <div className="border-b border-border bg-card md:hidden">
            <nav className="space-y-1 p-3">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to, (item as any).exact);
                return (
                  <Link key={item.to} to={item.to as any} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar */}
        <nav className={`fixed inset-x-0 bottom-0 z-20 grid border-t border-border bg-card md:hidden`} style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, (item as any).exact);
            return (
              <Link key={item.to} to={item.to as any} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
