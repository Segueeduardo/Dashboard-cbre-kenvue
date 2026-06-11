import { Bell, Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const Navbar = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        {/* Barra de pesquisa removida conforme solicitado */}
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme} 
          className="relative px-4 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center gap-2 transition-colors text-foreground"
          title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm font-semibold">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <button className="relative w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary border-2 border-accent" />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border h-8 ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold leading-tight tracking-wide">{isAdmin ? 'ADMIN' : 'Usuário'}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{isAdmin ? 'Gerenciamento' : 'Somente Leitura'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 border border-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
