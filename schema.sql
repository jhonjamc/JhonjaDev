-- ============================================
-- ESQUEMA JHONJADEV — pegar completo en el SQL Editor de Supabase
-- ============================================

-- ---- TABLAS ----

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nombre text,
  email text,
  telefono text,
  created_at timestamptz default now()
);

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  plan text,
  estado text default 'pendiente', -- pendiente | en_curso | en_revision | entregado
  fecha_entrega date,
  progreso int default 0,
  created_at timestamptz default now()
);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  concepto text,
  monto numeric,
  tipo text default 'proyecto', -- proyecto | hosting | mensualidad
  estado text default 'pendiente', -- pendiente | pagado | vencido
  referencia_wompi text,
  fecha date default now(),
  created_at timestamptz default now()
);

create table public.solicitudes_servicio (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  servicio text,
  monto numeric,
  estado text default 'pendiente', -- pendiente | en_revision | aprobada | completada
  fecha date default now(),
  created_at timestamptz default now()
);

-- ---- TRIGGER: crea la fila en `clientes` automáticamente al registrarse ----

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.clientes (user_id, nombre, email)
  values (new.id, new.raw_user_meta_data->>'nombre', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---- ROW LEVEL SECURITY ----

alter table public.clientes enable row level security;
alter table public.proyectos enable row level security;
alter table public.pagos enable row level security;
alter table public.solicitudes_servicio enable row level security;

-- Clientes ven solo su propia fila
create policy "clientes ven su propia fila"
  on public.clientes for select
  using (auth.uid() = user_id);

-- Clientes ven solo sus proyectos
create policy "clientes ven sus proyectos"
  on public.proyectos for select
  using (cliente_id in (select id from public.clientes where user_id = auth.uid()));

-- Clientes ven solo sus pagos
create policy "clientes ven sus pagos"
  on public.pagos for select
  using (cliente_id in (select id from public.clientes where user_id = auth.uid()));

-- Clientes ven y crean sus propias solicitudes de servicio
create policy "clientes ven sus solicitudes"
  on public.solicitudes_servicio for select
  using (cliente_id in (select id from public.clientes where user_id = auth.uid()));

create policy "clientes crean solicitudes"
  on public.solicitudes_servicio for insert
  with check (cliente_id in (select id from public.clientes where user_id = auth.uid()));

-- ---- ADMIN: acceso total ----
-- ⚠️ Reemplazá 'TU_EMAIL_ADMIN' por el email con el que vas a loguearte vos como administrador
-- (tiene que ser exactamente el mismo que uses en Authentication → Users)

create policy "admin ve todo - clientes"
  on public.clientes for all
  using (auth.jwt() ->> 'email' = 'jhonjamoguea@icloud.com');

create policy "admin ve todo - proyectos"
  on public.proyectos for all
  using (auth.jwt() ->> 'email' = 'jhonjamoguea@icloud.com');

create policy "admin ve todo - pagos"
  on public.pagos for all
  using (auth.jwt() ->> 'email' = 'jhonjamoguea@icloud.com');

create policy "admin ve todo - solicitudes"
  on public.solicitudes_servicio for all
  using (auth.jwt() ->> 'email' = 'jhonjamoguea@icloud.com');