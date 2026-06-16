import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  LogIn, LogOut, UserPlus, CreditCard, Trash2, Pencil, User, Key,
  Activity, Search, ShieldCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Log = {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
};

const ACTION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; badge: string }> = {
  login:            { icon: LogIn,       label: "Login",              color: "text-green-600",  badge: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  logout:           { icon: LogOut,      label: "Logout",             color: "text-slate-500",  badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  signup:           { icon: UserPlus,    label: "Sign Up",            color: "text-blue-600",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  order_created:    { icon: ShieldCheck, label: "Order Created",      color: "text-teal-600",   badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400" },
  payment_recorded: { icon: CreditCard,  label: "Payment Recorded",   color: "text-primary",    badge: "bg-primary/10 text-primary" },
  payment_deleted:  { icon: Trash2,      label: "Payment Deleted",    color: "text-destructive",badge: "bg-destructive/10 text-destructive" },
  payment_updated:  { icon: Pencil,      label: "Payment Updated",    color: "text-orange-600", badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  profile_updated:  { icon: User,        label: "Profile Updated",    color: "text-violet-600", badge: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" },
  password_changed: { icon: Key,         label: "Password Changed",   color: "text-amber-600",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Activity, label: action, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground" };
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/activity-logs`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query.trim()
    ? logs.filter((l) => {
        const q = query.toLowerCase();
        return (
          l.action.includes(q) ||
          (l.description ?? "").toLowerCase().includes(q) ||
          getActionMeta(l.action).label.toLowerCase().includes(q)
        );
      })
    : logs;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activities…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription className="text-xs">Last 200 actions — newest first</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground">
              <Activity className="mx-auto h-8 w-8 opacity-30 mb-2" />
              <p className="text-sm">{query ? "No results found" : "No activity yet"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((log) => {
                const meta = getActionMeta(log.action);
                const Icon = meta.icon;
                const date = new Date(log.createdAt);
                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs font-medium border-0 ${meta.badge}`}>
                          {meta.label}
                        </Badge>
                        {log.description && (
                          <span className="text-sm text-foreground truncate">{log.description}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" title={format(date, "dd MMM yyyy, hh:mm:ss a")}>
                        {formatDistanceToNow(date, { addSuffix: true })}
                        {" · "}
                        {format(date, "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
