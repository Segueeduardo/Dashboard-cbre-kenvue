import * as XLSX from 'xlsx';
import type {
  BlocoValores, Categoria, Fechamento, UT, ValoresUT,
} from '../types/fechamento.types';
import { META_MB_PADRAO, TOLERANCIA_PP } from '../types/fechamento.types';

/* ────────── Classificação ────────── */

/**
 * Regra de classificação pelo %MB Real:
 *  - Negativa:          %MB < 0
 *  - Baixa performance: 0 ≤ %MB < meta − 1 p.p.
 *  - Em linha:          meta − 1 p.p. ≤ %MB ≤ meta + 1 p.p.  (11% a 13% com meta de 12%)
 *  - Alta performance:  %MB > meta + 1 p.p.
 */
export function classificar(pctMBReal: number, metaMB: number = META_MB_PADRAO): Categoria {
  if (pctMBReal < 0) return 'negativa';
  if (pctMBReal < metaMB - TOLERANCIA_PP) return 'baixa';
  if (pctMBReal <= metaMB + TOLERANCIA_PP) return 'emLinha';
  return 'alta';
}

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  negativa: 'Negativa',
  baixa: 'Baixa performance',
  emLinha: 'Em linha',
  alta: 'Alta performance',
};

/* ────────── Formatadores ────────── */

export const fmtMoeda = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const fmtPct = (n: number) =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const fmtPP = (n: number) =>
  `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`;

/* ────────── Leitura da planilha ────────── */

type Linha = unknown[];

const norm = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    let s = v.trim().replace('%', '');
    if (!s) return null;
    // Formato pt-BR em texto: 1.332.838,5
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const texto = (v: unknown) => (v == null ? '' : String(v).replace(/\r\n?/g, '\n').trim());

/** "Plano A (123 - 01/01/2026) | Plano B (...) |" → lista; ignora o marcador vazio "( - )" */
function separarPlanos(v: unknown): string[] {
  return texto(v)
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s && !/^\(\s*-\s*\)$/.test(s));
}

function separarCodigo(descricao: string): { codigo: string; nome: string } {
  const m = descricao.match(/^\s*(\d+(?:\.\d+)+)\s*-\s*(.+)$/s);
  return m ? { codigo: m[1], nome: m[2].trim() } : { codigo: '', nome: descricao.trim() };
}

interface AbaLida {
  nome: string;
  periodo: string;
  total: BlocoValores | null;
  uts: UT[];
}

function lerAba(nome: string, ws: XLSX.WorkSheet): AbaLida | null {
  const linhas = XLSX.utils.sheet_to_json<Linha>(ws, { header: 1, defval: null, raw: true });
  const iCab = linhas.findIndex((l) => Array.isArray(l) && l.some((c) => norm(c) === 'descricao da ut'));
  if (iCab < 0) return null;

  const cab = linhas[iCab];
  const grupo: Linha = iCab > 0 ? linhas[iCab - 1] ?? [] : [];
  const cDesc = cab.findIndex((c) => norm(c) === 'descricao da ut');

  const achar = (linha: Linha, re: RegExp, padrao: number) => {
    const i = linha.findIndex((c) => re.test(norm(c)));
    return i >= 0 ? i : padrao;
  };

  // Blocos de 3 colunas (Rec.Liq. | MB | %MB): Orçamento, Real e Diferenças
  const cOrc = achar(grupo, /orcamento/, cDesc + 1);
  const cReal = achar(grupo, /\breal\b/, cDesc + 4);
  const cDif = achar(grupo, /diferenc/, cDesc + 7);
  // Comentários — nas abas de categoria o cabeçalho vem vazio, então vale a posição padrão
  const cFatos = achar(cab, /fatos relevantes/, cDesc + 10);
  const cAVencer = achar(cab, /a vencer/, cDesc + 11);
  const cVencidos = achar(cab, /vencidos/, cDesc + 12);

  const trio = (l: Linha, c: number): ValoresUT | null => {
    const recLiq = num(l[c]);
    const mb = num(l[c + 1]);
    const pct = num(l[c + 2]);
    if (recLiq == null && mb == null && pct == null) return null;
    const r = recLiq ?? 0;
    const m = mb ?? 0;
    return { recLiq: r, mb: m, pctMB: pct ?? (r > 0 ? (m / r) * 100 : 0) };
  };

  const bloco = (l: Linha): BlocoValores | null => {
    const orcamento = trio(l, cOrc);
    const real = trio(l, cReal);
    if (!real) return null;
    const orc = orcamento ?? { recLiq: 0, mb: 0, pctMB: 0 };
    const diferenca = trio(l, cDif) ?? {
      recLiq: real.recLiq - orc.recLiq,
      mb: real.mb - orc.mb,
      pctMB: real.pctMB - orc.pctMB,
    };
    return { orcamento: orc, real, diferenca };
  };

  let total: BlocoValores | null = null;
  const uts: UT[] = [];

  for (const l of linhas.slice(iCab + 1)) {
    if (!Array.isArray(l)) continue;
    const descricao = texto(l[cDesc]);
    if (!descricao) continue;
    const valores = bloco(l);
    if (!valores) continue;

    if (descricao.startsWith('*')) {
      total = valores;
      continue;
    }

    uts.push({
      pos: num(l[cDesc - 1]) ?? uts.length + 1,
      descricao,
      ...separarCodigo(descricao),
      ...valores,
      // Alguns comentários vêm com "||" sobrando no final
      justificativa: texto(l[cFatos]).replace(/[\s|]+$/, ''),
      planosAVencer: separarPlanos(l[cAVencer]),
      planosVencidos: separarPlanos(l[cVencidos]),
    });
  }

  const rotuloReal = texto(grupo[cReal]);
  const periodo = rotuloReal.match(/\bem\s+(.+)$/i)?.[1]?.trim() ?? '';

  return { nome, periodo, total, uts };
}

