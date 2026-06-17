import { Link, useLocation } from "wouter";
import { LayoutDashboard, Store, FileText, LogOut, User, Settings, AlertCircle, BarChart2, Layers, Calculator, Moon, Sun, CalendarDays, Search, Activity, ShieldAlert, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useTheme } from "@/hooks/useTheme";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":    { title: "Dashboard",        subtitle: "Summary of all your EMI installments" },
  "/shops":        { title: "Shops",             subtitle: "Manage your shops and showrooms" },
  "/emi-orders":   { title: "My EMIs",           subtitle: "All your active and completed EMI orders" },
  "/reports":      { title: "Reports",           subtitle: "Spending trends and analytics" },
  "/debt-overview":{ title: "Debt Overview",     subtitle: "Total outstanding and loan breakdown" },
  "/calculator":   { title: "EMI Calculator",    subtitle: "Calculate monthly installments instantly" },
  "/calendar":     { title: "Calendar View",     subtitle: "Upcoming payment schedule" },
  "/overdue":      { title: "Overdue",           subtitle: "Payments that are past their due date" },
  "/search":       { title: "Search",            subtitle: "Find orders, shops, and payments" },
  "/profile":      { title: "Profile Settings",  subtitle: "Manage your account and preferences" },
  "/activity-log": { title: "Activity Log",      subtitle: "Recent actions and changes" },
};

function getPageMeta(location: string): { title: string; subtitle: string } {
  if (location.startsWith("/emi-orders/new")) return { title: "New EMI Order", subtitle: "Add a new installment order" };
  if (location.startsWith("/emi-orders/"))   return { title: "EMI Order Detail", subtitle: "View and manage this order" };
  return PAGE_META[location] ?? { title: "EMI Tracker", subtitle: "" };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const overdueCount = summary?.overdueOrders ?? 0;
  const [moreOpen, setMoreOpen] = useState(false);

  const bottomNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/emi-orders", label: "My EMIs", icon: FileText },
    { href: "/shops", label: "Shops", icon: Store },
  ];

  const moreNavItems = [
    { href: "/overdue", label: "Overdue", icon: AlertCircle, badge: overdueCount > 0 ? overdueCount : null },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/reports", label: "Reports", icon: BarChart2 },
    { href: "/debt-overview", label: "Debt Overview", icon: Layers },
    { href: "/calculator", label: "Calculator", icon: Calculator },
    { href: "/activity-log", label: "Activity Log", icon: Activity },
    { href: "/search", label: "Search", icon: Search },
  ];

  const navGroups = [
    {
      label: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/overdue", label: "Overdue", icon: AlertCircle, badge: overdueCount > 0 ? overdueCount : null },
      ],
    },
    {
      label: "EMI Management",
      items: [
        { href: "/emi-orders", label: "My EMIs", icon: FileText },
        { href: "/shops", label: "Shops", icon: Store },
        { href: "/calendar", label: "Calendar", icon: CalendarDays },
      ],
    },
    {
      label: "Analytics",
      items: [
        { href: "/reports", label: "Reports", icon: BarChart2 },
        { href: "/debt-overview", label: "Debt Overview", icon: Layers },
        { href: "/calculator", label: "Calculator", icon: Calculator },
      ],
    },
    {
      label: "Tools",
      items: [
        { href: "/activity-log", label: "Activity Log", icon: Activity },
      ],
    },
  ];

  const { theme, toggle: toggleTheme } = useTheme(user?.themePreference);
  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";

  const handleAutoLogout = useCallback(() => { logout(); }, [logout]);
  const { warningVisible, secondsLeft, dismiss } = useAutoLogout(handleAutoLogout);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.location.hash = "";
        navigate("/search");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  const photoSrc = user?.profilePhotoUrl ?? undefined;

  return (
    <>
    <Dialog open={warningVisible} onOpenChange={() => dismiss()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            Auto Logout Warning
          </DialogTitle>
          <DialogDescription>
            Due to inactivity, you will be logged out in{" "}
            <span className="font-bold text-foreground">{secondsLeft}</span> seconds.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>
            I'm still here
          </Button>
          <Button variant="destructive" onClick={logout}>
            Logout Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="min-h-screen flex w-full bg-background print:block print:h-auto">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0 flex-col hidden md:flex print:hidden">
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">৳</div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight leading-tight">EMI Tracker</h1>
            <p className="text-[11px] text-sidebar-foreground/50 leading-tight">My installment records</p>
          </div>
        </div>
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-4 py-2">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${"badge" in item && item.badge && !isActive ? "text-destructive" : ""}`} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          {"badge" in item && item.badge ? (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${isActive ? "bg-white/20 text-white" : "bg-destructive text-white"}`}>
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden print:h-auto print:overflow-visible">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-card border-b border-border shrink-0 print:hidden">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground leading-tight">
              {getPageMeta(location).title}
            </span>
            {getPageMeta(location).subtitle && (
              <span className="text-xs text-muted-foreground leading-tight">
                {getPageMeta(location).subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Link href="/search">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                title="Search (press /)"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400 transition-transform duration-300 rotate-0" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
              )}
            </Button>
            <NotificationBell />

            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      {photoSrc && <AvatarImage src={photoSrc} alt={user?.name ?? "User"} />}
                      <AvatarFallback className="bg-primary text-white text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="gap-2 text-muted-foreground pointer-events-none">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user?.email ?? ""}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto hide-scrollbar p-4 md:p-6 pb-20 md:pb-6 print:overflow-visible print:p-0">
          {children}
        </div>
      </main>
    </div>

    {/* Mobile Bottom Nav */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border print:hidden">
      <div className="flex items-stretch">
        {bottomNavItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className={`flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {"badge" in item && item.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold bg-destructive text-white w-4 h-4 flex items-center justify-center rounded-full leading-none">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] leading-tight font-medium">{item.label}</span>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />}
              </div>
            </Link>
          );
        })}

        {/* More button */}
        <div className="flex-1 relative">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${moreOpen ? "text-primary" : "text-muted-foreground"}`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] leading-tight font-medium">More</span>
          </button>

          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="absolute bottom-full right-0 mb-2 z-50 bg-card border border-border rounded-xl shadow-xl w-52 overflow-hidden">
                {moreNavItems.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"}`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                        {"badge" in item && item.badge ? (
                          <span className="ml-auto text-[10px] font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full leading-none">{item.badge}</span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Profile button */}
        <div className="flex-1 relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground transition-colors hover:text-primary">
                <Avatar className="h-5 w-5">
                  {photoSrc && <AvatarImage src={photoSrc} alt={user?.name ?? "User"} />}
                  <AvatarFallback className="bg-primary text-white text-[10px] font-bold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] leading-tight font-medium">Profile</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52 mb-2">
              <DropdownMenuItem className="gap-2 text-muted-foreground pointer-events-none text-xs">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{user?.email ?? ""}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive cursor-pointer" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </nav>
    </>
  );
}
