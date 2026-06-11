import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useOSData } from '../context/OSDataContext';
import { ArrowLeft, Search, Filter, X, AlertTriangle } from 'lucide-react';
import { KpiCard } from '../components/dashboard/KpiCards';
import type { OSRow, FiltrosDashboard } from '../types/os.types';

function parseData(val: string | Date | undefined | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const TITULO_POR_FILTRO: Record<string, string> = {
  'todos': 'Todas as Ordens',
  'sem-classificacao': 'OS Sem Classificação',
  'sem-classificacao-30-dias': 'OS Sem Classificação - Últimos 30 Dias',
  'com-classificacao': 'OS Com Classificação',
  'proximas': 'Próximas do Vencimento',
  'vencidas': 'OS Vencidas',
};

const DetalhesOS: React.FC = () => {
  const { dados } = useOSData();
  const location = useLocation();
  const filtroInicial = location.state?.filtroInicial || 'todos';
  const filtrosGlobais: FiltrosDashboard | null = location.state?.filtrosGlobais || null;

  const [buscaOS, setBuscaOS] = useState('');
  const [grupoServico, setGrupoServico] = useState('Todos');
  const [equipe, setEquipe] = useState('Todos');
  const [relatadoPor, setRelatadoPor] = useState('Todos');

  // Valores únicos pros selects
  const valoresUnicos = useMemo(() => {
    const grupos = new Set<string>();
    const equipes = new Set<string>();
    const relatores = new Set<string>();
    
    dados.forEach(os => {
      if (os['Grupo de Serviço'] && String(os['Grupo de Serviço']).trim()) grupos.add(String(os['Grupo de Serviço']).trim());
      if (os['Equipe'] && String(os['Equipe']).trim()) equipes.add(String(os['Equipe']).trim());
      if (os['Relatado Por'] && String(os['Relatado Por']).trim()) relatores.add(String(os['Relatado Por']).trim());
    });
    
    return {
      grupos: Array.from(grupos).sort(),
      equipes: ['Sem equipe', ...Array.from(equipes).sort()],
      relatores: Array.from(relatores).sort()
    };
  }, [dados]);

  // Aplicação da cascata de filtros
  const dadosFiltrados = useMemo(() => {
    let result = dados;

    // 0. Aplicar Filtros Globais Recebidos do Dashboard
    if (filtrosGlobais) {
      if (filtrosGlobais.equipe !== 'Todos') {
        result = result.filter((os) => {
          const eqStr = String(os['Equipe'] || '').trim();
          if (filtrosGlobais.equipe === 'Sem equipe') return eqStr === '';
          return eqStr === filtrosGlobais.equipe;
        });
      }
      if (filtrosGlobais.local !== 'Todos') {
        result = result.filter(os => String(os['Local'] || '').trim() === filtrosGlobais.local);
      }
      if (filtrosGlobais.tipoServico !== 'Todos') {
        result = result.filter(os => String(os['Tipo de Serviço'] || '').trim() === filtrosGlobais.tipoServico);
      }
      if (filtrosGlobais.status !== 'Todos') {
        result = result.filter(os => String(os['Status'] || '').trim() === filtrosGlobais.status);
      }
      if (filtrosGlobais.ordemServico.trim()) {
        const busca = filtrosGlobais.ordemServico.trim().toLowerCase();
        result = result.filter(os => String(os['Ordem de Serviço'] || '').toLowerCase().includes(busca));
      }
      if (filtrosGlobais.periodoInicio || filtrosGlobais.periodoFim) {
        result = result.filter(os => {
          const dataOS = parseData(os['Relatado Em']);
          if (!dataOS) return false;
          if (filtrosGlobais.periodoInicio) {
            const inicio = new Date(filtrosGlobais.periodoInicio);
            inicio.setHours(0, 0, 0, 0);
            if (dataOS < inicio) return false;
          }
          if (filtrosGlobais.periodoFim) {
            const fim = new Date(filtrosGlobais.periodoFim);
            fim.setHours(23, 59, 59, 999);
            if (dataOS > fim) return false;
          }
          return true;
        });
      }
    }

    // 1. Filtro Inicial (Vindo do Card)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    switch (filtroInicial) {
      case 'sem-classificacao':
        result = result.filter(os => !os['Grupo de Serviço'] || String(os['Grupo de Serviço']).trim() === '');
        break;
      case 'sem-classificacao-30-dias': {
        const dataInicio = new Date(hoje);
        dataInicio.setDate(dataInicio.getDate() - 30);
        result = result.filter(os => {
          const g = os['Grupo de Serviço'];
          const e = os['Equipe'];
          const hasG = g && typeof g === 'string' && g.trim() !== '';
          const hasE = e && typeof e === 'string' && e.trim() !== '';
          if (hasG && hasE) return false;

          const data = parseData(os['Relatado Em']);
          if (!data) return false;
          return data >= dataInicio;
        });
        break;
      }
      case 'com-classificacao':
        result = result.filter(os => os['Grupo de Serviço'] && String(os['Grupo de Serviço']).trim() !== '');
        break;
      case 'vencidas':
        result = result.filter(os => {
          if (!os['Terminar Não Após De']) return false;
          const limite = new Date(os['Terminar Não Após De']);
          limite.setHours(0, 0, 0, 0);
          return limite < hoje;
        });
        break;
      case 'proximas':
        result = result.filter(os => {
          if (!os['Terminar Não Após De']) return false;
          const limite = new Date(os['Terminar Não Após De']);
          limite.setHours(0, 0, 0, 0);
          const dias = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          return dias >= 0 && dias <= 7;
        });
        break;
    }

    // 2. Filtros manuais locais
    if (buscaOS.trim()) {
      const termo = buscaOS.toLowerCase().trim();
      result = result.filter(os => String(os['Ordem de Serviço']).toLowerCase().includes(termo));
    }
    if (grupoServico !== 'Todos') {
      result = result.filter(os => String(os['Grupo de Serviço']).trim() === grupoServico);
    }
    if (equipe !== 'Todos') {
      result = result.filter(os => {
        const eqStr = String(os['Equipe'] || '').trim();
        if (equipe === 'Sem equipe') return eqStr === '';
        return eqStr === equipe;
      });
    }
    if (relatadoPor !== 'Todos') {
      result = result.filter(os => String(os['Relatado Por']).trim() === relatadoPor);
    }

    return result;
  }, [dados, filtroInicial, filtrosGlobais, buscaOS, grupoServico, equipe, relatadoPor]);

  const limparFiltros = () => {
    setBuscaOS('');
    setGrupoServico('Todos');
    setEquipe('Todos');
    setRelatadoPor('Todos');
  };

  // Helper de Badge
  function getStatusInfo(os: OSRow) {
    if (!os['Terminar Não Após De']) {
      return { text: 'Sem data limite', style: 'bg-muted text-muted-foreground', isVencida: false };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(os['Terminar Não Após De']);
    if (isNaN(limite.getTime())) {
      return { text: 'Data Inválida', style: 'bg-muted text-muted-foreground', isVencida: false };
    }
    limite.setHours(0, 0, 0, 0);
    
    // Cálculo de dias exato para o início do dia seguinte - hoje
    const diffTime = limite.getTime() - hoje.getTime();
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dias < 0) return { text: `🔴 Vencida há ${Math.abs(dias)} dias`, style: 'bg-red-500/10 text-red-500 font-bold', isVencida: true };
    if (dias === 0) return { text: '⚫ Vence hoje', style: 'bg-slate-800 text-slate-100 font-bold dark:bg-slate-200 dark:text-slate-900', isVencida: false };
    if (dias <= 3) return { text: `🟡 Vence em ${dias} dias`, style: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold', isVencida: false };
    if (dias <= 7) return { text: `🔵 Vence em ${dias} dias`, style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium', isVencida: false };
    
    return { text: `🟢 ${dias} dias restantes`, style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium', isVencida: false };
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-card/40 backdrop-blur-xl rounded-3xl border border-border p-6 shadow-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </Link>
        <h1 className="text-2xl font-black tracking-tight">Ordens de Serviço - {TITULO_POR_FILTRO[filtroInicial] || 'Todas'}</h1>
      </div>

      {filtroInicial === 'sem-classificacao-30-dias' && (
        <div className="max-w-xs">
          <KpiCard
            title="Sem Classificação"
            value={dadosFiltrados.length.toLocaleString('pt-BR')}
            subtitle="Últimos 30 dias"
            icon={AlertTriangle}
            colorClass="orange"
            compact
            hoverable
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-border p-5 flex flex-wrap lg:flex-nowrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar OS..." 
            value={buscaOS}
            onChange={e => setBuscaOS(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        
        <select 
          value={relatadoPor} 
          onChange={e => setRelatadoPor(e.target.value)}
          className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all flex-1 min-w-[180px]"
        >
          <option value="Todos">Relatado Por: Todos</option>
          {valoresUnicos.relatores.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {(buscaOS || grupoServico !== 'Todos' || equipe !== 'Todos' || relatadoPor !== 'Todos') && (
          <button 
            onClick={limparFiltros}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-bold transition-all"
          >
            <X className="w-4 h-4" /> Limpar
          </button>
        )}
      </div>

      {/* Table Area */}
      <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden min-h-[400px] flex flex-col">
        {dadosFiltrados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold">Nenhuma ordem encontrada</h3>
            <p className="text-muted-foreground mt-1 mb-6 text-sm max-w-sm">Tente ajustar os filtros ou limpar a busca atual para ver os registros.</p>
            <button onClick={limparFiltros} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar relative max-h-[800px]">
            <table className="tabela-os">
              <thead>
                <tr>
                  <th className="w-[120px]">Ordem de Serviço</th>
                  <th>Descrição</th>
                  <th className="w-[180px]">
                    <div className="relative group/filter flex items-center">
                      <select 
                        value={grupoServico}
                        onChange={e => setGrupoServico(e.target.value)}
                        className="bg-transparent text-muted-foreground uppercase tracking-wider font-bold text-xs appearance-none focus:outline-none cursor-pointer w-full"
                      >
                        <option value="Todos">GRUPO DE SERVIÇO</option>
                        {valoresUnicos.grupos.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <Filter className="w-3 h-3 text-muted-foreground/50 ml-1 pointer-events-none group-hover/filter:text-foreground transition-colors" />
                    </div>
                  </th>
                  <th className="w-[180px]">
                    <div className="relative group/filter flex items-center">
                      <select 
                        value={equipe}
                        onChange={e => setEquipe(e.target.value)}
                        className="bg-transparent text-muted-foreground uppercase tracking-wider font-bold text-xs appearance-none focus:outline-none cursor-pointer w-full"
                      >
                        <option value="Todos">EQUIPE</option>
                        {valoresUnicos.equipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                      </select>
                      <Filter className="w-3 h-3 text-muted-foreground/50 ml-1 pointer-events-none group-hover/filter:text-foreground transition-colors" />
                    </div>
                  </th>
                  <th className="w-[200px] text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((os, idx) => {
                  const valG = typeof os['Grupo de Serviço'] === 'string' ? os['Grupo de Serviço'].trim() : os['Grupo de Serviço'];
                  const statusInfo = getStatusInfo(os);
                  
                  // Encontrar a chave de descrição independentemente de espaços e acentuação no Excel
                  const rawKeys = Object.keys(os);
                  const descKey = rawKeys.find(k => {
                    const cleanItem = k.toLowerCase().trim();
                    return cleanItem === 'descrição' || cleanItem === 'descricao' || cleanItem === 'resumo' || cleanItem === 'texto breve' || cleanItem === 'instalação' || cleanItem === 'descrição ';
                  });
                  const textoDescricao = descKey ? os[descKey as keyof typeof os] : null;
                  
                  return (
                    <tr key={String(os['Ordem de Serviço']) + idx} className={statusInfo.isVencida ? 'vencida' : ''}>
                      <td className="text-center font-semibold">{os['Ordem de Serviço'] || '-'}</td>
                      <td className="descricao-cell text-muted-foreground text-sm font-medium">
                        {textoDescricao ? String(textoDescricao) : <span className="italic opacity-60">Sem descrição</span>}
                      </td>
                      <td>
                        {valG ? (
                          <span className="bg-blue-500/10 text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide">
                            {valG}
                          </span>
                        ) : (
                          <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide">
                            Não classificado
                          </span>
                        )}
                      </td>
                      <td className="text-sm font-medium text-muted-foreground">
                        {os['Equipe'] && String(os['Equipe']).trim() ? String(os['Equipe']).trim() : '—'}
                      </td>
                      <td className="text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs ${statusInfo.style}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default DetalhesOS;
