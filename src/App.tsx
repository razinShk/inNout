import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import { AdminDashboard } from "./pages/AdminDashboard";
import { WorkerDashboard } from "./pages/WorkerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredType }: { children: React.ReactNode, requiredType: 'admin' | 'worker' }) => {
  const { userType, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><span>Loading...</span></div>;
  }
  if (userType !== requiredType) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={
              <ProtectedRoute requiredType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/worker" element={
              <ProtectedRoute requiredType="worker">
                <WorkerDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
