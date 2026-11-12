/**
 * Modelo de dados do Fechamento de Medição de Faturamento (Orçado x Real por UT).
 */

/** Trio de valores que se repete na planilha: Rec.Liq. | MB | %MB */
export interface ValoresUT {
  recLiq: number;
  mb: number;
  /** Percentual de Margem Bruta, já em pontos percentuais (ex.: 3.8 = 3,8%) */
  pctMB: number;
}

export interface BlocoValores {
  orcamento: ValoresUT;
  real: ValoresUT;
  diferenca: ValoresUT;
}

/** Uma linha da planilha = uma UT */
export interface UT extends BlocoValores {
  pos: number;
  /** Coluna B completa — "Descrição da UT" */
  descricao: string;
  /** Código extraído do início da descrição (ex.: 9.03.0384.031) */
  codigo: string;
  /** Descrição sem o código */
  nome: string;
  /** "Fatos Relevantes no Real" — a justificativa/comentário da UT */
  justificativa: string;
  planosAVencer: string[];
  planosVencidos: string[];
}

export type Categoria = 'negativa' | 'baixa' | 'emLinha' | 'alta';
export type FiltroCategoria = 'todas' | Categoria;

/** Fechamento de um mês (uma planilha importada) */
export interface Fechamento {
  tipo: 'fechamento-medicao';
  versao: 1;
  /** Nome da aba principal lida (ex.: "SETEMBRO (Orç x Real)") */
  aba: string;
  /** Período do Real conforme o cabeçalho (ex.: "Set-Set/26") */
  periodo: string;
  /** Meta de %MB usada na classificação (padrão 12) */
  metaMB: number;
  /** Linha "* Total" da planilha, quando existir */
  total: BlocoValores | null;
  uts: UT[];
}

/** Um mês publicado no dashboard */
export interface MesPublicado {
  /** Mês de referência no formato AAAA-MM (ex.: "2026-10") */
  mes: string;
  /** Quando a planilha desse mês foi publicada (ISO) */
  atualizadoEm: string;
  fechamento: Fechamento;
}

/**
 * Payload salvo no Supabase a partir da versão 2: os meses vigentes,
 * do mais recente para o mais antigo. O formato antigo (um único
 * Fechamento solto) continua sendo lido e vira o primeiro mês.
 */
export interface HistoricoFechamentos {
  tipo: 'fechamento-historico';
  versao: 2;
  meses: MesPublicado[];
}

/** Quantos meses ficam no dashboard; ao publicar um a mais, o mais antigo sai */
export const MAX_MESES = 3;

export const META_MB_PADRAO = 12;
/** Faixa em torno da meta (em p.p.) considerada "em linha com o orçado": 12% ± 1 → 11% a 13% */
export const TOLERANCIA_PP = 1;
