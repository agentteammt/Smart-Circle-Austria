-- ═══════════════════════════════════════════════════════════════════
-- Smart Circle Austria — Kontaktformular: Datenbank-Tabelle
-- Ausführen im Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.kontaktanfragen (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  company     text,
  role        text,
  email       text not null,
  message     text not null,
  user_agent  text
);

-- Row Level Security aktivieren.
-- Es wird BEWUSST keine Policy für anonyme Zugriffe angelegt:
-- Das Schreiben erfolgt ausschließlich serverseitig über die Edge Function
-- (mit service_role-Schlüssel, der RLS umgeht). Dadurch kann niemand über
-- den öffentlichen anon-Key direkt Daten lesen oder einfügen.
alter table public.kontaktanfragen enable row level security;

-- Praktischer Index für die Sortierung nach Eingang
create index if not exists kontaktanfragen_created_at_idx
  on public.kontaktanfragen (created_at desc);
