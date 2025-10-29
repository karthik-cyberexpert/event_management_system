import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MadeWithDyad } from "./components/made-with-dyad";
import Layout from "./components/Layout";
import ManageVenues from "./pages/admin/ManageVenues";
import ManageUsers from "./pages/admin/ManageUsers";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/*" 
        element={
          session ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/venues" element={<ManageVenues />} />
                <Route path="/users" element={<ManageUsers />} />
                {/* Add other role-specific routes here */}
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              <AppRoutes />
            </main>
            <MadeWithDyad />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;