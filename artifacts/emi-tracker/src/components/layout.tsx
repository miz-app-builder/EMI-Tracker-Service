import { Link, useLocation } from "wouter";
import { LayoutDashboard, Store, FileText, LogOut, User, Settings, AlertCircle, BarChart2, Layers, Calculator, Moon, Sun, CalendarDays, Search, Activity, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback } from "react";
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

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/shops": "Shops",
  "/emi-orders": "My EMIs",
  "/reports": "Reports",
  "/debt-overview": "Debt Overview",
  "/calculator": "EMI Calculator",
  "/calendar": "Calendar View",
  "/overdue": "Overdue",
  "/search": "Search",
  "/profile": "Profile Settings",
  "/export": "Export My Data",
  "/activity-log": "Activity Log",
};

function getPageTitle(location: string) {
  if (location.startsWith("/emi-orders/new")) return "New EMI Order";
  if (location.startsWith("/emi-orders/")) return "EMI Order Detail";
  return PAGE_TITLES[location] ?? "EMI Tracker";
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const overdueCount = summary?.overdueOrders ?? 0;

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
  const photoSrc = user?.profilePhotoUrl ? `${basePath}/api/users/me/photo` : undefined;

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
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-primary tracking-tight">EMI Tracker</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">My installment records</p>
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
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">
              {getPageTitle(location)}
            </span>
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

                <div className="md:hidden">
                  <DropdownMenuSeparator />
                  {navGroups.flatMap((g) => g.items).map((item) => (
                    <Link key={item.href} href={item.href}>
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {"badge" in item && item.badge ? (
                          <span className="ml-auto text-xs font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 print:overflow-visible print:p-0">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
