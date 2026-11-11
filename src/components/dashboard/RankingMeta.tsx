import React, { useMemo, useState } from 'react';
import type { UT } from '../../types/fechamento.types';
import { TOLERANCIA_PP } from '../../types/fechamento.types';
import { CATEGORIA_LABEL, classificar, fmtMoeda, fmtPct } from '../../lib/fechamento';
import { CATEGORIA_COR } from './categoria';

/** Limites do eixo, em %MB. Barras além disso aparecem cortadas. */
const LIMITE = 40;
/** Altura (em % do gráfico) de 1 ponto percentual de %MB */
const ESCALA = 100 / (LIMITE * 2);
const y = (pct: number) => 50 + Math.max(-LIMITE, Math.min(LIMITE, pct)) * ESCALA;

interface RankingMetaProps {
  uts: UT[];
  metaMB: number;
  /** Rec. líq. e MB reais do período, para calcular quanto faltou para a meta */
  recLiqReal: number;
  mbReal: number;
  onSelecionar: (ut: UT) => void;
}

/**
 * Ranking das UTs pelo %MB Real, da menor para a maior, contra a linha da meta.
 * Clicar em uma barra leva para a UT na tabela.
 */
const RankingMeta: React.FC<RankingMetaProps> = ({ uts, metaMB, recLiqReal, mbReal, onSelecionar }) => {
  const [foco, setFoco] = useState<UT | null>(null);
  const curto = (n: number) => fmtPct(n).replace(',0%', '%');

  const ordenadas = useMemo(() => [...uts].sort((a, b) => a.real.pctMB - b.real.pctMB), [uts]);
  const naMeta = uts.filter((u) => u.real.pctMB >= metaMB - TOLERANCIA_PP).length;
  // MB necessária para o período fechar exatamente na meta
  const faltaMB = (metaMB / 100) * recLiqReal - mbReal;

  return (
    <div>
      <p className="text-base md:text-lg font-semibold max-w-[70ch]">
        {naMeta} das {uts.length} UTs ficaram em linha ou acima da meta de {curto(metaMB)}.{' '}
        <span className="font-normal text-white/70">
          {faltaMB > 0
            ? `Para o período fechar na meta, faltaram ${fmtMoeda(faltaMB)} de margem bruta.`
            : `O período fechou ${fmtMoeda(-faltaMB)} de margem bruta acima da meta.`}
        </span>
      </p>

      <div className="relative h-52 mt-6">
        {/* Eixo */}
        <span className="absolute left-0 top-0 -translate-y-1/2 text-xs text-white/60 tabular-nums">{LIMITE}%</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-white/60 tabular-nums">0%</span>
        <span className="absolute left-0 bottom-0 translate-y-1/2 text-xs text-white/60 tabular-nums">-{LIMITE}%</span>

        <div className="absolute inset-y-0 left-11 right-0">
          <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />

          {/* Faixa em linha e linha da meta */}
          <div
            className="absolute inset-x-0 bg-brand/25"
            style={{ bottom: `${y(metaMB - TOLERANCIA_PP)}%`, height: `${TOLERANCIA_PP * 2 * ESCALA}%` }}
          />
          <div className="absolute inset-x-0 h-0.5 bg-brand translate-y-1/2" style={{ bottom: `${y(metaMB)}%` }} />
          <span
            className="absolute left-0 mb-2 text-xs font-bold text-brand whitespace-nowrap"
            style={{ bottom: `${y(metaMB + TOLERANCIA_PP)}%` }}
          >
            Meta {curto(metaMB)}
          </span>

          {/* Uma barra por UT */}
          <div className="absolute inset-0 flex gap-[3px] md:gap-1.5" onMouseLeave={() => setFoco(null)}>
            {ordenadas.map((ut) => {
              const pct = ut.real.pctMB;
              const categoria = classificar(pct, metaMB);
              const cortada = Math.abs(pct) > LIMITE;
              const altura = `${Math.max(Math.abs(y(pct) - 50), 0.8)}%`;
              const apagada = foco && foco !== ut;
              return (
                <button
                  key={`${ut.pos}|${ut.descricao}`}
                  type="button"
                  onMouseEnter={() => setFoco(ut)}
                  onFocus={() => setFoco(ut)}
                  onBlur={() => setFoco(null)}
                  onClick={() => onSelecionar(ut)}
                  aria-label={`${ut.nome}: ${fmtPct(pct)}, ${CATEGORIA_LABEL[categoria]}. Ver na tabela`}
                  className="relative flex-1 min-w-0 h-full focus-visible:ring-offset-0"
                >
                  <span
                    className={`absolute inset-x-0 transition-opacity ${CATEGORIA_COR[categoria].traco} ${apagada ? 'opacity-35' : ''}`}
                    style={pct >= 0 ? { bottom: '50%', height: altura } : { top: '50%', height: altura }}
                  >
                    {/* Marca de corte: o valor real passa do limite do eixo */}
                    {cortada && (
                      <span className={`absolute inset-x-0 h-[3px] bg-ink ${pct >= 0 ? 'top-1.5' : 'bottom-1.5'}`} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm min-h-[1.25rem] text-white/70" aria-live="polite">
        {foco ? (
          <>
            <span className="font-semibold text-white">{foco.nome}</span>
            {': '}
            <span className="font-semibold text-white tabular-nums">{fmtPct(foco.real.pctMB)}</span>
            {' '}de %MB real, orçado {fmtPct(foco.orcamento.pctMB)} ({CATEGORIA_LABEL[classificar(foco.real.pctMB, metaMB)].toLowerCase()})
          </>
        ) : (
          `Cada barra é uma UT, da menor para a maior %MB real. Barras com um corte passam de ${LIMITE}%. Clique em uma barra para abrir a UT na tabela.`
        )}
      </p>
    </div>
  );
};

export default RankingMeta;