/**
 * Lê o workbook do fechamento. A aba principal é a que tem mais UTs
 * (ex.: "SETEMBRO (Orç x Real)"); as demais abas só complementam
 * comentários que estiverem vazios na principal.
 */
export function parseFechamento(wb: XLSX.WorkBook, metaMB: number = META_MB_PADRAO): Fechamento {
  const abas = wb.SheetNames
    .map((n) => lerAba(n, wb.Sheets[n]))
    .filter((a): a is AbaLida => !!a && a.uts.length > 0);

  if (abas.length === 0) {
    throw new Error(
      'Não encontrei a coluna "Descrição da UT" em nenhuma aba. Confira se é a planilha de fechamento (Orç x Real).'
    );
  }

  const principal = abas.reduce((a, b) => (b.uts.length > a.uts.length ? b : a));

  const complemento = new Map<string, UT>();
  for (const aba of abas) {
    if (aba === principal) continue;
    for (const ut of aba.uts) if (ut.codigo && !complemento.has(ut.codigo)) complemento.set(ut.codigo, ut);
  }

  const uts = principal.uts.map((ut) => {
    const extra = complemento.get(ut.codigo);
    if (!extra) return ut;
    return {
      ...ut,
      justificativa: ut.justificativa || extra.justificativa,
      planosAVencer: ut.planosAVencer.length ? ut.planosAVencer : extra.planosAVencer,
      planosVencidos: ut.planosVencidos.length ? ut.planosVencidos : extra.planosVencidos,
    };
  });

  return {
    tipo: 'fechamento-medicao',
    versao: 1,
    aba: principal.nome,
    periodo: principal.periodo,
    metaMB,
    total: principal.total,
    uts,
  };
}

export function isFechamento(p: unknown): p is Fechamento {
  const f = p as Fechamento | null;
  return !!f && typeof f === 'object' && f.tipo === 'fechamento-medicao' && Array.isArray(f.uts);
}

/** Totais: usa a linha "* Total" da planilha ou soma as UTs */
export function totaisDoFechamento(f: Fechamento): BlocoValores {
  if (f.total) return f.total;
  const soma = (k: keyof BlocoValores): ValoresUT => {
    const recLiq = f.uts.reduce((s, u) => s + u[k].recLiq, 0);
    const mb = f.uts.reduce((s, u) => s + u[k].mb, 0);
    return { recLiq, mb, pctMB: recLiq > 0 ? (mb / recLiq) * 100 : 0 };
  };
  const orcamento = soma('orcamento');
  const real = soma('real');
  return {
    orcamento,
    real,
    diferenca: {
      recLiq: real.recLiq - orcamento.recLiq,
      mb: real.mb - orcamento.mb,
      pctMB: real.pctMB - orcamento.pctMB,
    },
  };
}
