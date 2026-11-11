import type { Categoria } from '../../types/fechamento.types';

/**
 * Cores de status por categoria. O laranja da marca fica reservado para a
 * interface (seleção, meta, foco); status usa vermelho / âmbar / neutro / verde.
 */
export const CATEGORIA_COR: Record<Categoria, { ponto: string; texto: string; traco: string }> = {
  negativa: { ponto: 'bg-red-600', texto: 'text-red-600 dark:text-red-400', traco: 'bg-red-500' },
  baixa: { ponto: 'bg-amber-400', texto: 'text-amber-700 dark:text-amber-400', traco: 'bg-amber-400' },
  emLinha: { ponto: 'bg-neutral-400', texto: 'text-foreground', traco: 'bg-neutral-300' },
  alta: { ponto: 'bg-emerald-600', texto: 'text-emerald-700 dark:text-emerald-400', traco: 'bg-emerald-400' },
};
