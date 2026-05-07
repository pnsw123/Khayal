-- Restore people + credits (previously dropped in 20260324144500_drop_people_and_credits.sql)
-- Scoped to top-cast only — no full crew tables needed

create table if not exists public.people (
  id                   bigserial   primary key,
  name                 text        not null,
  slug                 text        not null unique,
  tmdb_id              bigint      unique,
  profile_path         text,
  biography            text,
  birthday             date,
  known_for_department text        -- "Acting", "Directing", etc.
);

create table if not exists public.movie_credits (
  id             bigserial   primary key,
  movie_id       bigint      not null references public.movies(id)   on delete cascade,
  person_id      bigint      not null references public.people(id)   on delete cascade,
  role           text        not null check (role in ('cast','crew')),
  character_name text,
  job            text,                    -- for crew: "Director", "Writer", etc.
  credit_order   int         default 999,  -- lower = more prominent
  unique (movie_id, person_id, role, job)
);

create table if not exists public.tv_credits (
  id             bigserial   primary key,
  tv_series_id   bigint      not null references public.tv_series(id) on delete cascade,
  person_id      bigint      not null references public.people(id)    on delete cascade,
  role           text        not null check (role in ('cast','crew')),
  character_name text,
  job            text,
  credit_order   int         default 999,
  unique (tv_series_id, person_id, role, job)
);

-- Indexes
create index if not exists movie_credits_movie_id_idx    on public.movie_credits (movie_id, credit_order);
create index if not exists movie_credits_person_id_idx   on public.movie_credits (person_id);
create index if not exists tv_credits_tv_series_id_idx   on public.tv_credits    (tv_series_id, credit_order);
create index if not exists tv_credits_person_id_idx      on public.tv_credits    (person_id);
create index if not exists people_tmdb_id_idx            on public.people        (tmdb_id) where tmdb_id is not null;

-- RLS
alter table public.people        enable row level security;
alter table public.movie_credits enable row level security;
alter table public.tv_credits    enable row level security;

create policy "people_public_read"        on public.people        for select using (true);
create policy "movie_credits_public_read" on public.movie_credits for select using (true);
create policy "tv_credits_public_read"    on public.tv_credits    for select using (true);

create policy "people_admin_write"        on public.people        for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "movie_credits_admin_write" on public.movie_credits for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "tv_credits_admin_write"    on public.tv_credits    for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
