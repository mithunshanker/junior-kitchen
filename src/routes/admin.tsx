// routes/admin.tsx — admin layout with sidebar + role guard.
// Redirects non-admin users to /menu.

import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Utensils, Receipt, Users, LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/menu", label: "Menu", icon: Utensils },
  { to: "/admin/orders", label: "Orders", icon: Receipt },
  { to: "/admin/customers", label: "Customers", icon: Users },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Role guard — redirect if not admin
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (userProfile && userProfile.role !== "admin") { navigate({ to: "/menu" }); }
  }, [loading, user, userProfile, navigate]);

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  // Show nothing while checking auth
  if (loading || !userProfile) {
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
            <p className="text-[10px] uppercase tracking-wider opacity-80">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
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
                const active = isActive(item.to, item.exact);
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
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
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
