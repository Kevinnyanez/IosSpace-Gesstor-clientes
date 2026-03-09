import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { ClientesPage } from "./components/ClientesPage";
import { DeudasPage } from "./components/DeudasPage";
import { CalendarioPage } from "./components/CalendarioPage";
import { InventarioPage } from "./components/InventarioPage";
import { ConfiguracionPage } from "./components/ConfiguracionPage";
import { ChatPage } from "./components/ChatPage";
import { NotificacionesPage } from "./components/NotificacionesPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/deudas" element={<DeudasPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
