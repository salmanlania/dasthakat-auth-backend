-- Add customers columns if missing
alter table if exists public.customers
  add column if not exists email text,
  add column if not exists customer_name text,
  add column if not exists password_hash text,
  add column if not exists is_email_verified boolean default false,
  add column if not exists created_at timestamptz default now();

-- Create otps table
create table if not exists public.otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  purpose text not null,
  attempts int default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table if exists public.admin
  add column if not exists email text,
  add column if not exists admin_name text,
  add column if not exists password_hash text,
  add column if not exists is_email_verified boolean default false,
  add column if not exists created_at timestamptz default now();
