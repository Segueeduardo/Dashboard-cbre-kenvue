import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Upload, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOSData } from '../../context/OSDataContext';
import { supabase } from '../../lib/supabase';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { dados } = useOSData();

  // Contar OS sem classificação para o badge
  const semClassificacao = useMemo(() => {
    return dados.filter((os) => {
      const g = os['Grupo de Serviço'];
      const e = os['Equipe'];
      const noG = !g || (typeof g === 'string' && g.trim() === '');
      const noE = !e || (typeof e === 'string' && e.trim() === '');
      return noG || noE;
    }).length;
  }, [dados]);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: ClipboardList,
      path: '/',
      badge: null,
    },
    {
      title: 'Importar Dados',
      icon: Upload,
      path: isAdmin ? '/admin' : '/login',
      badge: null
    },
  ];

  return (
    <div
      className={cn(
        'hidden md:flex flex-col bg-card border-r border-border shrink-0 transition-all duration-300 relative',
        isCollapsed ? 'w-12' : 'w-48'
      )}
    >
      {/* Botão de Toggle (Recolher/Expandir) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-8 bg-primary text-primary-foreground border-[3px] border-background rounded-full p-1.5 shadow-xl hover:scale-110 hover:shadow-primary/30 hover:bg-primary/95 transition-all z-50 hidden md:flex ring-1 ring-border"
        title={isCollapsed ? 'Expandir Sidebar' : 'Recolher Sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

      <div className={cn('p-6 flex items-center', isCollapsed ? 'justify-center px-2' : 'justify-start')}>
        <img
          src="/cbre-logo.png?v=2"
          alt="CBRE Logo"
          className={cn(
            "rounded-xl transition-all duration-300 object-contain",
            isCollapsed ? "w-10 h-10" : "w-auto h-12 max-w-[180px]"
          )}
        />
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.title : undefined}
            className={cn(
              'flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group relative text-sm',
              isCollapsed ? 'justify-center px-0' : 'px-4',
              location.pathname === item.path
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <div className="relative flex items-center justify-center">
              <item.icon
                className={cn(
                  'w-5 h-5 transition-colors shrink-0',
                  location.pathname === item.path ? 'text-primary' : 'group-hover:text-foreground'
                )}
              />
              {/* Badge mode compact */}
              {item.badge !== null && isCollapsed && (
                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse border border-card" />
              )}
            </div>

            {!isCollapsed && <span className="flex-1 whitespace-nowrap overflow-hidden">{item.title}</span>}

            {/* Badge mode expandido */}
            {item.badge !== null && !isCollapsed && (
              <span className="bg-orange-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 animate-pulse shrink-0">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}

            {location.pathname === item.path && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
            )}
          </Link>
        ))}
      </nav>

      {/* Login */}
      <div className="px-3 mb-2 mt-auto">
        <Link
          to="/login"
          title={isCollapsed ? 'Login' : undefined}
          className={cn(
            'flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 text-sm group',
            isCollapsed ? 'justify-center px-0' : 'px-4',
            location.pathname === '/login'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50'
          )}
        >
          <LogIn className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Login</span>}
        </Link>
      </div>

      {/* Status Bar */}
      <div className={cn('p-4 transition-all duration-300', isCollapsed ? 'px-2' : '')}>
        {isCollapsed ? (
          <div
            className="flex items-center justify-center h-12 bg-accent/20 rounded-xl cursor-default"
            title={`${dados.length > 0 ? dados.length.toLocaleString('pt-BR') : 'Sem'} OS carregadas`}
          >
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                dados.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
              )}
            />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-4 border border-primary/10 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  dados.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                )}
              />
              <span className="text-sm font-medium whitespace-nowrap truncate">
                {dados.length > 0
                  ? `${dados.length.toLocaleString('pt-BR')} OS carregadas`
                  : 'Sem dados'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
