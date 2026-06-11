import { useState, useMemo, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import { ClipboardList, Upload, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useOSData } from '../context/OSDataContext';
import type { FiltrosDashboard } from '../types/os.types';
import { FILTROS_INICIAIS } from '../types/os.types';
import KpiCardsGrid from '../components/dashboard/KpiCards';
import FilterBar from '../components/dashboard/FilterBar';
import GaugeChart from '../components/dashboard/GaugeChart';
import { SemClassificacaoTable, VencimentosTable } from '../components/dashboard/AlertTable';
import CustomTooltip from '../components/dashboard/CustomTooltip';

/* ────────── Paletas de Cores ────────── */
const COLORS_PIE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'];
const COLORS_BAR = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
const VENC_COLORS: Record<string, string> = {
  Vencidas: '#ef4444',
  Hoje: '#f97316',
  '1-3 dias': '#f59e0b',
  '4-7 dias': '#eab308',
  '8-15 dias': '#84cc16',
  '16-30 dias': '#22c55e',
  '30+ dias': '#10b981',
};

/* ────────── Helpers ────────── */
function parseData(val: string | Date | undefined | null): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}


/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL: DASHBOARD DE OS
   ══════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();
  const { dados, ultimaAtualizacao, totalRegistros } = useOSData();
  const [filtros, setFiltros] = useState<FiltrosDashboard>(FILTROS_INICIAIS);
  const [activeTab, setActiveTab] = useState<'semClassif' | 'vencimentos'>('semClassif');

  /* ────── Handler de filtros ────── */
  const handleFiltroChange = useCallback((campo: keyof FiltrosDashboard, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const handleLimparFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIAIS);
  }, []);

  /* ────── Valores únicos para filtros ────── */
  const valoresUnicos = useMemo(() => {
    const equipesSet = new Set<string>();
    const locaisSet = new Set<string>();
    const tiposSet = new Set<string>();
    const statusSet = new Set<string>();

    dados.forEach((os) => {
      if (os['Equipe'] && String(os['Equipe']).trim()) equipesSet.add(String(os['Equipe']).trim());
      if (os['Local'] && String(os['Local']).trim()) locaisSet.add(String(os['Local']).trim());
      if (os['Tipo de Serviço'] && String(os['Tipo de Serviço']).trim()) tiposSet.add(String(os['Tipo de Serviço']).trim());
      if (os['Status'] && String(os['Status']).trim()) statusSet.add(String(os['Status']).trim());
    });

    return {
      equipes: ['Sem equipe', ...Array.from(equipesSet).sort()],
      locais: Array.from(locaisSet).sort(),
      tipos: Array.from(tiposSet).sort(),
      status: Array.from(statusSet).sort(),
    };
  }, [dados]);

  /* ────── Contagem de filtros ativos ────── */
  const filtrosAtivos = useMemo(() => {
    let count = 0;
    if (filtros.equipe !== 'Todos') count++;
    if (filtros.local !== 'Todos') count++;
    if (filtros.ordemServico.trim()) count++;
    if (filtros.tipoServico !== 'Todos') count++;
    if (filtros.status !== 'Todos') count++;
    if (filtros.periodoInicio) count++;
    if (filtros.periodoFim) count++;
    return count;
  }, [filtros]);

  /* ────── Dados Filtrados (useMemo) ────── */
  const dadosFiltrados = useMemo(() => {
    return dados.filter((os) => {
      // Filtro por Equipe
      if (filtros.equipe !== 'Todos') {
        const eqStr = String(os['Equipe'] || '').trim();
        if (filtros.equipe === 'Sem equipe') {
          if (eqStr !== '') return false;
        } else {
          if (eqStr !== filtros.equipe) return false;
        }
      }
      // Filtro por Local
      if (filtros.local !== 'Todos') {
        if (String(os['Local'] || '').trim() !== filtros.local) return false;
      }
      // Filtro por Tipo de Serviço
      if (filtros.tipoServico !== 'Todos') {
        if (String(os['Tipo de Serviço'] || '').trim() !== filtros.tipoServico) return false;
      }
      // Filtro por Status
      if (filtros.status !== 'Todos') {
        if (String(os['Status'] || '').trim() !== filtros.status) return false;
      }
      // Busca por OS
      if (filtros.ordemServico.trim()) {
        const busca = filtros.ordemServico.trim().toLowerCase();
        if (!String(os['Ordem de Serviço'] || '').toLowerCase().includes(busca)) return false;
      }
      // Filtro por Período
      if (filtros.periodoInicio || filtros.periodoFim) {
        const dataOS = parseData(os['Relatado Em']);
        if (!dataOS) return false;
        if (filtros.periodoInicio) {
          const inicio = new Date(filtros.periodoInicio);
          inicio.setHours(0, 0, 0, 0);
          if (dataOS < inicio) return false;
        }
        if (filtros.periodoFim) {
          const fim = new Date(filtros.periodoFim);
          fim.setHours(23, 59, 59, 999);
          if (dataOS > fim) return false;
        }
      }
      return true;
    });
  }, [dados, filtros]);

  /* ────── KPIs (todos useMemo) ────── */
  const totalOrdens = useMemo(() => dadosFiltrados.length, [dadosFiltrados]);

  const semClassificacao = useMemo(
    () =>
      dadosFiltrados.filter((os) => {
        const g = os['Grupo de Serviço'];
        const e = os['Equipe'];
        const noG = !g || (typeof g === 'string' && g.trim() === '');
        const noE = !e || (typeof e === 'string' && e.trim() === '');
        return noG || noE;
      }).length,
    [dadosFiltrados]
  );

  const comClassificacao = useMemo(
    () =>
      dadosFiltrados.filter((os) => {
        const g = os['Grupo de Serviço'];
        const e = os['Equipe'];
        const hasG = g && typeof g === 'string' && g.trim() !== '';
        const hasE = e && typeof e === 'string' && e.trim() !== '';
        return hasG && hasE;
      }).length,
    [dadosFiltrados]
  );

  const mediaDiasSemClassificar = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Janela de 30 dias: só considera OS abertas nos últimos 30 dias
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);

    const naoClassificadas = dadosFiltrados.filter((os) => {
      const g = os['Grupo de Serviço'];
      const e = os['Equipe'];
      const hasG = g && typeof g === 'string' && g.trim() !== '';
      const hasE = e && typeof e === 'string' && e.trim() !== '';
      if (hasG && hasE) return false; // já tem classificação completa

      const data = parseData(os['Relatado Em']);
      if (!data) return false;

      // Filtro: apenas OS abertas nos últimos 30 dias
      return data >= dataInicio;
    });

    if (naoClassificadas.length === 0) return 0;

    const somaDias = naoClassificadas.reduce((acc, os) => {
      const dataAbertura = new Date(os['Relatado Em']);
      const diffTime = hoje.getTime() - dataAbertura.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return acc + Math.max(0, diffDays);
    }, 0);

    return somaDias / naoClassificadas.length;
  }, [dadosFiltrados]);

  const statusVencimento = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return dadosFiltrados.reduce(
      (acc, os) => {
        const terminar = os['Terminar Não Após De'];
        if (!terminar) return acc;
        const statusOS = os['Status'];
        if (statusOS && typeof statusOS === 'string' && statusOS.toLowerCase().includes('concluída')) return acc;

        const dataLimite = new Date(terminar);
        if (isNaN(dataLimite.getTime())) return acc;
        dataLimite.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) acc.vencidas++;
        else if (diffDays === 0) acc.venceHoje++;
        else if (diffDays <= 3) acc.urgentes++;
        else if (diffDays <= 7) acc.atencao++;
        else acc.noPrazo++;

        return acc;
      },
      { vencidas: 0, venceHoje: 0, urgentes: 0, atencao: 0, noPrazo: 0 }
    );
  }, [dadosFiltrados]);

  /* ────── Gráfico: OS por Equipe ────── */
  const dadosEquipe = useMemo(() => {
    const mapa = new Map<string, number>();
    dadosFiltrados.forEach((os) => {
      const eq = String(os['Equipe'] || 'Sem equipe').trim();
      mapa.set(eq, (mapa.get(eq) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dadosFiltrados]);

  /* ────── Gráfico: OS por Status ────── */
  const dadosStatus = useMemo(() => {
    const mapa = new Map<string, number>();
    dadosFiltrados.forEach((os) => {
      const st = String(os['Status'] || 'Sem status').trim();
      mapa.set(st, (mapa.get(st) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dadosFiltrados]);

  /* ────── Gráfico: OS por Tipo de Serviço ────── */
  const dadosTipoServico = useMemo(() => {
    const mapa = new Map<string, number>();
    dadosFiltrados.forEach((os) => {
      const tipo = String(os['Tipo de Serviço'] || 'Sem tipo').trim();
      mapa.set(tipo, (mapa.get(tipo) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dadosFiltrados]);

  /* ────── Gráfico: Abertura ao longo do tempo ────── */
  const dadosTemporal = useMemo(() => {
    const mapa = new Map<string, number>();
    dadosFiltrados.forEach((os) => {
      const data = parseData(os['Relatado Em']);
      if (data) {
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        mapa.set(chave, (mapa.get(chave) || 0) + 1);
      }
    });
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mesAno, count]) => {
        const [ano, mes] = mesAno.split('-');
        const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return { name: `${nomesMeses[parseInt(mes) - 1]}/${ano.slice(2)}`, value: count };
      });
  }, [dadosFiltrados]);

  /* ────── Gráfico: Distribuição de Vencimentos ────── */
  const dadosVencimentos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const faixas: Record<string, number> = {
      Vencidas: 0,
      Hoje: 0,
      '1-3 dias': 0,
      '4-7 dias': 0,
      '8-15 dias': 0,
      '16-30 dias': 0,
      '30+ dias': 0,
    };

    dadosFiltrados.forEach((os) => {
      const terminar = os['Terminar Não Após De'];
      if (!terminar) return;
      const statusOS = os['Status'];
      if (statusOS && typeof statusOS === 'string' && statusOS.toLowerCase().includes('concluída')) return;

      const dataLimite = new Date(terminar);
      if (isNaN(dataLimite.getTime())) return;
      dataLimite.setHours(0, 0, 0, 0);
      const diff = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diff < 0) faixas['Vencidas']++;
      else if (diff === 0) faixas['Hoje']++;
      else if (diff <= 3) faixas['1-3 dias']++;
      else if (diff <= 7) faixas['4-7 dias']++;
      else if (diff <= 15) faixas['8-15 dias']++;
      else if (diff <= 30) faixas['16-30 dias']++;
      else faixas['30+ dias']++;
    });

    return Object.entries(faixas).map(([name, value]) => ({ name, value }));
  }, [dadosFiltrados]);

  /* ══════════════ RENDER ══════════════ */

  // EMPTY STATE — nenhum dado carregado
  if (totalRegistros === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
          <ClipboardList className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Dashboard de OS</h1>
        <p className="text-muted-foreground font-medium max-w-md mb-8">
          Nenhuma planilha foi importada ainda. Acesse a página de login para importar seus dados.
        </p>
        <Link
          to="/login"
          className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          <Upload className="w-5 h-5" />
          Fazer Login (Admin)
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ─── Header ─── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-jnj font-light tracking-tight inline-block bg-white text-[#D51900] px-4 py-2 rounded-xl shadow-sm border border-border/50">
            Dashboard  Maximo  Johnson &amp; Johnson
          </h1>
          {ultimaAtualizacao && (
            <p className="text-muted-foreground text-sm font-medium mt-1">
              Atualizado em {ultimaAtualizacao.toLocaleDateString('pt-BR')}{' '}
              {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {filtrosAtivos > 0 && <span className="ml-2 text-muted-foreground/60">(filtro aplicado)</span>}
            </p>
          )}
        </div>
      </header>

      {/* ─── Filtros ─── */}
      <FilterBar
        filtros={filtros}
        onFiltroChange={handleFiltroChange}
        onLimparFiltros={handleLimparFiltros}
        equipesUnicas={valoresUnicos.equipes}
        locaisUnicos={valoresUnicos.locais}
        tiposServicoUnicos={valoresUnicos.tipos}
        statusUnicos={valoresUnicos.status}
        filtrosAtivos={filtrosAtivos}
      />

      {/* ─── KPI Cards ─── */}
      <KpiCardsGrid
        totalOrdens={totalOrdens}
        semClassificacao={semClassificacao}
        comClassificacao={comClassificacao}
        proximasVencimento={statusVencimento.urgentes + statusVencimento.atencao + statusVencimento.venceHoje}
        osVencidas={statusVencimento.vencidas}
        filtrosDashboard={filtros}
      />

      {/* ─── Gauge + Gráficos (linha superior) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gauge */}
        <div className="lg:col-span-3">
          <GaugeChart
            valor={mediaDiasSemClassificar}
            max={15}
            label="Média 30 Dias s/ Classificação"
            onClick={() => navigate('/detalhes-os', { state: { filtroInicial: 'sem-classificacao-30-dias', filtrosGlobais: filtros } })}
          />
        </div>

        {/* OS por Equipe */}
        <div className="lg:col-span-4 bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-border shadow-xl">
          <h2 className="text-base font-bold tracking-tight mb-1">OS por Equipe</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribuição de ordens por equipe</p>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosEquipe} layout="vertical" margin={{ left: 5, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1f2937" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Ordens" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {dadosEquipe.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OS por Status (Donut) */}
        <div className="lg:col-span-5 bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-border shadow-xl">
          <h2 className="text-base font-bold tracking-tight mb-1">OS por Status</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribuição por situação atual</p>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {dadosStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Gráficos (linha inferior) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abertura ao longo do tempo */}
        <div className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-border shadow-xl">
          <h2 className="text-base font-bold tracking-tight mb-1">Abertura de OS ao Longo do Tempo</h2>
          <p className="text-xs text-muted-foreground mb-4">Volume mensal de novas ordens</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosTemporal}>
                <defs>
                  <linearGradient id="colorAberturas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Ordens" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAberturas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Vencimentos */}
        <div className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-border shadow-xl">
          <h2 className="text-base font-bold tracking-tight mb-1">Distribuição de Vencimentos</h2>
          <p className="text-xs text-muted-foreground mb-4">Faixas de prazo para conclusão</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosVencimentos} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Ordens" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {dadosVencimentos.map((entry: any, i: number) => (
                    <Cell key={i} fill={VENC_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── OS por Tipo de Serviço ─── */}
      <div className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-border shadow-xl">
        <h2 className="text-base font-bold tracking-tight mb-1">OS por Tipo de Serviço</h2>
        <p className="text-xs text-muted-foreground mb-4">Top 10 categorias de serviço</p>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosTipoServico} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1f2937" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Ordens" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {dadosTipoServico.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Tabelas de Alertas (com Tabs) ─── */}
      <div className="bg-card/40 backdrop-blur-xl rounded-3xl border border-border shadow-xl overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('semClassif')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-all ${activeTab === 'semClassif'
              ? 'bg-orange-500/10 text-orange-400 border-b-2 border-orange-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
              }`}
          >
            ⚠️ OS Sem Classificação
            {semClassificacao > 0 && (
              <span className="ml-2 bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {semClassificacao}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('vencimentos')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-all ${activeTab === 'vencimentos'
              ? 'bg-red-500/10 text-red-400 border-b-2 border-red-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
              }`}
          >
            🕐 Vencimentos Próximos
            {(statusVencimento.vencidas + statusVencimento.venceHoje + statusVencimento.urgentes) > 0 && (
              <span className="ml-2 bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {statusVencimento.vencidas + statusVencimento.venceHoje + statusVencimento.urgentes}
              </span>
            )}
          </button>
        </div>
        <div className="p-4">
          {activeTab === 'semClassif' ? (
            <SemClassificacaoTable dados={dadosFiltrados} thresholdDias={15} />
          ) : (
            <VencimentosTable dados={dadosFiltrados} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
