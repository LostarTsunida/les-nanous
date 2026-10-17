-- ============================================================
-- Les Nanous — base de données (à coller UNE SEULE FOIS dans Supabase > SQL Editor > Run)
-- ============================================================

-- Les tâches (modifiables ensuite directement dans l'appli)
create table if not exists public.tasks (
  id              bigint generated always as identity primary key,
  name            text    not null,
  emoji           text    not null default '✨',
  action          text    not null,               -- fin de « Les Nanous, il est temps de … ! »
  interval_months int     not null default 0,
  interval_days   int     not null default 0,
  position        int     not null default 0,
  archived        boolean not null default false,
  notified_due    date,                            -- dernière échéance déjà notifiée (évite les doublons)
  created_at      timestamptz not null default now()
);

-- Chaque fois que vous faites une tâche = une ligne (c'est votre historique)
create table if not exists public.completions (
  id         bigint generated always as identity primary key,
  task_id    bigint not null references public.tasks(id) on delete cascade,
  done_on    date   not null,
  created_at timestamptz not null default now()
);
create index if not exists completions_task_idx on public.completions(task_id, done_on desc);

-- Les iPhones qui reçoivent les notifications
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  label      text,
  created_at timestamptz not null default now()
);

-- Sécurité : seul votre compte connecté peut lire et écrire
alter table public.tasks              enable row level security;
alter table public.completions        enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "nanous_tasks" on public.tasks;
drop policy if exists "nanous_completions" on public.completions;
drop policy if exists "nanous_push" on public.push_subscriptions;
create policy "nanous_tasks"       on public.tasks              for all to authenticated using (true) with check (true);
create policy "nanous_completions" on public.completions        for all to authenticated using (true) with check (true);
create policy "nanous_push"        on public.push_subscriptions for all to authenticated using (true) with check (true);

-- Synchro en direct entre vos deux téléphones
do $$ begin
  begin alter publication supabase_realtime add table public.tasks;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.completions; exception when duplicate_object then null; end;
end $$;

-- Les tâches de départ (seulement si la table est vide)
insert into public.tasks (name, emoji, action, interval_months, interval_days, position)
select * from (values
  ('Interrupteurs & poignées', '💡', 'nettoyer les interrupteurs et les poignées', 2, 0, 1),
  ('VMC', '🌀', 'nettoyer les VMC', 4, 0, 2),
  ('Poussière', '🪶', 'faire la poussière', 1, 15, 3),
  ('Vitres', '🪟', 'nettoyer les vitres', 8, 0, 4),
  ('Toilettes', '🚽', 'nettoyer les toilettes', 0, 10, 5),
  ('Douche', '🚿', 'nettoyer la douche', 2, 0, 6),
  ('Changer les draps', '🛏️', 'changer les draps', 0, 21, 7),
  ('Lavabo', '🚰', 'nettoyer le lavabo', 1, 15, 8),
  ('Four', '🥧', 'nettoyer le four', 12, 0, 9),
  ('Frigo', '🧊', 'nettoyer le frigo', 7, 0, 10),
  ('Serpillière', '🧽', 'passer la serpillière', 0, 21, 11),
  ('Hotte', '💨', 'nettoyer la hotte', 12, 0, 12),
  ('Calcaire bouilloire / machine à café', '☕', 'détartrer la bouilloire et la machine à café', 3, 15, 13),
  ('Micro-ondes', '🍿', 'nettoyer le micro-ondes', 12, 0, 14),
  ('Litière en profondeur', '🐈', 'nettoyer la litière en profondeur', 1, 15, 15),
  ('Machine à laver', '🫧', 'nettoyer la machine à laver', 7, 0, 16),
  ('Miroirs', '🪞', 'nettoyer les miroirs', 2, 0, 17),
  ('Placards', '🗄️', 'nettoyer les placards', 12, 0, 18),
  ('Pressing (couettes, oreillers, rideaux)', '🧺', 'apporter les couettes, les oreillers et les rideaux au pressing', 12, 0, 19),
  ('Serviettes de bain', '🛁', 'changer les serviettes de bain', 0, 21, 20),
  ('Siphons & canalisations', '🔧', 'nettoyer les siphons et les canalisations', 5, 0, 21),
  ('Portes', '🚪', 'nettoyer les portes', 7, 0, 22)
) as v(name, emoji, action, interval_months, interval_days, position)
where not exists (select 1 from public.tasks);
