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
import AllEvents from "./pages/AllEvents"; // Updated import
import ProfilePage from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import ManageDepartments from "./pages/admin/ManageDepartments";
import ManageClubs from "./pages/admin/ManageClubs";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { session, loading, profile } = useAuth();

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route 
        path="/*" 
        element={
          session ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/all-events" element={<AllEvents />} />
                
                {profile?.role === 'admin' && (
                  <>
                    <Route path="/venues" element={<ManageVenues />} />
                    <Route path="/users" element={<ManageUsers />} />
                    <Route path="/departments" element={<ManageDepartments />} />
                    <Route path="/clubs" element={<ManageClubs />} />
                  </>
                )}
                <Route path="*" element={<NotFound />} />
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