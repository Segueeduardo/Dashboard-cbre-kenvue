import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.tsx';
import AdminLogin from './pages/AdminLogin.tsx';
import Admin from './pages/Admin.tsx';
import DetalhesOS from './pages/DetalhesOS.tsx';
import Sidebar from './components/layout/Sidebar.tsx';
import Navbar from './components/layout/Navbar.tsx';
import { OSDataProvider } from './context/OSDataContext.tsx';
import { ReactNode, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Componente para proteger rotas administrativas
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Verificar sessão atual no Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // 2. Escutar mudanças de estado da autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Enquanto a verificação não termina, exibimos um loading (ou null para evitar piscar tela)
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <OSDataProvider>
      <Router>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/detalhes-os" element={<DetalhesOS />} />
                <Route path="/login" element={<AdminLogin />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </OSDataProvider>
  );
}

export default App;
