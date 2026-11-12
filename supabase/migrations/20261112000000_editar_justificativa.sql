-- Edição da justificativa ("Fatos Relevantes no Real") direto no dashboard, sem login.
--
-- A tabela continua aceitando escrita só de usuários logados. Esta função é a
-- única porta aberta para visitantes: troca o texto da justificativa de UMA UT
-- de UM mês e nada mais (valores, planos de ação e demais meses ficam intactos).
--
-- Quando o login da aplicação existir, basta trocar o grant no final para
-- "to authenticated" e a edição volta a exigir usuário logado.

create or replace function public.atualizar_justificativa(
  p_mes       text,  -- mês de referência, "AAAA-MM"
  p_descricao text,  -- coluna "Descrição da UT" completa
  p_texto     text   -- nova justificativa
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_base    text[];
  v_i       int;
  v_j       int;
  v_agora   timestamptz := now();
  v_texto   text := btrim(coalesce(p_texto, ''));
begin
  if length(v_texto) > 4000 then
    raise exception 'Justificativa muito longa (máximo de 4000 caracteres).';
  end if;

  select payload into v_payload from fechamento_medicao where id = 1 for update;
  if not found then
    raise exception 'Nenhum fechamento publicado.';
  end if;

  if v_payload->>'tipo' = 'fechamento-historico' then
    select ord - 1 into v_i
      from jsonb_array_elements(v_payload->'meses') with ordinality as t(m, ord)
     where m->>'mes' = p_mes
     limit 1;
    if v_i is null then
      raise exception 'Mês % não está publicado.', p_mes;
    end if;
    v_base := array['meses', v_i::text, 'fechamento'];
    v_payload := jsonb_set(
      v_payload,
      array['meses', v_i::text, 'atualizadoEm'],
      to_jsonb(to_char(v_agora at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    );
  else
    -- Formato antigo: um único fechamento solto no payload
    v_base := array[]::text[];
  end if;

  select ord - 1 into v_j
    from jsonb_array_elements(v_payload #> (v_base || array['uts'])) with ordinality as t(u, ord)
   where u->>'descricao' = p_descricao
   limit 1;
  if v_j is null then
    raise exception 'UT não encontrada neste mês.';
  end if;

  v_payload := jsonb_set(v_payload, v_base || array['uts', v_j::text, 'justificativa'], to_jsonb(v_texto));

  update fechamento_medicao set payload = v_payload, updated_at = v_agora where id = 1;
  return v_agora;
end;
$$;

revoke all on function public.atualizar_justificativa(text, text, text) from public;
grant execute on function public.atualizar_justificativa(text, text, text) to anon, authenticated;
