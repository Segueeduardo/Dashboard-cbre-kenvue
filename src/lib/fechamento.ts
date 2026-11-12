import * as XLSX from 'xlsx';
import type {
  BlocoValores, Categoria, Fechamento, HistoricoFechamentos, MesPublicado, UT, ValoresUT,
} from '../types/fechamento.types';
import { MAX_MESES, META_MB_PADRAO, TOLERANCIA_PP } from '../types/fechamento.types';

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

/**
 * Nomes de exibição fixos por código de UT: valem mesmo que a planilha
 * traga outro texto. A `descricao` original não muda (é a chave da UT).
 */
const NOMES_FIXOS: Record<string, string> = {
  '9.03.0384.031': 'JOHNSON & JOHNSON – LIMPEZA - MF-SJC',
};

function separarCodigo(descricao: string): { codigo: string; nome: string } {
  const m = descricao.match(/^\s*(\d+(?:\.\d+)+)\s*-\s*(.+)$/s);
  if (!m) return { codigo: '', nome: descricao.trim() };
  return { codigo: m[1], nome: NOMES_FIXOS[m[1]] ?? m[2].trim() };
}

/** Aplica os nomes fixos a meses já publicados (salvos com o nome da planilha) */
const comNomesFixos = (meses: MesPublicado[]): MesPublicado[] =>
  meses.map((m) => ({
    ...m,
    fechamento: {
      ...m.fechamento,
      uts: m.fechamento.uts.map((u) => (NOMES_FIXOS[u.codigo] ? { ...u, nome: NOMES_FIXOS[u.codigo] } : u)),
    },
  }));

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

/** Aba do fechamento: "OUTUBRO (Orç x Real)" */
const ehAbaPrincipal = (nome: string) => /orc\s*x\s*real/.test(norm(nome));

/**
 * Lê o workbook do fechamento usando somente a aba principal
 * (ex.: "OUTUBRO (Orç x Real)"). As abas de categoria (Negativas,
 * Baixa/Alta performance) são ignoradas: podem estar com dados de
 * outro mês. Sem aba com esse nome, vale a que tiver mais UTs.
 */
export function parseFechamento(wb: XLSX.WorkBook, metaMB: number = META_MB_PADRAO): Fechamento {
  const ler = (nomes: string[]) =>
    nomes
      .map((n) => lerAba(n, wb.Sheets[n]))
      .filter((a): a is AbaLida => !!a && a.uts.length > 0);

  let abas = ler(wb.SheetNames.filter(ehAbaPrincipal));
  if (abas.length === 0) abas = ler(wb.SheetNames);

  if (abas.length === 0) {
    throw new Error(
      'Não encontrei a coluna "Descrição da UT" em nenhuma aba. Confira se é a planilha de fechamento (Orç x Real).'
    );
  }

  const principal = abas.reduce((a, b) => (b.uts.length > a.uts.length ? b : a));
  const uts = principal.uts;

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

/* ────────── Meses vigentes ────────── */

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MESES_ROTULO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`;

/** Mês anterior completo — a medição é feita até o dia 10/11 do mês seguinte */
export function mesAnterior(hoje: Date = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return chaveMes(d.getFullYear(), d.getMonth() + 1);
}

/**
 * Descobre o mês da planilha pelo nome da aba ("OUTUBRO (Orç x Real)")
 * ou pelo período do cabeçalho ("Out-Out/26"). Devolve "AAAA-MM" ou null.
 */
export function detectarMes(aba: string, periodo: string, hoje: Date = new Date()): string | null {
  const a = norm(aba);
  const p = norm(periodo);
  let mes = MESES.findIndex((m) => a.includes(m)) + 1;
  if (!mes) {
    // "set-out/26" → vale o último mês do intervalo
    const abrev = p.split('/')[0].split('-').pop()?.trim().slice(0, 3) ?? '';
    mes = abrev.length === 3 ? MESES.findIndex((m) => m.startsWith(abrev)) + 1 : 0;
  }
  if (!mes) return null;

  const anoTxt = p.match(/\/(\d{2,4})\s*$/)?.[1];
  let ano: number;
  if (anoTxt) ano = anoTxt.length === 2 ? 2000 + Number(anoTxt) : Number(anoTxt);
  else {
    // Sem ano no cabeçalho: o mês mais recente que já terminou
    ano = hoje.getFullYear();
    if (mes > hoje.getMonth() + 1) ano -= 1;
  }
  return chaveMes(ano, mes);
}

/** "2026-10" → "outubro de 2026" */
export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  const nome = MESES_ROTULO[m - 1];
  return nome && ano ? `${nome} de ${ano}` : mes;
}

/** "2026-10" → "out/26" */
export function rotuloMesCurto(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  const nome = MESES_ROTULO[m - 1];
  return nome && ano ? `${nome.slice(0, 3)}/${String(ano).slice(-2)}` : mes;
}

export const ehMesValido = (mes: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);

/**
 * Converte o payload do Supabase na lista de meses (mais recente primeiro).
 * Aceita o formato novo (histórico) e o antigo (um Fechamento solto).
 */
export function lerHistorico(payload: unknown, atualizadoEm: string): MesPublicado[] {
  const h = payload as HistoricoFechamentos | null;
  if (h && typeof h === 'object' && h.tipo === 'fechamento-historico' && Array.isArray(h.meses)) {
    return comNomesFixos(ordenarMeses(h.meses.filter((m) => m && ehMesValido(m.mes) && isFechamento(m.fechamento))));
  }
  if (isFechamento(payload)) {
    const data = new Date(atualizadoEm);
    const mes = detectarMes(payload.aba, payload.periodo, data) ?? mesAnterior(data);
    return comNomesFixos([{ mes, atualizadoEm, fechamento: payload }]);
  }
  return [];
}

const ordenarMeses = (meses: MesPublicado[]) => [...meses].sort((a, b) => b.mes.localeCompare(a.mes));

/**
 * Inclui (ou substitui) um mês e mantém só os MAX_MESES mais recentes.
 * `removidos` traz os meses que saíram por causa do limite.
 */
export function adicionarMes(
  meses: MesPublicado[],
  novo: MesPublicado
): { meses: MesPublicado[]; removidos: string[] } {
  const todos = ordenarMeses([...meses.filter((m) => m.mes !== novo.mes), novo]);
  return {
    meses: todos.slice(0, MAX_MESES),
    removidos: todos.slice(MAX_MESES).map((m) => m.mes),
  };
}

/**
 * Reimportação de um mês já publicado: os valores vêm da planilha nova, mas a
 * justificativa de cada UT que já existia continua sendo a salva no sistema
 * (a da primeira importação ou a editada no dashboard). Só UTs que ainda não
 * existiam no mês recebem a justificativa da planilha.
 */
export function preservarJustificativas(novo: Fechamento, salvo: Fechamento | undefined): Fechamento {
  if (!salvo) return novo;
  const salvas = new Map(salvo.uts.map((u) => [u.descricao, u.justificativa]));
  return {
    ...novo,
    uts: novo.uts.map((u) => {
      const justificativa = salvas.get(u.descricao);
      return justificativa === undefined ? u : { ...u, justificativa };
    }),
  };
}

export const montarHistorico = (meses: MesPublicado[]): HistoricoFechamentos => ({
  tipo: 'fechamento-historico',
  versao: 2,
  meses,
});

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
