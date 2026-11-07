-- US-50 to US-57: Content Management.
--
-- TMDB stays Echo's catalogue. These tables only record what admins change:
--
--   managed_titles    a movie or TV show an admin has added, edited or hidden,
--                     keyed by (media_type, tmdb_id). tmdb_title, tmdb_year and
--                     tmdb_poster_path are TMDB's values when it was last
--                     saved, for admin lists and search; pages read TMDB.
--   managed_seasons   a show's seasons imported from TMDB, keyed by number.
--   managed_episodes  a season's episodes imported from TMDB, keyed by number.
--
-- overrides holds only the fields an admin changed. A key that's present is
-- shown instead of TMDB's value, even when it's an empty string (deliberately
-- blank); a missing key means TMDB's value. TMDB changes never touch it.
--
-- Hiding never deletes anything, and each level keeps its own flag: a hidden
-- show hides its seasons and episodes, a hidden season hides its episodes,
-- and restoring one leaves individually hidden items below it hidden.
-- Watchlists, ratings and viewing status aren't changed.
--
-- Only admins (is_admin()) can read or change these tables. Everyone else
-- gets just what pages need through get_title_rules() and get_show_rules().
-- Nothing can be deleted through the API.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------
-- Override validation
-- ---------------------------------------------------------------------

