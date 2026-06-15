import { Link, useLocation } from "wouter";
import { LayoutDashboard, Store, FileText } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/shops", label: "Shops", icon: Store },
    { href: "/emi-orders", label: "My EMIs", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-primary tracking-tight">EMI Tracker</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">আমার কিস্তির হিসাব</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border">
          <h1 className="text-lg font-bold text-primary">EMI Tracker</h1>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
