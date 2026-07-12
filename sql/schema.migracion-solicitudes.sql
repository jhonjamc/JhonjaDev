-- ============================================
-- MIGRACIÓN 5: detalle en solicitudes_servicio
-- Pegar y correr en el SQL Editor de Supabase
-- ============================================

alter table public.solicitudes_servicio add column if not exists detalle text;