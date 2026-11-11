import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Upload, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFechamento } from '../../context/FechamentoContext';
import { supabase } from '../../lib/supabase';
import logo from '@/assets/manserv-logo.png';
import marca from '@/assets/manserv-mark.png';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { totalUTs } = useFechamento();



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
      title: 'Fechamento',
      icon: BarChart3,
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
        isCollapsed ? 'w-14' : 'w-52'
      )}
    >
      {/* Botão de Toggle (Recolher/Expandir) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-8 bg-primary text-primary-foreground border-[3px] border-background rounded-full p-1.5 shadow-xl hover:scale-110  transition-all z-50 hidden md:flex ring-1 ring-border"
        title={isCollapsed ? 'Expandir Sidebar' : 'Recolher Sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

      <div className={cn('p-6 flex items-center', isCollapsed ? 'justify-center px-2' : 'justify-start')}>
        <img
          src={isCollapsed ? marca : logo}
          alt="Manserv"
          className={cn(
            'transition-all duration-300 object-contain dark:bg-white dark:rounded-lg dark:p-1.5',
            isCollapsed ? 'w-8 h-8' : 'w-auto h-20 max-w-[150px]'
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
                ? 'bg-accent text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <div className="relative flex items-center justify-center">
              <item.icon
                className={cn(
                  'w-5 h-5 transition-colors shrink-0',
                  location.pathname === item.path ? 'text-brand' : 'group-hover:text-foreground'
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
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-full" />
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
              ? 'bg-accent text-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
            title={`${totalUTs > 0 ? totalUTs : 'Sem'} UTs carregadas`}
          >
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                totalUTs > 0 ? 'bg-brand' : 'bg-muted-foreground'
              )}
            />
          </div>
        ) : (
          <div className="rounded-xl p-4 border border-border overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground mb-1">Dados</p>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  totalUTs > 0 ? 'bg-brand' : 'bg-muted-foreground'
                )}
              />
              <span className="text-sm font-medium whitespace-nowrap truncate">
                {totalUTs > 0
                  ? `${totalUTs} UTs carregadas`
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
