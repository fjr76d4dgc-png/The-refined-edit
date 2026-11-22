-- The Refined Edit — database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

create extension if not exists btree_gist;

-- Your working hours, set per date from the admin dashboard.
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_valid check (end_time > start_time)
);
create index if not exists availability_date_idx on availability (date);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  kind text not null default 'treatment' check (kind in ('treatment', 'patch_test')),
  services jsonb not null default '[]'::jsonb,       -- list of service ids
  service_summary text not null,                     -- e.g. "Korean Lash Lift with Tint + Brow Lamination"

  date date not null,
  start_time time not null,
  end_time time not null,
  slot tsrange generated always as (tsrange(date + start_time, date + end_time)) stored,

  client_name text not null,
  client_email text,
  client_phone text not null,
  allergies text,
  notes text,
  admin_note text,

  treatment_price integer not null default 0,        -- £, before evening surcharge
  evening_surcharge integer not null default 0,      -- £
  total_price integer not null default 0,            -- £
  deposit integer not null default 0,                -- £

  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired')),
  deposit_status text not null default 'unpaid'
    check (deposit_status in ('unpaid', 'paid', 'refunded', 'not_required')),

  stripe_session_id text unique,
  stripe_payment_intent text,
  paid_at timestamptz,
  refunded_at timestamptz,
  expires_at timestamptz,                            -- unpaid holds stop blocking after this
  source text not null default 'website',            -- 'website' or 'manual'

  -- Database-level guarantee that two live bookings can never overlap.
  constraint bookings_no_overlap exclude using gist (slot with &&)
    where (status in ('pending', 'confirmed'))
);
create index if not exists bookings_date_idx on bookings (date);
create index if not exists bookings_status_idx on bookings (status);

-- Lock both tables down: only the website's server (service role key) can read/write.
alter table availability enable row level security;
alter table bookings enable row level security;
