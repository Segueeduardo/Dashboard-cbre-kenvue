import React from 'react';
import type { FiltroCategoria } from '../../types/fechamento.types';
import { TOLERANCIA_PP } from '../../types/fechamento.types';
import { fmtMoeda, fmtPct } from '../../lib/fechamento';
import { CATEGORIA_COR } from './categoria';

interface KpiCardProps {
  title: string;
  value: number;
  regra: string;
  mbReal: number;
  ponto: string;
  ativo: boolean;
  onClick: () => void;
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, regra, mbReal, ponto, ativo, onClick, className = '' }) => {
  const suave = ativo ? 'text-ink-foreground/70' : 'text-muted-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`relative overflow-hidden text-left rounded-xl border p-4 md:p-5 transition-colors ${
        ativo ? 'bg-ink text-ink-foreground border-ink' : 'bg-card border-border hover:border-foreground'
      } ${className}`}
    >
      <span className={`flex items-center gap-2.5 text-sm font-semibold ${ativo ? '' : 'text-foreground'}`}>
        <span className={`traco w-2 h-4 shrink-0 ${ponto}`} aria-hidden="true" />
        {title}
      </span>
      <p className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums leading-none">
        {value}
        <span className={`text-sm font-medium ml-1.5 tracking-normal ${suave}`}>{value === 1 ? 'UT' : 'UTs'}</span>
      </p>
      <p className={`text-xs mt-3 ${suave}`}>{regra}</p>
      <p className={`text-xs mt-0.5 tabular-nums ${suave}`}>MB real {fmtMoeda(mbReal)}</p>
      {ativo && <span className="absolute inset-x-0 bottom-0 h-1 bg-brand" aria-hidden="true" />}
    </button>
  );
};

export interface ResumoCategoria {
  qtd: number;
  mbReal: number;
}

interface KpiCardsGridProps {
  resumo: Record<FiltroCategoria, ResumoCategoria>;
  metaMB: number;
  filtro: FiltroCategoria;
  onFiltro: (f: FiltroCategoria) => void;
}

const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ resumo, metaMB, filtro, onFiltro }) => {
  const curto = (n: number) => fmtPct(n).replace(',0%', '%');
  const min = curto(metaMB - TOLERANCIA_PP);
  const max = curto(metaMB + TOLERANCIA_PP);

  const cards: { id: FiltroCategoria; title: string; regra: string; ponto: string; className?: string }[] = [
    { id: 'todas', title: 'Todas as UTs', regra: `Meta de %MB: ${curto(metaMB)}`, ponto: 'bg-brand', className: 'col-span-2 lg:col-span-1' },
    { id: 'baixa', title: 'Baixa performance', regra: `De 0% até menos de ${min}`, ponto: CATEGORIA_COR.baixa.ponto },
    { id: 'negativa', title: 'Negativas', regra: 'Abaixo de 0%', ponto: CATEGORIA_COR.negativa.ponto },
    { id: 'emLinha', title: 'Em linha', regra: `De ${min} a ${max}`, ponto: CATEGORIA_COR.emLinha.ponto },
    { id: 'alta', title: 'Alta performance', regra: `Acima de ${max}`, ponto: CATEGORIA_COR.alta.ponto },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <KpiCard
          key={c.id}
          title={c.title}
          value={resumo[c.id].qtd}
          regra={c.regra}
          mbReal={resumo[c.id].mbReal}
          ponto={c.ponto}
          ativo={filtro === c.id}
          onClick={() => onFiltro(c.id)}
          className={c.className}
        />
      ))}
    </div>
  );
};

export default KpiCardsGrid;
