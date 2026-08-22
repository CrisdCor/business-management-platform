# Veloces — Gestión Administrativa

Plataforma web multiusuario para la gestión de procesos administrativos internos (requisiciones y compras, dotación, inventario de equipos). Este repositorio contiene el MVP: infraestructura base (autenticación, roles y permisos) + el primer módulo funcional, **Compras**.

## Stack

- **Next.js 16** (App Router, Server Components + Server Actions) y **TypeScript**.
- **Tailwind CSS v4** con un sistema de diseño propio inspirado en la estética de los paneles de Vercel (Geist).
- **Supabase**: Postgres + Auth + Row Level Security como backend.
- **Vercel** para el despliegue.
- `@react-pdf/renderer` para generar las Órdenes de Compra (OC) en PDF.

## Arquitectura (código orientado a objetos)

```
src/
  domain/            Entidades del dominio (clases): Usuario, Requisicion, Compra,
                      Presupuesto, PermisoMatriz, etc. Encapsulan las reglas de
                      negocio (p. ej. Presupuesto.nivelAlerta, Requisicion.plazoVencido).
  repositories/       Acceso a datos. BaseRepository<TDomain, TRow> genérico +
                      repositorios concretos que mapean filas de Supabase a entidades.
  services/           Orquestan repositorios + reglas de negocio para casos de uso
                      completos (AuthService, RequisicionService, CompraService, ...).
  components/ui/      Primitivas de UI reutilizables (Button, Badge, SlideOver, Table...).
  components/layout/  Shell de la aplicación (Sidebar, Topbar, navegación por permisos).
  app/                Rutas de Next.js (Server Components) + Server Actions en app/actions.
```

Patrón general: las páginas (Server Components) cargan datos a través de los *services*,
los convierten a un *view model* plano serializable y se lo pasan a un componente
cliente (`XxxView.tsx`) que maneja la interacción, los modales (`SlideOver`) y llama
Server Actions para mutar datos.

## Requisitos previos

- Node.js 20+
- Una cuenta de Supabase con el proyecto `business-management-platform` (org `CrisdCor-Tablero`)
- Vercel CLI opcional para despliegues manuales

## Configuración local

1. Copia `.env.example` a `.env.local` y completa los valores (URL y clave pública ya
   están pre-cargados; falta la `SUPABASE_SERVICE_ROLE_KEY`, que se obtiene desde
   **Supabase → Project Settings → API → service_role** — nunca la subas al repo).
2. Instala dependencias: `npm install`
3. Levanta el entorno de desarrollo: `npm run dev`

## Base de datos

El esquema completo (tablas, RLS, triggers) vive en `supabase/migrations/`. Ya fue
aplicado directamente al proyecto de Supabase durante la construcción de este MVP;
si necesitas reconstruirlo desde cero en otro proyecto, aplica las migraciones en orden
con el CLI de Supabase (`supabase db push`) o pégalas en el SQL Editor del dashboard.

Reglas de negocio garantizadas a nivel de base de datos (no solo en la UI):

- Una requisición creada por un Supervisor o el Superadministrador se **auto-aprueba**;
  cualquier otro rol queda `pendiente`.
- El folio de requisiciones (`REQ-AAAA-####`) y de órdenes de compra (`OC-AAAA-####`)
  se genera automáticamente.
- Si el monto de una compra supera el disponible del presupuesto, queda en
  `pendiente_aprobacion_exceso` hasta que el Superadministrador la apruebe.
- El consumo de presupuesto (`monto_consumido`) se actualiza automáticamente al
  registrar o aprobar una compra.
- Row Level Security en todas las tablas: la función `permiso(modulo, accion)`
  centraliza la verificación contra la matriz de permisos de cada usuario
  (el Superadministrador siempre tiene acceso total).

Para regenerar los tipos de TypeScript tras un cambio de esquema:
usa la herramienta `generate_typescript_types` del MCP de Supabase y reemplaza
`src/lib/supabase/database.types.ts`.

## Roles

| Rol | Alcance |
|---|---|
| Superadministrador | Control total: usuarios, permisos, catálogos, todos los módulos. |
| Supervisor | Consulta, revisión, aprobación y seguimiento. Sus propias requisiciones se auto-aprueban. |
| Usuario | Operación básica del/los módulo(s) asignados. |
| Consultor | Solo lectura (reportes e indicadores). |

Un usuario puede tener varios roles a la vez. El acceso fino por módulo (crear /
leer / actualizar / eliminar) se gestiona en **Administración → Usuarios**, en la
matriz de permisos de cada usuario.

## Módulo de Compras (MVP)

1. **Rubros** — catálogo de categorías de compra (bodega, oficina, caja menor...).
2. **Presupuestos** — asignación mensual por rubro + área.
3. **Requisiciones** — solicitud de compra; aprobación automática o manual según rol.
4. **Compras / OC** — registro de la compra, aprobación de excesos de presupuesto,
   seguimiento del envío/cierre y descarga de la Orden de Compra en PDF.
5. **Proveedores** — catálogo con datos de pago (NIT/cédula, banco, cuenta).

## Despliegue

El proyecto está conectado a Vercel (equipo *Cristian David Corrales Ospina's
projects*) para despliegue continuo desde la rama `main`. Variables de entorno
requeridas en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.
