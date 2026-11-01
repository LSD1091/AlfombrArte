-- AlfombrArte · Fase 1: recepción de solicitudes de encargo
-- El rol anónimo solo puede INSERTAR; nunca leer, modificar ni borrar.

-- Tipos -----------------------------------------------------------------
create type public.tipo_encargo   as enum ('catalogo', 'diseno_propio', 'idea_libre');
create type public.forma_alfombra as enum ('rectangular', 'redonda', 'irregular');
create type public.estado_solicitud as enum (
  'nueva', 'en_revision', 'presupuestada', 'aceptada', 'senal_pagada',
  'en_fabricacion', 'pendiente_pago_final', 'pagada', 'enviada', 'entregada', 'cancelada'
);

-- Tabla -----------------------------------------------------------------
create table public.solicitudes (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Datos del cliente (rellenables por anon)
  nombre             text not null check (char_length(nombre) between 2 and 120),
  email              text not null check (char_length(email) <= 254
                                          and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono           text check (char_length(telefono) <= 30),
  tipo               public.tipo_encargo not null,
  modelo_ref         text check (char_length(modelo_ref) <= 80),
  ancho_cm           int  not null check (ancho_cm between 30 and 600),
  largo_cm           int  not null check (largo_cm between 30 and 600),
  forma              public.forma_alfombra not null,
  colores            text check (char_length(colores) <= 500),
  estancia           text check (char_length(estancia) <= 200),
  descripcion        text check (char_length(descripcion) <= 3000),
  imagen_path        text check (imagen_path is null
                                 or (split_part(imagen_path, '/', 1) = id::text
                                     and char_length(imagen_path) <= 200)),
  acepta_privacidad  boolean not null check (acepta_privacidad),
  privacidad_version text not null check (char_length(privacidad_version) <= 20),

  -- Uso interno (fases 2 y 3): anon no tiene privilegio sobre estas columnas
  estado             public.estado_solicitud not null default 'nueva',
  presupuesto_cents  int check (presupuesto_cents >= 0),
  senal_cents        int check (senal_cents >= 0),
  stripe_payment_link        text,
  stripe_checkout_session_id text unique,
  senal_pagada_at    timestamptz,
  pago_final_at      timestamptz,
  notas_internas     text,

  constraint redonda_diametro check (forma <> 'redonda' or ancho_cm = largo_cm)
);

comment on table public.solicitudes is 'Solicitudes de encargo enviadas desde la web. Anon solo inserta.';

create index solicitudes_created_at_idx on public.solicitudes (created_at desc);
create index solicitudes_estado_idx     on public.solicitudes (estado);

-- updated_at automático (útil para el panel interno de fase 3)
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger solicitudes_updated_at
  before update on public.solicitudes
  for each row execute function public.tocar_updated_at();

-- Seguridad -------------------------------------------------------------
alter table public.solicitudes enable row level security;

revoke all on public.solicitudes from anon, authenticated;
grant insert (id, nombre, email, telefono, tipo, modelo_ref, ancho_cm, largo_cm,
              forma, colores, estancia, descripcion, imagen_path,
              acepta_privacidad, privacidad_version)
  on public.solicitudes to anon;

create policy anon_inserta_solicitud on public.solicitudes
  for insert to anon
  with check (true);
-- Sin políticas de select / update / delete: todo eso queda denegado.

-- Storage ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes-clientes', 'imagenes-clientes', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy anon_sube_imagen on storage.objects
  for insert to anon
  with check (
    bucket_id = 'imagenes-clientes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and array_length(storage.foldername(name), 1) = 1
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
-- Sin select / update / delete en este bucket: nadie anónimo puede leer, listar ni sobrescribir.
