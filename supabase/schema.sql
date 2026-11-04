-- =====================================================================
-- Associação de Pais — esquema da base de dados (Supabase / PostgreSQL)
-- Executar no Supabase: SQL Editor > New query > colar tudo > Run
-- =====================================================================

-- ---------- Utilizadores da direção ----------
-- Só quem estiver nesta tabela consegue usar a app.
-- papel: 'admin' (tudo), 'tesoureiro' (tudo), 'direcao' (tudo exceto apagar movimentos), 'leitura' (só ver)
create table if not exists public.utilizadores (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'leitura' check (papel in ('admin','tesoureiro','direcao','leitura')),
  criado_em timestamptz not null default now()
);

-- ---------- Configuração (uma única linha) ----------
create table if not exists public.configuracao (
  id int primary key default 1 check (id = 1),
  nome_associacao text not null default 'Associação de Pais',
  ano_letivo text not null default '2026/2027',
  valor_quota numeric(10,2) not null default 10.00,
  saldo_inicial numeric(10,2) not null default 0
);
insert into public.configuracao (id) values (1) on conflict do nothing;

-- ---------- Sócios (uma família = um sócio) ----------
create table if not exists public.socios (
  id bigint generated always as identity primary key,
  numero int unique,
  nome text not null,               -- encarregado(a) de educação
  email text,
  telefone text,
  nif text,
  data_adesao date not null default current_date,
  ativo boolean not null default true,
  consentimento_rgpd boolean not null default false,
  notas text,
  criado_em timestamptz not null default now()
);

-- ---------- Educandos ----------
create table if not exists public.educandos (
  id bigint generated always as identity primary key,
  socio_id bigint not null references public.socios(id) on delete cascade,
  nome text not null,
  ano_escolar text not null check (ano_escolar in ('Pré 3 anos','Pré 4 anos','Pré 5 anos','1.º','2.º','3.º','4.º','Saiu')),
  turma text,
  criado_em timestamptz not null default now()
);

-- ---------- Tesouraria: movimentos ----------
create table if not exists public.movimentos (
  id bigint generated always as identity primary key,
  data date not null default current_date,
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text not null,
  descricao text not null,
  valor numeric(10,2) not null check (valor > 0),
  metodo text not null default 'Numerário' check (metodo in ('Numerário','MB WAY','Transferência','Multibanco','Cheque','Outro')),
  documento text,                   -- nº fatura / recibo
  ano_letivo text not null,
  evento_id bigint,
  socio_id bigint references public.socios(id) on delete set null,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);

-- ---------- Quotas ----------
create table if not exists public.quotas (
  id bigint generated always as identity primary key,
  socio_id bigint not null references public.socios(id) on delete cascade,
  ano_letivo text not null,
  valor numeric(10,2) not null,
  data_pagamento date not null default current_date,
  metodo text not null default 'Numerário',
  movimento_id bigint references public.movimentos(id) on delete set null,
  unique (socio_id, ano_letivo)
);

-- ---------- Eventos (festas, passeios, ...) ----------
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  nome text not null,
  tipo text not null default 'Festa' check (tipo in ('Festa','Passeio','Atividade','Angariação','Outro')),
  data date,
  local text,
  preco numeric(10,2) not null default 0,
  preco_nao_socio numeric(10,2),
  vagas int,
  descricao text,
  ano_letivo text not null,
  estado text not null default 'Aberto' check (estado in ('Planeado','Aberto','Fechado','Concluído','Cancelado')),
  criado_em timestamptz not null default now()
);

alter table public.movimentos
  drop constraint if exists movimentos_evento_fk,
  add constraint movimentos_evento_fk foreign key (evento_id) references public.eventos(id) on delete set null;

-- ---------- Inscrições em eventos ----------
create table if not exists public.inscricoes (
  id bigint generated always as identity primary key,
  evento_id bigint not null references public.eventos(id) on delete cascade,
  educando_id bigint references public.educandos(id) on delete set null,
  nome text not null,               -- nome do participante (permite não sócios)
  contacto text,
  valor numeric(10,2) not null default 0,
  pago boolean not null default false,
  movimento_id bigint references public.movimentos(id) on delete set null,
  notas text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_educandos_socio on public.educandos(socio_id);
create index if not exists idx_mov_ano on public.movimentos(ano_letivo, data);
create index if not exists idx_insc_evento on public.inscricoes(evento_id);

-- =====================================================================
-- Segurança (RLS): só membros da direção registados acedem aos dados
-- =====================================================================
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.utilizadores where id = auth.uid()
$$;

create or replace function public.pode_editar() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('admin','tesoureiro','direcao'), false)
$$;

do $$
declare t text;
begin
  foreach t in array array['socios','educandos','movimentos','quotas','eventos','inscricoes','configuracao','utilizadores'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists ler on public.%I', t);
    execute format('create policy ler on public.%I for select to authenticated using (public.meu_papel() is not null)', t);
  end loop;
  foreach t in array array['socios','educandos','quotas','eventos','inscricoes'] loop
    execute format('drop policy if exists escrever on public.%I', t);
    execute format('create policy escrever on public.%I for all to authenticated using (public.pode_editar()) with check (public.pode_editar())', t);
  end loop;
end $$;

-- Movimentos: direção cria/edita; só tesoureiro/admin apagam
drop policy if exists mov_inserir on public.movimentos;
drop policy if exists mov_editar on public.movimentos;
drop policy if exists mov_apagar on public.movimentos;
create policy mov_inserir on public.movimentos for insert to authenticated with check (public.pode_editar());
create policy mov_editar on public.movimentos for update to authenticated using (public.pode_editar()) with check (public.pode_editar());
create policy mov_apagar on public.movimentos for delete to authenticated using (public.meu_papel() in ('admin','tesoureiro'));

-- Configuração e utilizadores: só admin altera
drop policy if exists cfg_editar on public.configuracao;
create policy cfg_editar on public.configuracao for update to authenticated using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');
drop policy if exists util_editar on public.utilizadores;
create policy util_editar on public.utilizadores for all to authenticated using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');

-- =====================================================================
-- Passagem de ano letivo: promove todos os educandos um ano
-- (Pré 3 -> Pré 4 -> Pré 5 -> 1.º -> 2.º -> 3.º -> 4.º -> Saiu) e muda o ano letivo
-- =====================================================================
create or replace function public.passar_ano_letivo(novo_ano text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.meu_papel() is distinct from 'admin' then
    raise exception 'Apenas o administrador pode passar o ano letivo';
  end if;
  update public.educandos set ano_escolar = case ano_escolar
    when 'Pré 3 anos' then 'Pré 4 anos' when 'Pré 4 anos' then 'Pré 5 anos'
    when 'Pré 5 anos' then '1.º' when '1.º' then '2.º' when '2.º' then '3.º'
    when '3.º' then '4.º' when '4.º' then 'Saiu' else ano_escolar end;
  update public.configuracao set ano_letivo = novo_ano where id = 1;
end $$;
