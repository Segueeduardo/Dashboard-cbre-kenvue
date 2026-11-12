import React, { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronUp, ChevronsUpDown, MessageSquareText, CalendarClock, AlertOctagon, Pencil, Loader2, Check,
} from 'lucide-react';
import { useFechamento } from '../../context/FechamentoContext';
import type { Categoria, UT, ValoresUT } from '../../types/fechamento.types';
import { TOLERANCIA_PP } from '../../types/fechamento.types';
import { CATEGORIA_COR } from './categoria';
import { CATEGORIA_LABEL, classificar, fmtMoeda, fmtPct, fmtPP } from '../../lib/fechamento';

export const CategoriaBadge: React.FC<{ categoria: Categoria }> = ({ categoria }) => (
  <span className="inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap">
    <span className={`traco w-1.5 h-3.5 shrink-0 ${CATEGORIA_COR[categoria].ponto}`} aria-hidden="true" />
    {CATEGORIA_LABEL[categoria]}
  </span>
);

type Campo = 'pos' | 'pctOrc' | 'pctReal' | 'dif' | 'recReal' | 'mbReal';

const VALOR: Record<Campo, (u: UT) => number> = {
  pos: (u) => u.pos,
  pctOrc: (u) => u.orcamento.pctMB,
  pctReal: (u) => u.real.pctMB,
  dif: (u) => u.diferenca.pctMB,
  recReal: (u) => u.real.recLiq,
  mbReal: (u) => u.real.mb,
};

const chave = (u: UT) => `${u.pos}|${u.descricao}`;

