-- ============================================
-- MIGRACIÓN: login por número de documento
-- Pegar y correr en el SQL Editor de Supabase
-- (además de lo que ya tenías en schema.sql)
-- ============================================

-- 1) Nueva columna para el número de documento, única por cliente
alter table public.clientes
  add column if not exists documento text unique;

-- 2) Actualizamos el trigger para que guarde documento y celular
--    al momento del registro (vienen del signUp() en options.data)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.clientes (user_id, nombre, email, telefono, documento)
  values (
    new.id,
    new.raw_user_meta_data->>'nombre',
    new.email,
    new.raw_user_meta_data->>'telefono',
    new.raw_user_meta_data->>'documento'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3) Función que resuelve documento -> email.
--    Supabase Auth solo entiende email+password, así que el login con
--    documento primero busca acá el email real y con ESE llama al login.
--    Es security definer y solo devuelve el email (no expone la tabla
--    clientes completa a usuarios anónimos).
create or replace function public.email_por_documento(doc text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.clientes where documento = doc limit 1;
$$;

revoke all on function public.email_por_documento(text) from public;
grant execute on function public.email_por_documento(text) to anon, authenticated;