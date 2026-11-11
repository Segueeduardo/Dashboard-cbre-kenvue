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

/** Payload salvo no Supabase (fechamento_medicao.payload) */
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

export const META_MB_PADRAO = 12;
/** Faixa em torno da meta (em p.p.) considerada "em linha com o orçado": 12% ± 1 → 11% a 13% */
export const TOLERANCIA_PP = 1;
