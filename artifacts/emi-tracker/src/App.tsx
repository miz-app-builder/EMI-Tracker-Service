import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/token";

setAuthTokenGetter(() => getToken());

import Dashboard from "@/pages/dashboard";
import Shops from "@/pages/shops";
import EmiOrders from "@/pages/emi-orders/index";
import NewEmiOrder from "@/pages/emi-orders/new";
import EmiOrderDetail from "@/pages/emi-orders/detail";
import ProfilePage from "@/pages/profile";
import LandingPage from "@/pages/landing";
import OverduePage from "@/pages/overdue";
import ReportsPage from "@/pages/reports";
import DebtOverviewPage from "@/pages/debt-overview";
import CalculatorPage from "@/pages/calculator";
import CalendarPage from "@/pages/calendar";
import SearchPage from "@/pages/search";
import ReceiptPage from "@/pages/receipt";
import ExportPage from "@/pages/export";
import ActivityLogPage from "@/pages/activity-log";
import { PinLockScreen } from "@/components/PinLockScreen";
import { usePinLock } from "@/hooks/usePinLock";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/shops" component={() => <ProtectedRoute component={Shops} />} />
      <Route path="/emi-orders" component={() => <ProtectedRoute component={EmiOrders} />} />
      <Route path="/emi-orders/new" component={() => <ProtectedRoute component={NewEmiOrder} />} />
      <Route path="/emi-orders/:id" component={() => <ProtectedRoute component={EmiOrderDetail} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/overdue" component={() => <ProtectedRoute component={OverduePage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route path="/debt-overview" component={() => <ProtectedRoute component={DebtOverviewPage} />} />
      <Route path="/calculator" component={() => <ProtectedRoute component={CalculatorPage} />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
      <Route path="/search" component={() => <ProtectedRoute component={SearchPage} />} />
      <Route path="/emi-orders/:id/payments/:paymentId/receipt" component={() => <ProtectedRoute component={ReceiptPage} />} />
      <Route path="/export" component={() => <ProtectedRoute component={ExportPage} />} />
      <Route path="/activity-log" component={() => <ProtectedRoute component={ActivityLogPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PinGate({ children }: { children: React.ReactNode }) {
  const { unlocked, verifyPin } = usePinLock();
  if (!unlocked) return <PinLockScreen onUnlock={verifyPin} />;
  return <>{children}</>;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <PinGate>
              <Routes />
              <Toaster />
            </PinGate>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
