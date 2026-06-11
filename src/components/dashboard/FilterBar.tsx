import React from 'react';
import type { FiltrosDashboard } from '../../types/os.types';
import { Search, X, Filter } from 'lucide-react';

interface FilterBarProps {
  filtros: FiltrosDashboard;
  onFiltroChange: (campo: keyof FiltrosDashboard, valor: string) => void;
  onLimparFiltros: () => void;
  equipesUnicas: string[];
  locaisUnicos: string[];
  tiposServicoUnicos: string[];
  statusUnicos: string[];
  filtrosAtivos: number;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filtros,
  onFiltroChange,
  onLimparFiltros,
  equipesUnicas,
  locaisUnicos,
  tiposServicoUnicos,
  statusUnicos,
  filtrosAtivos,
}) => {
  const selectClass =
    'bg-card/60 backdrop-blur-md border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer hover:border-primary/30 min-w-[120px]';

  const inputClass =
    'bg-card/60 backdrop-blur-md border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all hover:border-primary/30';

  return (
    <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Filtros</h3>
          {filtrosAtivos > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in-50 duration-300">
              {filtrosAtivos} ativo{filtrosAtivos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {filtrosAtivos > 0 && (
          <button
            onClick={onLimparFiltros}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            <X className="w-3.5 h-3.5" />
            Limpar tudo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Busca por OS */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar OS..."
            value={filtros.ordemServico}
            onChange={(e) => onFiltroChange('ordemServico', e.target.value)}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>

        {/* Equipe */}
        <select
          value={filtros.equipe}
          onChange={(e) => onFiltroChange('equipe', e.target.value)}
          className={selectClass}
        >
          <option value="Todos">Todas as Equipes</option>
          {equipesUnicas.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>

        {/* Local */}
        <select
          value={filtros.local}
          onChange={(e) => onFiltroChange('local', e.target.value)}
          className={selectClass}
        >
          <option value="Todos">Todos os Locais</option>
          {locaisUnicos.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        {/* Tipo de Serviço */}
        <select
          value={filtros.tipoServico}
          onChange={(e) => onFiltroChange('tipoServico', e.target.value)}
          className={selectClass}
        >
          <option value="Todos">Todos os Tipos</option>
          {tiposServicoUnicos.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filtros.status}
          onChange={(e) => onFiltroChange('status', e.target.value)}
          className={selectClass}
        >
          <option value="Todos">Todos os Status</option>
          {statusUnicos.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Período - uso grid para dividir em 2 datas */}
        <div className="flex justify-start gap-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <input
            type="date"
            value={filtros.periodoInicio}
            onChange={(e) => onFiltroChange('periodoInicio', e.target.value)}
            className={`${inputClass} w-[130px]`}

            title="Data inicial"
          />
          <input
            type="date"
            value={filtros.periodoFim}
            onChange={(e) => onFiltroChange('periodoFim', e.target.value)}
            className={`${inputClass} w-[130px]`}
            title="Data final"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
