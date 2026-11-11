import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Fechamento } from '../types/fechamento.types';
import { isFechamento } from '../lib/fechamento';
import { supabase } from '../lib/supabase';

/** Tabela criada em supabase/migrations/20261110000000_fechamento_medicao.sql */
const TABELA = 'fechamento_medicao';

interface ResultadoSalvar {
  ok: boolean;
  erro?: string;
}

interface FechamentoContextType {
  fechamento: Fechamento | null;
  carregando: boolean;
  ultimaAtualizacao: Date | null;
  totalUTs: number;
  salvarFechamento: (f: Fechamento) => Promise<ResultadoSalvar>;
  limparDados: () => Promise<void>;
}

const FechamentoContext = createContext<FechamentoContextType | undefined>(undefined);

export const FechamentoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Buscar o último fechamento publicado no Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from(TABELA)
          .select('payload, updated_at')
          .eq('id', 1)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') console.error('Erro na Query do Supabase:', error);
          return;
        }

        // Ignora payloads no formato antigo (Ordens de Serviço)
        if (data && isFechamento(data.payload)) {
          setFechamento(data.payload);
          setUltimaAtualizacao(new Date(data.updated_at));
        }
      } catch (err) {
        console.error('Falha geral ao conectar Supabase:', err);
      } finally {
        setCarregando(false);
      }
    }
    loadData();
  }, []);

  const salvarFechamento = useCallback(async (f: Fechamento): Promise<ResultadoSalvar> => {
    const now = new Date();
    setFechamento(f);
    setUltimaAtualizacao(now);

    try {
      const { error } = await supabase.from(TABELA).upsert(
        { id: 1, payload: f, updated_at: now.toISOString() },
        { onConflict: 'id' }
      );
      if (error) {
        console.error('Erro ao subir dados para a nuvem:', error);
        return { ok: false, erro: error.message };
      }
      return { ok: true };
    } catch (err) {
      console.error('Falha de Rede ao subir Planilha', err);
      return { ok: false, erro: 'Falha de rede ao enviar a planilha.' };
    }
  }, []);

  const limparDados = useCallback(async () => {
    setFechamento(null);
    setUltimaAtualizacao(null);
    try {
      const { error } = await supabase.from(TABELA).delete().eq('id', 1);
      if (error) console.error('Erro ao limpar nuvem:', error);
    } catch {
      // Ignorar erros locais
    }
  }, []);

  return (
    <FechamentoContext.Provider
      value={{
        fechamento,
        carregando,
        ultimaAtualizacao,
        totalUTs: fechamento?.uts.length ?? 0,
        salvarFechamento,
        limparDados,
      }}
    >
      {children}
    </FechamentoContext.Provider>
  );
};

export const useFechamento = (): FechamentoContextType => {
  const context = useContext(FechamentoContext);
  if (!context) {
    throw new Error('useFechamento deve ser usado dentro de um FechamentoProvider');
  }
  return context;
};