create or replace function public.override_text_is_valid(p_value jsonb, p_max integer, p_required boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'string'
    and char_length(p_value #>> '{}') <= p_max
    and (not p_required or char_length(btrim(p_value #>> '{}')) > 0);
$$;

create or replace function public.override_date_is_valid(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'string'
    and ((p_value #>> '{}') = '' or (p_value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$');
$$;

-- A TMDB image path such as "/abc123.jpg", or '' for no image.
create or replace function public.override_image_is_valid(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'string'
    and ((p_value #>> '{}') = '' or (p_value #>> '{}') ~ '^/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp|svg)$');
$$;

create or replace function public.title_overrides_are_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (p - array['title', 'tagline', 'overview', 'date', 'genres', 'posterPath', 'backdropPath']) = '{}'::jsonb
    and (not p ? 'title' or public.override_text_is_valid(p -> 'title', 200, true))
    and (not p ? 'tagline' or public.override_text_is_valid(p -> 'tagline', 300, false))
    and (not p ? 'overview' or public.override_text_is_valid(p -> 'overview', 4000, false))
    and (not p ? 'date' or public.override_date_is_valid(p -> 'date'))
    and (not p ? 'posterPath' or public.override_image_is_valid(p -> 'posterPath'))
    and (not p ? 'backdropPath' or public.override_image_is_valid(p -> 'backdropPath'))
    and (
      not p ? 'genres'
      or (
        jsonb_typeof(p -> 'genres') = 'array'
        and jsonb_array_length(p -> 'genres') <= 10
        and not exists (
          select 1
          from jsonb_array_elements(p -> 'genres') as genre
          where not public.override_text_is_valid(genre, 40, true)
        )
      )
    );
$$;

create or replace function public.episode_overrides_are_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (p - array['name', 'overview', 'airDate', 'stillPath']) = '{}'::jsonb
    and (not p ? 'name' or public.override_text_is_valid(p -> 'name', 200, true))
    and (not p ? 'overview' or public.override_text_is_valid(p -> 'overview', 4000, false))
    and (not p ? 'airDate' or public.override_date_is_valid(p -> 'airDate'))
    and (not p ? 'stillPath' or public.override_image_is_valid(p -> 'stillPath'));
$$;


-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.managed_titles (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null check (tmdb_id > 0),
  tmdb_title text not null check (char_length(tmdb_title) between 1 and 500),
  tmdb_year integer check (tmdb_year between 1800 and 3000),
  tmdb_poster_path text check (char_length(tmdb_poster_path) <= 200),
  overrides jsonb not null default '{}'::jsonb
    check (public.title_overrides_are_valid(overrides)),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint managed_titles_tmdb_key unique (media_type, tmdb_id),
  -- Lets seasons require a TV show through their foreign key.
  constraint managed_titles_id_media_type_key unique (id, media_type)
);

create table if not exists public.managed_seasons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null,
  media_type text not null default 'tv' check (media_type = 'tv'),
  season_number integer not null check (season_number >= 0),
  tmdb_name text check (char_length(tmdb_name) <= 500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint managed_seasons_title_fkey foreign key (title_id, media_type)
    references public.managed_titles (id, media_type) on delete cascade,
  constraint managed_seasons_number_key unique (title_id, season_number)
);

create table if not exists public.managed_episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.managed_seasons (id) on delete cascade,
  episode_number integer not null check (episode_number >= 0),
  tmdb_episode_id integer check (tmdb_episode_id > 0),
  tmdb_name text check (char_length(tmdb_name) <= 500),
  tmdb_air_date date,
  overrides jsonb not null default '{}'::jsonb
    check (public.episode_overrides_are_valid(overrides)),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint managed_episodes_number_key unique (season_id, episode_number)
);

create index if not exists managed_titles_list_idx
  on public.managed_titles (media_type, is_hidden, updated_at desc);

drop trigger if exists managed_titles_set_updated_at on public.managed_titles;
create trigger managed_titles_set_updated_at
  before update on public.managed_titles
  for each row execute function public.set_updated_at();

drop trigger if exists managed_seasons_set_updated_at on public.managed_seasons;
create trigger managed_seasons_set_updated_at
  before update on public.managed_seasons
  for each row execute function public.set_updated_at();

drop trigger if exists managed_episodes_set_updated_at on public.managed_episodes;
create trigger managed_episodes_set_updated_at
  before update on public.managed_episodes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Row Level Security: admins only
-- ---------------------------------------------------------------------

alter table public.managed_titles enable row level security;
alter table public.managed_seasons enable row level security;
alter table public.managed_episodes enable row level security;

drop policy if exists "Admins can view managed titles" on public.managed_titles;
create policy "Admins can view managed titles"
  on public.managed_titles for select to authenticated using (public.is_admin());
drop policy if exists "Admins can add managed titles" on public.managed_titles;
create policy "Admins can add managed titles"
  on public.managed_titles for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update managed titles" on public.managed_titles;
create policy "Admins can update managed titles"
  on public.managed_titles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can view managed seasons" on public.managed_seasons;
create policy "Admins can view managed seasons"
  on public.managed_seasons for select to authenticated using (public.is_admin());
drop policy if exists "Admins can add managed seasons" on public.managed_seasons;
create policy "Admins can add managed seasons"
  on public.managed_seasons for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update managed seasons" on public.managed_seasons;
create policy "Admins can update managed seasons"
  on public.managed_seasons for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can view managed episodes" on public.managed_episodes;
create policy "Admins can view managed episodes"
  on public.managed_episodes for select to authenticated using (public.is_admin());
drop policy if exists "Admins can add managed episodes" on public.managed_episodes;
create policy "Admins can add managed episodes"
  on public.managed_episodes for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update managed episodes" on public.managed_episodes;
create policy "Admins can update managed episodes"
  on public.managed_episodes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- TMDB identities and numbering can't be changed after import, and nothing
-- can be deleted.
revoke all on table public.managed_titles, public.managed_seasons, public.managed_episodes
  from public, anon, authenticated;
grant select, insert on table public.managed_titles, public.managed_seasons, public.managed_episodes
  to authenticated;
grant update (tmdb_title, tmdb_year, tmdb_poster_path, overrides, is_hidden)
  on table public.managed_titles to authenticated;
grant update (is_hidden) on table public.managed_seasons to authenticated;
grant update (overrides, is_hidden) on table public.managed_episodes to authenticated;


-- ---------------------------------------------------------------------
-- Admin writes (run as the caller, so the policies above apply too)
-- ---------------------------------------------------------------------

-- Adds a title, or updates one, without creating a duplicate. NULL leaves
-- overrides or is_hidden as they are. Returns true when the title is new.
create or replace function public.admin_save_title(
  p_media_type text,
  p_tmdb_id integer,
  p_tmdb_title text,
  p_tmdb_year integer,
  p_tmdb_poster_path text,
  p_overrides jsonb default null,
  p_is_hidden boolean default null
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_added boolean;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage content.' using errcode = '42501';
  end if;

  insert into public.managed_titles as t
    (media_type, tmdb_id, tmdb_title, tmdb_year, tmdb_poster_path, overrides, is_hidden)
  values (
    p_media_type,
    p_tmdb_id,
    p_tmdb_title,
    p_tmdb_year,
    p_tmdb_poster_path,
    coalesce(p_overrides, '{}'::jsonb),
    coalesce(p_is_hidden, false)
  )
  on conflict (media_type, tmdb_id) do update
    set tmdb_title = excluded.tmdb_title,
        tmdb_year = excluded.tmdb_year,
        tmdb_poster_path = excluded.tmdb_poster_path,
        overrides = coalesce(p_overrides, t.overrides),
        is_hidden = coalesce(p_is_hidden, t.is_hidden)
  returning (t.xmax = 0) into v_added;

  return v_added;
end;
$$;

-- Imports a TV show's seasons and episodes from TMDB in one transaction: all
-- of it is saved or none of it. Seasons and episodes already imported are
-- left exactly as they are (overrides and hidden flags included), so it's
-- safe to retry. p_seasons:
--   [{ "season_number": 1, "name": "Season 1",
--      "episodes": [{ "episode_number": 1, "tmdb_episode_id": 62085,
--                     "name": "Pilot", "air_date": "2008-01-20" }] }]
create or replace function public.admin_import_tv_content(
  p_tmdb_id integer,
  p_tmdb_title text,
  p_tmdb_year integer,
  p_tmdb_poster_path text,
  p_seasons jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_title_id uuid;
  v_title_added boolean;
  v_season jsonb;
  v_season_id uuid;
  v_season_number integer;
  v_count integer;
  v_seasons_added integer := 0;
  v_episodes_added integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage content.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_seasons) is distinct from 'array' then
    raise exception 'Seasons must be a list.' using errcode = '22023';
  end if;

  insert into public.managed_titles as t (media_type, tmdb_id, tmdb_title, tmdb_year, tmdb_poster_path)
  values ('tv', p_tmdb_id, p_tmdb_title, p_tmdb_year, p_tmdb_poster_path)
  on conflict (media_type, tmdb_id) do update
    set tmdb_title = excluded.tmdb_title,
        tmdb_year = excluded.tmdb_year,
        tmdb_poster_path = excluded.tmdb_poster_path
  returning t.id, (t.xmax = 0) into v_title_id, v_title_added;

  for v_season in select value from jsonb_array_elements(p_seasons) loop
    v_season_number := (v_season ->> 'season_number')::integer;

    insert into public.managed_seasons (title_id, season_number, tmdb_name)
    values (v_title_id, v_season_number, nullif(v_season ->> 'name', ''))
    on conflict (title_id, season_number) do nothing;
    get diagnostics v_count = row_count;
    v_seasons_added := v_seasons_added + v_count;

    select s.id into v_season_id
    from public.managed_seasons s
    where s.title_id = v_title_id and s.season_number = v_season_number;

    insert into public.managed_episodes
      (season_id, episode_number, tmdb_episode_id, tmdb_name, tmdb_air_date)
    select
      v_season_id,
      (episode ->> 'episode_number')::integer,
      (episode ->> 'tmdb_episode_id')::integer,
      nullif(episode ->> 'name', ''),
      nullif(episode ->> 'air_date', '')::date
    from jsonb_array_elements(coalesce(v_season -> 'episodes', '[]'::jsonb)) as episode
    on conflict (season_id, episode_number) do nothing;
    get diagnostics v_count = row_count;
    v_episodes_added := v_episodes_added + v_count;
  end loop;

  return jsonb_build_object(
    'title_added', v_title_added,
    'seasons_added', v_seasons_added,
    'episodes_added', v_episodes_added
  );
end;
$$;


-- ---------------------------------------------------------------------
-- Public reads: only what pages need to show available content
-- ---------------------------------------------------------------------

-- Hidden flags and overrides for a batch of titles (up to 500 of each type).
-- Only titles that are hidden or edited are returned, and a hidden title's
-- overrides are never sent.
create or replace function public.get_title_rules(p_movie_ids integer[], p_tv_ids integer[])
returns table (media_type text, tmdb_id integer, is_hidden boolean, overrides jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.media_type,
    t.tmdb_id,
    t.is_hidden,
    case when t.is_hidden then '{}'::jsonb else t.overrides end
  from public.managed_titles t
  where (t.is_hidden or t.overrides <> '{}'::jsonb)
    and (
      (t.media_type = 'movie' and t.tmdb_id = any ((coalesce(p_movie_ids, '{}'))[1:500]))
      or (t.media_type = 'tv' and t.tmdb_id = any ((coalesce(p_tv_ids, '{}'))[1:500]))
    );
$$;

-- A visible show's hidden seasons (episode_number is null) and its hidden or
-- edited episodes in visible seasons. Nothing for a hidden show.
create or replace function public.get_show_rules(p_tmdb_id integer)
returns table (season_number integer, episode_number integer, is_hidden boolean, overrides jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select s.season_number, null::integer, true, '{}'::jsonb
  from public.managed_titles t
  join public.managed_seasons s on s.title_id = t.id
  where t.media_type = 'tv' and t.tmdb_id = p_tmdb_id and not t.is_hidden and s.is_hidden
  union all
  select
    s.season_number,
    e.episode_number,
    e.is_hidden,
    case when e.is_hidden then '{}'::jsonb else e.overrides end
  from public.managed_titles t
  join public.managed_seasons s on s.title_id = t.id
  join public.managed_episodes e on e.season_id = s.id
  where t.media_type = 'tv'
    and t.tmdb_id = p_tmdb_id
    and not t.is_hidden
    and not s.is_hidden
    and (e.is_hidden or e.overrides <> '{}'::jsonb);
$$;


-- ---------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------

-- The *_is_valid helpers stay executable: CHECK constraints call them as the
-- user making the change, and they only inspect the value they're given.

revoke execute on function public.admin_save_title(text, integer, text, integer, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.admin_save_title(text, integer, text, integer, text, jsonb, boolean) to authenticated;
revoke execute on function public.admin_import_tv_content(integer, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_tv_content(integer, text, integer, text, jsonb) to authenticated;

revoke execute on function public.get_title_rules(integer[], integer[]) from public, anon, authenticated;
grant execute on function public.get_title_rules(integer[], integer[]) to anon, authenticated;
revoke execute on function public.get_show_rules(integer) from public, anon, authenticated;
grant execute on function public.get_show_rules(integer) to anon, authenticated;
