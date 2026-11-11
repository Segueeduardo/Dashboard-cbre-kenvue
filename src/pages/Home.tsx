import { useMemo, useState } from 'react';
import { Upload, Search, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useFechamento } from '../context/FechamentoContext';
import type { FiltroCategoria, ValoresUT } from '../types/fechamento.types';
import { TOLERANCIA_PP } from '../types/fechamento.types';
import { classificar, fmtMoeda, fmtPct, fmtPP, totaisDoFechamento } from '../lib/fechamento';
import KpiCardsGrid, { type ResumoCategoria } from '../components/dashboard/KpiCards';
import UTTable from '../components/dashboard/UTTable';
import RankingMeta from '../components/dashboard/RankingMeta';

const TITULO_FILTRO: Record<FiltroCategoria, string> = {
  todas: 'Todas as UTs',
  baixa: 'Baixa performance',
  negativa: 'Negativas',
  emLinha: 'Em linha com a meta',
  alta: 'Alta performance',
};

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Indicador = ({ titulo, real, orcado, dif }: { titulo: string; real: string; orcado: string; dif: string }) => (
  <div>
    <p className="text-sm text-white/60">{titulo}</p>
    <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{real}</p>
    <p className="mt-1 text-xs text-white/60 tabular-nums">
      Orçado {orcado}, diferença de <span className="font-semibold text-white whitespace-nowrap">{dif}</span>
    </p>
  </div>
);

const Home = () => {
  const { fechamento, ultimaAtualizacao, carregando } = useFechamento();
  const [filtro, setFiltro] = useState<FiltroCategoria>('todas');
  const [busca, setBusca] = useState('');

  const metaMB = fechamento?.metaMB ?? 12;

  const resumo = useMemo(() => {
    const r: Record<FiltroCategoria, ResumoCategoria> = {
      todas: { qtd: 0, mbReal: 0 },
      negativa: { qtd: 0, mbReal: 0 },
      baixa: { qtd: 0, mbReal: 0 },
      emLinha: { qtd: 0, mbReal: 0 },
      alta: { qtd: 0, mbReal: 0 },
    };
    for (const ut of fechamento?.uts ?? []) {
      for (const k of ['todas', classificar(ut.real.pctMB, metaMB)] as const) {
        r[k].qtd += 1;
        r[k].mbReal += ut.real.mb;
      }
    }
    return r;
  }, [fechamento, metaMB]);

  const utsFiltradas = useMemo(() => {
    const termo = semAcento(busca.trim());
    return (fechamento?.uts ?? []).filter(
      (ut) =>
        (filtro === 'todas' || classificar(ut.real.pctMB, metaMB) === filtro) &&
        (!termo || semAcento(ut.descricao).includes(termo))
    );
  }, [fechamento, filtro, busca, metaMB]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fechamento || fechamento.uts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mb-6">
          <FileSpreadsheet className="w-8 h-8 text-brand-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Nenhum fechamento carregado</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Importe a planilha de fechamento de medição (Orç x Real) para ver as UTs classificadas por %MB.
        </p>
        <Link
          to="/admin"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Upload className="w-4 h-4" />
          Importar planilha
        </Link>
      </div>
    );
  }

  const total = totaisDoFechamento(fechamento);
  const difMoeda = (v: ValoresUT, campo: 'recLiq' | 'mb') => `${v[campo] > 0 ? '+' : ''}${fmtMoeda(v[campo])}`;

  const curto = (n: number) => fmtPct(n).replace(',0%', '%');
  const mes = fechamento.aba.split('(')[0].trim().toLowerCase();

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
            {mes ? `Fechamento de ${mes}` : 'Fechamento de medição'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Orçado x real{fechamento.periodo ? ` em ${fechamento.periodo}` : ''}. Meta de %MB de {curto(metaMB)}; de{' '}
            {curto(metaMB - TOLERANCIA_PP)} a {curto(metaMB + TOLERANCIA_PP)} a UT está em linha.
          </p>
        </div>
        {ultimaAtualizacao && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Atualizado em {ultimaAtualizacao.toLocaleDateString('pt-BR')} às{' '}
            {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </header>

      <section className="bg-ink text-ink-foreground rounded-2xl p-6 md:p-8 space-y-6" aria-label="Resultado do período">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:gap-10 lg:items-end">
          <div>
            <p className="text-sm text-white/60">%MB real do período</p>
            <p className="mt-1 text-6xl md:text-7xl font-extrabold tracking-tighter tabular-nums leading-none">
              {fmtPct(total.real.pctMB)}
            </p>
            <p className="mt-3 text-xs text-white/60 tabular-nums">
              Orçado {fmtPct(total.orcamento.pctMB)}, diferença de{' '}
              <span className="font-semibold text-white whitespace-nowrap">{fmtPP(total.diferenca.pctMB)}</span>
            </p>
          </div>
          <div className="lg:border-l lg:border-white/15 lg:pl-10">
            <Indicador
              titulo="Receita líquida real"
              real={fmtMoeda(total.real.recLiq)}
              orcado={fmtMoeda(total.orcamento.recLiq)}
              dif={difMoeda(total.diferenca, 'recLiq')}
            />
          </div>
          <div className="lg:border-l lg:border-white/15 lg:pl-10">
            <Indicador
              titulo="Margem bruta real"
              real={fmtMoeda(total.real.mb)}
              orcado={fmtMoeda(total.orcamento.mb)}
              dif={difMoeda(total.diferenca, 'mb')}
            />
          </div>
        </div>
        <div className="border-t border-white/15 pt-6">
          <RankingMeta
            uts={fechamento.uts}
            metaMB={metaMB}
            recLiqReal={total.real.recLiq}
            mbReal={total.real.mb}
            onSelecionar={(ut) => {
              setFiltro('todas');
              setBusca(ut.codigo || ut.nome);
              document.getElementById('tabela-uts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      </section>

      <KpiCardsGrid resumo={resumo} metaMB={metaMB} filtro={filtro} onFiltro={setFiltro} />

      <section className="bg-card rounded-2xl border border-border overflow-hidden scroll-mt-4" aria-label="UTs" id="tabela-uts">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{TITULO_FILTRO[filtro]}</h2>
            <p className="text-sm text-muted-foreground">
              {utsFiltradas.length} {utsFiltradas.length === 1 ? 'UT' : 'UTs'}. Clique em uma linha para ver a justificativa.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar UT, cliente ou código"
              aria-label="Buscar UT"
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-input bg-background text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <UTTable uts={utsFiltradas} metaMB={metaMB} />
      </section>
    </div>
  );
};

export default Home;