const BlocoValores: React.FC<{ titulo: string; v: ValoresUT; pp?: boolean; destaque?: string }> = ({ titulo, v, pp, destaque }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs font-semibold text-muted-foreground mb-3">{titulo}</p>
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Rec. Líq.</dt>
        <dd className="font-semibold tabular-nums">{fmtMoeda(v.recLiq)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">MB</dt>
        <dd className={`font-semibold tabular-nums ${v.mb < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{fmtMoeda(v.mb)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">%MB</dt>
        <dd className={`font-bold tabular-nums ${destaque ?? (v.pctMB < 0 ? 'text-red-600 dark:text-red-400' : '')}`}>
          {pp ? fmtPP(v.pctMB) : fmtPct(v.pctMB)}
        </dd>
      </div>
    </dl>
  </div>
);

const ListaPlanos: React.FC<{ titulo: string; itens: string[]; icon: React.ReactNode; vazio: string }> = ({ titulo, itens, icon, vazio }) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
      {icon}
      {titulo}
      {itens.length > 0 && <span className="text-foreground">({itens.length})</span>}
    </p>
    {itens.length > 0 ? (
      <ul className="space-y-1.5 text-sm">
        {itens.map((p, i) => (
          <li key={i} className="flex gap-2 leading-snug">
            <span className="mt-2 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">{vazio}</p>
    )}
  </div>
);

const LIMITE_JUSTIFICATIVA = 4000;

/** Justificativa da UT, com edição no próprio cartão */
const Justificativa: React.FC<{ ut: UT }> = ({ ut }) => {
  const { mesSelecionado, salvarJustificativa } = useFechamento();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(ut.justificativa);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const abrir = () => {
    setTexto(ut.justificativa);
    setErro(null);
    setSalvo(false);
    setEditando(true);
  };

  const salvar = async () => {
    if (!mesSelecionado) return;
    setSalvando(true);
    setErro(null);
    const r = await salvarJustificativa(mesSelecionado, ut.descricao, texto);
    setSalvando(false);
    if (r.ok) {
      setEditando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 4000);
    } else {
      setErro(`Não foi possível salvar: ${r.erro}`);
    }
  };

  const mudou = texto.trim() !== ut.justificativa;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <MessageSquareText className="w-3.5 h-3.5" />
          Justificativa (fatos relevantes no real)
        </p>
        {!editando && mesSelecionado && (
          <span className="flex items-center gap-3">
            {salvo && (
              <span role="status" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Salvo
              </span>
            )}
            <button
              type="button"
              onClick={abrir}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          </span>
        )}
      </div>

      {editando ? (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITE_JUSTIFICATIVA}
            rows={Math.min(12, Math.max(4, Math.ceil(texto.length / 90) + 1))}
            aria-label={`Justificativa de ${ut.nome}`}
            placeholder="Descreva os fatos relevantes no real desta UT"
            className="w-full rounded-xl border border-input bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          {erro && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{erro}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || !mudou}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={salvando}
              className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {texto.length}/{LIMITE_JUSTIFICATIVA}
            </span>
          </div>
        </div>
      ) : ut.justificativa ? (
        <p className="text-sm leading-relaxed whitespace-pre-line max-w-[75ch]">{ut.justificativa}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Sem justificativa informada.</p>
      )}
    </>
  );
};

const DetalheUT: React.FC<{ ut: UT; categoria: Categoria; metaMB: number }> = ({ ut, categoria, metaMB }) => (
  <div className="p-5 md:p-6 bg-muted border-b border-border space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <BlocoValores titulo="Orçamento" v={ut.orcamento} />
      <BlocoValores titulo="Real" v={ut.real} destaque={CATEGORIA_COR[categoria].texto} />
      <BlocoValores titulo="Diferenças" v={ut.diferenca} pp />
    </div>

    <div className="rounded-xl border border-border bg-card p-4">
      <Justificativa ut={ut} />
      <p className="text-xs text-muted-foreground mt-3">
        Classificada como <strong className={CATEGORIA_COR[categoria].texto}>{CATEGORIA_LABEL[categoria]}</strong>: %MB Real de{' '}
        {fmtPct(ut.real.pctMB)} contra meta de {fmtPct(metaMB)} (em linha de {fmtPct(metaMB - TOLERANCIA_PP)} a {fmtPct(metaMB + TOLERANCIA_PP)}).
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ListaPlanos
        titulo="Planos de ação a vencer"
        itens={ut.planosAVencer}
        icon={<CalendarClock className="w-3.5 h-3.5" />}
        vazio="Nenhum plano a vencer."
      />
      <ListaPlanos
        titulo="Planos de ação vencidos"
        itens={ut.planosVencidos}
        icon={<AlertOctagon className="w-3.5 h-3.5" />}
        vazio="Nenhum plano vencido."
      />
    </div>
  </div>
);

interface UTTableProps {
  uts: UT[];
  metaMB: number;
}

const UTTable: React.FC<UTTableProps> = ({ uts, metaMB }) => {
  const [ordem, setOrdem] = useState<{ campo: Campo; dir: 1 | -1 }>({ campo: 'pos', dir: 1 });
  const [aberta, setAberta] = useState<string | null>(null);

  const ordenadas = useMemo(
    () => [...uts].sort((a, b) => (VALOR[ordem.campo](a) - VALOR[ordem.campo](b)) * ordem.dir),
    [uts, ordem]
  );

  const Th: React.FC<{ campo: Campo; children: React.ReactNode; className?: string }> = ({ campo, children, className = '' }) => {
    const ativo = ordem.campo === campo;
    const Icone = !ativo ? ChevronsUpDown : ordem.dir === 1 ? ChevronUp : ChevronDown;
    return (
      <th
        aria-sort={ativo ? (ordem.dir === 1 ? 'ascending' : 'descending') : 'none'}
        className={`px-3 py-3 text-xs font-semibold text-muted-foreground border-b border-border whitespace-nowrap ${className}`}
      >
        <button
          type="button"
          onClick={() => setOrdem((o) => ({ campo, dir: o.campo === campo && o.dir === 1 ? -1 : 1 }))}
          className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${ativo ? 'text-foreground' : ''}`}
        >
          {children}
          <Icone className="w-3.5 h-3.5" />
        </button>
      </th>
    );
  };

  if (uts.length === 0) {
    return <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma UT encontrada para este filtro.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0 min-w-[900px]">
        <thead>
          <tr className="bg-muted">
            <Th campo="pos" className="w-12 pl-5">#</Th>
            <th className="px-3 py-3 text-xs font-semibold text-muted-foreground border-b border-border">
              Descrição da UT
            </th>
            <Th campo="pctOrc" className="text-right">%MB orçado</Th>
            <Th campo="pctReal" className="text-right">%MB real</Th>
            <Th campo="dif" className="text-right">Dif.</Th>
            <Th campo="recReal" className="text-right">Rec. líq. real</Th>
            <Th campo="mbReal" className="text-right">MB real</Th>
            <th className="px-3 py-3 text-xs font-semibold text-muted-foreground border-b border-border">
              Classificação
            </th>
            <th className="w-10 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((ut) => {
            const k = chave(ut);
            const categoria = classificar(ut.real.pctMB, metaMB);
            const expandida = aberta === k;
            return (
              <React.Fragment key={k}>
                <tr
                  onClick={() => setAberta(expandida ? null : k)}
                  className={`cursor-pointer transition-colors hover:bg-muted ${expandida ? 'bg-muted' : ''}`}
                >
                  <td className="pl-5 pr-3 py-3 text-sm text-muted-foreground tabular-nums border-b border-border/40">{ut.pos}</td>
                  <td className="px-3 py-3 border-b border-border/40">
                    <p className="text-sm font-semibold leading-snug">{ut.nome}</p>
                    {ut.codigo && <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{ut.codigo}</p>}
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums text-muted-foreground border-b border-border/40">
                    {fmtPct(ut.orcamento.pctMB)}
                  </td>
                  <td className={`px-3 py-3 text-sm text-right tabular-nums font-extrabold border-b border-border/40 ${CATEGORIA_COR[categoria].texto}`}>
                    {fmtPct(ut.real.pctMB)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums whitespace-nowrap border-b border-border/40">
                    {fmtPP(ut.diferenca.pctMB)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums whitespace-nowrap border-b border-border/40">
                    {fmtMoeda(ut.real.recLiq)}
                  </td>
                  <td className={`px-3 py-3 text-sm text-right tabular-nums whitespace-nowrap border-b border-border/40 ${ut.real.mb < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {fmtMoeda(ut.real.mb)}
                  </td>
                  <td className="px-3 py-3 border-b border-border/40">
                    <CategoriaBadge categoria={categoria} />
                  </td>
                  <td className="pr-4 py-3 border-b border-border/40">
                    <button
                      type="button"
                      aria-expanded={expandida}
                      aria-label={`${expandida ? 'Ocultar' : 'Ver'} justificativa de ${ut.nome}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAberta(expandida ? null : k);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                    </button>
                  </td>
                </tr>
                {expandida && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <DetalheUT ut={ut} categoria={categoria} metaMB={metaMB} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UTTable;
