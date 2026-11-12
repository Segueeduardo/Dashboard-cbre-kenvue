import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode,
} from 'react';
import type { Fechamento, MesPublicado } from '../types/fechamento.types';
import { adicionarMes, lerHistorico, montarHistorico, preservarJustificativas } from '../lib/fechamento';
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
  /** Troca a justificativa de uma UT do mês; não exige login */
  salvarJustificativa: (mes: string, descricao: string, texto: string) => Promise<ResultadoSalvar>;
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

  /**
   * Lê os meses direto do banco antes de gravar: a lista em memória pode estar
   * velha (alguém editou uma justificativa depois que esta tela abriu) e
   * gravá-la de volta apagaria essas edições.
   */
  const buscarAtual = useCallback(async (): Promise<MesPublicado[]> => {
    const { data, error } = await supabase.from(TABELA).select('payload, updated_at').eq('id', 1).single();
    if (error) {
      if (error.code === 'PGRST116') return []; // nada publicado ainda
      throw new Error(error.message);
    }
    return data ? lerHistorico(data.payload, data.updated_at) : [];
  }, []);

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
      let atuais: MesPublicado[];
      try {
        atuais = await buscarAtual();
      } catch (err) {
        console.error('Erro ao ler os meses publicados antes de gravar:', err);
        return { ok: false, erro: 'Não consegui ler os dados já publicados; nada foi alterado. Tente de novo.' };
      }
      // Mês já publicado: as justificativas salvas no sistema têm prioridade sobre as da planilha
      const jaPublicado = atuais.find((m) => m.mes === mes)?.fechamento;
      const { meses: lista, removidos } = adicionarMes(atuais, {
        mes,
        atualizadoEm: new Date().toISOString(),
        fechamento: preservarJustificativas(f, jaPublicado),
      });
      aplicar(lista);
      // Mostra o mês recém-publicado (se ele não saiu por ser antigo demais)
      if (lista.some((m) => m.mes === mes)) setMesSelecionado(mes);
      return { ...(await gravar(lista)), removidos };
    },
    [aplicar, buscarAtual, gravar]
  );

  const removerMes = useCallback(
    async (mes: string): Promise<ResultadoSalvar> => {
      let atuais: MesPublicado[];
      try {
        atuais = await buscarAtual();
      } catch (err) {
        console.error('Erro ao ler os meses publicados antes de gravar:', err);
        return { ok: false, erro: 'Não consegui ler os dados já publicados; nada foi alterado. Tente de novo.' };
      }
      const lista = atuais.filter((m) => m.mes !== mes);
      aplicar(lista);
      return gravar(lista);
    },
    [aplicar, buscarAtual, gravar]
  );

  // Passa pela função atualizar_justificativa do banco (migração 20261112000000),
  // que altera só esse texto; por isso funciona para visitantes sem login.
  const salvarJustificativa = useCallback(
    async (mes: string, descricao: string, texto: string): Promise<ResultadoSalvar> => {
      const justificativa = texto.trim();
      try {
        const { data, error } = await supabase.rpc('atualizar_justificativa', {
          p_mes: mes,
          p_descricao: descricao,
          p_texto: justificativa,
        });
        if (error) {
          console.error('Erro ao salvar justificativa:', error);
          const semFuncao = error.code === 'PGRST202' || error.code === '42883';
          return {
            ok: false,
            erro: semFuncao
              ? 'A edição ainda não foi habilitada no banco de dados.'
              : error.message,
          };
        }
        const atualizadoEm = typeof data === 'string' ? data : new Date().toISOString();
        aplicar(
          mesesRef.current.map((m) =>
            m.mes !== mes
              ? m
              : {
                  ...m,
                  atualizadoEm,
                  fechamento: {
                    ...m.fechamento,
                    uts: m.fechamento.uts.map((u) => (u.descricao === descricao ? { ...u, justificativa } : u)),
                  },
                }
          )
        );
        return { ok: true };
      } catch (err) {
        console.error('Falha de rede ao salvar justificativa', err);
        return { ok: false, erro: 'Falha de rede ao salvar a justificativa.' };
      }
    },
    [aplicar]
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
        salvarJustificativa,
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
