import { Link, useLocation } from "wouter";
import { LayoutDashboard, Store, FileText, LogOut, User, Settings, AlertCircle, BarChart2, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { NotificationBell } from "@/components/NotificationBell";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/shops": "Shops",
  "/emi-orders": "My EMIs",
  "/reports": "Reports",
  "/debt-overview": "Debt Overview",
  "/overdue": "Overdue",
  "/profile": "Profile Settings",
};

function getPageTitle(location: string) {
  if (location.startsWith("/emi-orders/new")) return "New EMI Order";
  if (location.startsWith("/emi-orders/")) return "EMI Order Detail";
  return PAGE_TITLES[location] ?? "EMI Tracker";
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const overdueCount = summary?.overdueOrders ?? 0;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/shops", label: "Shops", icon: Store },
    { href: "/emi-orders", label: "My EMIs", icon: FileText },
    { href: "/reports", label: "Reports", icon: BarChart2 },
    { href: "/debt-overview", label: "Debt Overview", icon: Layers },
    { href: "/overdue", label: "Overdue", icon: AlertCircle, badge: overdueCount > 0 ? overdueCount : null },
  ];

  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";
  const photoSrc = user?.profilePhotoUrl ? `${basePath}/api/users/me/photo` : undefined;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0 flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-primary tracking-tight">EMI Tracker</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">My installment records</p>
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
                  <item.icon className={`h-5 w-5 ${"badge" in item && item.badge && !isActive ? "text-destructive" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge ? (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${isActive ? "bg-white/20 text-white" : "bg-destructive text-white"}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="md:hidden text-base font-bold text-primary">EMI Tracker</span>
            <span className="hidden md:block text-base font-semibold text-foreground">
              {getPageTitle(location)}
            </span>
          </div>

          <div className="flex items-center gap-1">
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
                  {navItems.map((item) => (
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

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
