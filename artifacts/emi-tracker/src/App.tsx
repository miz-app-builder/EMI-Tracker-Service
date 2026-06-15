import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Dashboard from "@/pages/dashboard";
import Shops from "@/pages/shops";
import EmiOrders from "@/pages/emi-orders/index";
import NewEmiOrder from "@/pages/emi-orders/new";
import EmiOrderDetail from "@/pages/emi-orders/detail";
import ProfilePage from "@/pages/profile";
import LandingPage from "@/pages/landing";
import OverduePage from "@/pages/overdue";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Routes />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
