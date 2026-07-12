-- ============================================
-- MIGRACIÓN 4: chequeo de documento/email duplicado
-- ANTES de intentar crear la cuenta (evita el error 500
-- genérico que tira Supabase cuando el trigger falla).
-- Pegar y correr en el SQL Editor de Supabase.
-- ============================================

create or replace function public.documento_existe(doc text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.clientes where documento = doc);
$$;

create or replace function public.email_existe(correo text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.clientes where email = correo);
$$;

revoke all on function public.documento_existe(text) from public;
revoke all on function public.email_existe(text) from public;
grant execute on function public.documento_existe(text) to anon, authenticated;
grant execute on function public.email_existe(text) to anon, authenticated;