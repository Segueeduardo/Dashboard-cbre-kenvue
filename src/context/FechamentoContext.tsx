import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode,
} from 'react';
import type { Fechamento, MesPublicado } from '../types/fechamento.types';
import { adicionarMes, lerHistorico, montarHistorico } from '../lib/fechamento';
import { supabase } from '../lib/supabase';

/** Tabela criada em supabase/migrations/20261110000000_fechamento_medicao.sql */
const TABELA = 'fechamento_medicao';

interface ResultadoSalvar {
  ok: boolean;
  erro?: string;
  /** Meses que saíram do dashboard por causa do limite de meses vigentes */
  removidos?: string[];
}

interface FechamentoContextType {
  /** Meses vigentes, do mais recente para o mais antigo */
  meses: MesPublicado[];
  /** Mês em exibição no dashboard (AAAA-MM) */
  mesSelecionado: string | null;
  selecionarMes: (mes: string) => void;
  /** Fechamento do mês em exibição */
  fechamento: Fechamento | null;
  carregando: boolean;
  ultimaAtualizacao: Date | null;
  totalUTs: number;
  salvarFechamento: (f: Fechamento, mes: string) => Promise<ResultadoSalvar>;
  removerMes: (mes: string) => Promise<ResultadoSalvar>;
  limparDados: () => Promise<void>;
}

const FechamentoContext = createContext<FechamentoContextType | undefined>(undefined);

export const FechamentoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meses, setMeses] = useState<MesPublicado[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const mesesRef = useRef<MesPublicado[]>([]);

  const aplicar = useCallback((lista: MesPublicado[]) => {
    mesesRef.current = lista;
    setMeses(lista);
  }, []);

  // Buscar os meses publicados no Supabase
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

        // Aceita o histórico de meses e também o formato antigo (um único fechamento)
        if (data) aplicar(lerHistorico(data.payload, data.updated_at));
      } catch (err) {
        console.error('Falha geral ao conectar Supabase:', err);
      } finally {
        setCarregando(false);
      }
    }
    loadData();
  }, [aplicar]);

  /** Grava a lista de meses na nuvem (ou apaga a linha se não sobrar nenhum) */
  const gravar = useCallback(async (lista: MesPublicado[]): Promise<ResultadoSalvar> => {
    try {
      const { error } = lista.length
        ? await supabase.from(TABELA).upsert(
            { id: 1, payload: montarHistorico(lista), updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          )
        : await supabase.from(TABELA).delete().eq('id', 1);
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

  const salvarFechamento = useCallback(
    async (f: Fechamento, mes: string): Promise<ResultadoSalvar> => {
      const { meses: lista, removidos } = adicionarMes(mesesRef.current, {
        mes,
        atualizadoEm: new Date().toISOString(),
        fechamento: f,
      });
      aplicar(lista);
      // Mostra o mês recém-publicado (se ele não saiu por ser antigo demais)
      if (lista.some((m) => m.mes === mes)) setMesSelecionado(mes);
      return { ...(await gravar(lista)), removidos };
    },
    [aplicar, gravar]
  );

  const removerMes = useCallback(
    async (mes: string): Promise<ResultadoSalvar> => {
      const lista = mesesRef.current.filter((m) => m.mes !== mes);
      aplicar(lista);
      return gravar(lista);
    },
    [aplicar, gravar]
  );

  const limparDados = useCallback(async () => {
    aplicar([]);
    setMesSelecionado(null);
    await gravar([]);
  }, [aplicar, gravar]);

  // Sem escolha (ou com o mês escolhido já removido), vale o mês mais recente
  const atual = useMemo(
    () => meses.find((m) => m.mes === mesSelecionado) ?? meses[0] ?? null,
    [meses, mesSelecionado]
  );

  return (
    <FechamentoContext.Provider
      value={{
        meses,
        mesSelecionado: atual?.mes ?? null,
        selecionarMes: setMesSelecionado,
        fechamento: atual?.fechamento ?? null,
        carregando,
        ultimaAtualizacao: atual ? new Date(atual.atualizadoEm) : null,
        totalUTs: atual?.fechamento.uts.length ?? 0,
        salvarFechamento,
        removerMes,
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
