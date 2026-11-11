import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CheckCircle2, LayoutPanelTop,
  Trash2, ArrowLeft, Database, ClipboardList, LogIn, Loader2, AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFechamento } from '../context/FechamentoContext';
import type { Fechamento } from '../types/fechamento.types';
import { META_MB_PADRAO } from '../types/fechamento.types';
import { classificar, fmtPct, parseFechamento } from '../lib/fechamento';
import { CategoriaBadge } from '../components/dashboard/UTTable';
import { supabase } from '../lib/supabase';

const Admin = () => {
  const { salvarFechamento, limparDados, ultimaAtualizacao, totalUTs } = useFechamento();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Fechamento | null>(null);
  const [metaMB, setMetaMB] = useState<number>(META_MB_PADRAO);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [importSuccess, setImportSuccess] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Validação de Sessão Real no Supabase (Segurança Reativa)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', { replace: true });
        }
      } finally {
        setTimeout(() => setCheckingSession(false), 500); // Pequeno delay para suavizar a transição
      }
    };
    
    checkSession();
  }, [navigate]);

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Validando acesso seguro...</p>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo
    if (!file) return;

    setLoading(true);
    setImportSuccess(false);
    setErro(null);
    setFileInfo({ name: file.name, size: (file.size / 1024).toFixed(2) + ' KB' });

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array' });
        setPreview(parseFechamento(wb, metaMB));
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        setPreview(null);
        setErro(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setLoading(false);
      setErro('Não foi possível ler o arquivo.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportar = async () => {
    if (!preview) return;
    setLoading(true);
    setErro(null);
    const resultado = await salvarFechamento({ ...preview, metaMB });
    setLoading(false);
    if (resultado.ok) {
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    } else {
      setErro(`A planilha foi carregada nesta sessão, mas não foi salva na nuvem: ${resultado.erro}`);
    }
  };

  const limparPreview = () => {
    setPreview(null);
    setFileInfo(null);
    setErro(null);
  };

  const handleLimparTudo = () => {
    limparPreview();
    limparDados();
  };

  const linhas = preview?.uts ?? [];
  const contagem = { negativa: 0, baixa: 0, emLinha: 0, alta: 0 };
  linhas.forEach((ut) => { contagem[classificar(ut.real.pctMB, metaMB)] += 1; });
  const semJustificativa = linhas.filter((ut) => !ut.justificativa).length;

  return (
    <div className="space-y-10 ">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Importar Dados</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <LayoutPanelTop className="w-4 h-4 text-primary" />
            Carregue a planilha de fechamento de medição (Orç x Real)
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-[0.98] text-sm"
          >
            <LogIn className="w-4 h-4 rotate-180" />
            Sair do Admin
          </button>
          
          <Link
            to="/"
            className="bg-accent/50 hover:bg-accent border border-border px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-[0.98] text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver Dashboard
          </Link>
          <button
            disabled={linhas.length === 0 || loading}
            onClick={handleImportar}
            className={cn(
              'px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-[0.98] text-sm',
              linhas.length > 0
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Publicar {linhas.length > 0 ? `(${linhas.length} UTs)` : ''}
          </button>
        </div>
      </header>

      {/* Status atual dos dados */}
      {totalUTs > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {totalUTs} UTs publicadas no dashboard
              </p>
              <p className="text-xs text-muted-foreground">
                Última atualização: {ultimaAtualizacao?.toLocaleDateString('pt-BR')}{' '}
                {ultimaAtualizacao?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button
            onClick={handleLimparTudo}
            className="text-xs font-semibold text-muted-foreground hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar dados
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-8 rounded-2xl border-2 border-dashed border-input group hover:border-brand transition-all cursor-pointer relative overflow-hidden text-center min-h-[350px] flex flex-col items-center justify-center">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 mx-auto group-hover:bg-brand transition-colors">
              <Upload className="w-10 h-10 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Carregar Planilha</h3>
            <p className="text-muted-foreground text-sm font-medium px-4 mb-2">
              Arraste o arquivo Excel do fechamento aqui ou clique para procurar
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Formatos: .xlsx, .xls
            </p>
          </div>

          {fileInfo && (
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 animate-in zoom-in-95 duration-500 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-emerald-500/20 transition-colors">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-sm">{fileInfo.name}</p>
                <p className="text-xs font-semibold text-muted-foreground tracking-tight">{fileInfo.size}</p>
              </div>
              <button
                onClick={limparPreview}
                aria-label="Remover arquivo"
                className="hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Meta e resumo da classificação */}
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Meta de %MB</span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={metaMB}
                  onChange={(e) => setMetaMB(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 h-10 px-3 rounded-xl border border-input bg-background text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm font-semibold text-muted-foreground">% · padrão {META_MB_PADRAO}%</span>
              </div>
            </label>
            {preview && (
              <div className="space-y-2 text-sm animate-in slide-in-from-left duration-500">
                <p className="text-xs text-muted-foreground">
                  Aba lida: <strong className="text-foreground">{preview.aba}</strong>
                  {preview.periodo ? ` · Real em ${preview.periodo}` : ''}
                </p>
                {(['baixa', 'negativa', 'emLinha', 'alta'] as const).map((c) => (
                  <div key={c} className="flex items-center justify-between">
                    <CategoriaBadge categoria={c} />
                    <span className="font-bold tabular-nums">{contagem[c]}</span>
                  </div>
                ))}
                {semJustificativa > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {semJustificativa} UT(s) sem justificativa na planilha.
                  </p>
                )}
              </div>
            )}
          </div>

          {erro && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium p-4 rounded-2xl flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {importSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold p-5 rounded-2xl flex items-center gap-3 animate-in slide-in-from-left duration-500">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div className="bg-emerald-500 w-1 h-6 rounded-full" />
              <span className="text-sm">
                {linhas.length} UTs publicadas com sucesso!
              </span>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden min-h-[500px] flex flex-col group">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Preview dos Dados</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  UTs detectadas e a classificação pelo %MB Real
                </p>
              </div>
              <div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20">
                {linhas.length} UTs encontradas
              </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar p-2">
              {linhas.length > 0 ? (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-accent/40">
                      {['#', 'Descrição da UT', '%MB Orç.', '%MB Real', 'Classificação', 'Justificativa'].map((h) => (
                        <th key={h} className="p-4 text-xs font-semibold text-muted-foreground border-b border-border whitespace-nowrap first:rounded-tl-2xl">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((ut) => (
                      <tr key={`${ut.pos}|${ut.descricao}`} className="hover:bg-primary/5 transition-colors">
                        <td className="p-4 text-sm text-muted-foreground tabular-nums border-b border-border/30">{ut.pos}</td>
                        <td className="p-4 text-sm font-medium border-b border-border/30 min-w-[260px]">{ut.descricao}</td>
                        <td className="p-4 text-sm tabular-nums border-b border-border/30">{fmtPct(ut.orcamento.pctMB)}</td>
                        <td className="p-4 text-sm font-bold tabular-nums border-b border-border/30">{fmtPct(ut.real.pctMB)}</td>
                        <td className="p-4 border-b border-border/30"><CategoriaBadge categoria={classificar(ut.real.pctMB, metaMB)} /></td>
                        <td className="p-4 text-sm text-muted-foreground border-b border-border/30 max-w-[320px] truncate" title={ut.justificativa}>
                          {ut.justificativa || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
                  <Database className="w-24 h-24 mb-6 text-muted-foreground animate-pulse" />
                  <h3 className="text-lg font-bold mb-1">Nenhum dado selecionado</h3>
                  <p className="text-sm max-w-xs mx-auto">
                    Selecione a planilha de fechamento para conferir as UTs antes de publicar.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
