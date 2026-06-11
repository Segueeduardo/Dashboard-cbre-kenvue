import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ClipboardList, AlertTriangle, ClipboardCheck, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FiltrosDashboard } from '../../types/os.types';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorClass: string; // ex: 'blue', 'orange', 'purple', 'red'
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  onClick?: () => void;
  /** Animação de hover sem ação de clique */
  hoverable?: boolean;
  /** Variante compacta para cards menores */
  compact?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; icon: string; glow: string; badge: string; border: string }> = {
  blue: {
    bg: 'from-blue-500/15 to-blue-500/5',
    icon: 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white',
    glow: 'group-hover:shadow-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-400',
    border: 'hover:border-blue-500/30',
  },
  orange: {
    bg: 'from-orange-500/15 to-orange-500/5',
    icon: 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white',
    glow: 'group-hover:shadow-orange-500/20',
    badge: 'bg-orange-500/10 text-orange-400',
    border: 'hover:border-orange-500/30',
  },
  purple: {
    bg: 'from-purple-500/15 to-purple-500/5',
    icon: 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white',
    glow: 'group-hover:shadow-purple-500/20',
    badge: 'bg-purple-500/10 text-purple-400',
    border: 'hover:border-purple-500/30',
  },
  red: {
    bg: 'from-red-500/15 to-red-500/5',
    icon: 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white',
    glow: 'group-hover:shadow-red-500/20',
    badge: 'bg-red-500/10 text-red-400',
    border: 'hover:border-red-500/30',
  },
  emerald: {
    bg: 'from-emerald-500/15 to-emerald-500/5',
    icon: 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
    glow: 'group-hover:shadow-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-400',
    border: 'hover:border-emerald-500/30',
  },
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon: Icon, colorClass, trend, onClick, hoverable, compact }) => {
  const colors = COLOR_MAP[colorClass] || COLOR_MAP.blue;
  const hoverClass = onClick
    ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]'
    : hoverable
      ? 'cursor-default hover:shadow-2xl hover:-translate-y-1'
      : 'hover:shadow-2xl cursor-default';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-gradient-to-br ${colors.bg} backdrop-blur-xl ${compact ? 'p-4' : 'p-6'} rounded-2xl border border-border group transition-all duration-300 ${colors.border} ${hoverClass} ${colors.glow} overflow-hidden relative`}
    >
      <div className={`flex justify-between items-start ${compact ? 'mb-3' : 'mb-4'} relative z-10`}>
        <div className={`${compact ? 'p-2' : 'p-2.5'} rounded-xl ${colors.icon} transition-all duration-300 shadow-inner`}>
          <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
        {trend && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              trend.direction === 'up'
                ? 'bg-emerald-500/10 text-emerald-400'
                : trend.direction === 'down'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <h3 className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} font-medium mb-1 tracking-tight`}>{title}</h3>
        <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>{value}</p>
        {subtitle && (
          <p className={`text-xs font-semibold mt-2 ${colors.badge} inline-block px-2 py-0.5 rounded-full`}>
            {subtitle}
          </p>
        )}
      </div>
      {/* Glow background */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-radial rounded-full blur-3xl -mr-14 -mt-14 opacity-20 transition-all duration-500 group-hover:opacity-40" />
    </div>
  );
};

interface KpiCardsGridProps {
  totalOrdens: number;
  semClassificacao: number;
  comClassificacao: number;
  proximasVencimento: number;
  osVencidas: number;
  filtrosDashboard?: FiltrosDashboard;
}

const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({
        totalOrdens,
  semClassificacao,
  comClassificacao,
  proximasVencimento,
  osVencidas,
  filtrosDashboard,
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        title="Total de Ordens"
        value={totalOrdens.toLocaleString('pt-BR')}
        icon={ClipboardList}
        colorClass="blue"
        onClick={() => navigate('/detalhes-os', { state: { filtroInicial: 'todos', filtrosGlobais: filtrosDashboard } })}
      />
      <KpiCard
        title="Sem Classificação"
        value={semClassificacao.toLocaleString('pt-BR')}
        subtitle={totalOrdens > 0 ? `${((semClassificacao / totalOrdens) * 100).toFixed(1)}% do total` : undefined}
        icon={AlertTriangle}
        colorClass="orange"
        onClick={() => navigate('/detalhes-os', { state: { filtroInicial: 'sem-classificacao', filtrosGlobais: filtrosDashboard } })}
      />
      <KpiCard
        title="Com Classificação"
        value={comClassificacao.toLocaleString('pt-BR')}
        subtitle={totalOrdens > 0 ? `${((comClassificacao / totalOrdens) * 100).toFixed(1)}% do total` : undefined}
        icon={ClipboardCheck}
        colorClass="emerald"
        onClick={() => navigate('/detalhes-os', { state: { filtroInicial: 'com-classificacao', filtrosGlobais: filtrosDashboard } })}
      />
      <KpiCard
        title="Próximas do Vencimento"
        value={proximasVencimento.toLocaleString('pt-BR')}
        subtitle="Próximos 7 dias"
        icon={AlertCircle}
        colorClass="orange"
        onClick={() => navigate('/detalhes-os', { state: { filtroInicial: 'proximas', filtrosGlobais: filtrosDashboard } })}
      />
      <KpiCard
        title="OS Vencidas"
        value={osVencidas.toLocaleString('pt-BR')}
        subtitle={osVencidas > 0 ? '⚠️ Requer ação imediata' : '✅ Nenhuma vencida'}
        icon={XCircle}
        colorClass="red"
        onClick={() => navigate('/detalhes-os', { state: { filtroInicial: 'vencidas', filtrosGlobais: filtrosDashboard } })}
      />
    </div>
  );
};

export { KpiCard };
export default KpiCardsGrid;
