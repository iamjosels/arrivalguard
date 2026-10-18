# Progreso

## Estado actual

- **Hora (Lima):** domingo 18 de octubre, 17:56.
- **Fase:** 0 Arranque (en curso). Inicio 17:46.
- **Subtarea en curso:** 0.8 commit, push a `dev` y preview en Vercel.
- **Siguiente paso exacto:** comprobar que el preview de `dev` quede en *Ready*; correr `pnpm verify`; merge fast-forward a `main`, push y `pnpm smoke --base-url https://arrivalguard.vercel.app`; cerrar la Fase 0 y empezar la Fase 1 (dominio).
- **Último `pnpm verify`:** todavía no corrido completo (typecheck, lint, test y build pasaron por separado a las 17:54).
- **URL de producción:** https://arrivalguard.vercel.app (sin desplegar todavía).
- **Bloqueos abiertos:** ninguno (ver docs/BLOQUEOS.md).
- **Gasto de IA estimado:** USD 0.006 (2 llamadas de verificación previa y 2 de `pnpm ai:check`).

## Fases y puertas

| Fase | Estado | Objetivo (AUTONOMIA 8) | Cierre real | `verify` | Verificación crítica |
|---|---|---|---|---|---|
| 0 Arranque | en curso | dom 18:00 | | | sin VC |
| 1 Dominio | pendiente | dom 20:00 | | | VC1, VC2, VC3 |
| 2 Persistencia y ejecución (G1) | pendiente | dom 23:00 | | | VC4, VC5 |
| 3 API, sesiones y acceso | pendiente | lun 00:30 | | | VC6 |
| 4 Interfaz | pendiente | lun 03:00 | | | VC7 |
| 5 Agente (G2) | pendiente | lun 05:00 | | | VC8 |
| 6 Capacidades P1 | pendiente | lun 09:30 | | | |
| 7 Seguridad completa (G3) | pendiente | lun 11:30 | | | VC9 |
| 8 Evaluación y documentos (G4) | pendiente | lun 14:00 | | | VC10 |
| 9 Cierre (G5) | pendiente | lun 16:00 | | | VC11 |

Puertas: G1 (Fase 2), G2 (Fase 5), G3 (Fase 7), G4 (Fase 8), G5 (Fase 9).

## Fase 0: Arranque

Subtareas:
- [x] 0.1 Dependencias con versiones exactas y lockfile (DEC-007). pnpm 12, `pnpm-workspace.yaml` con `allowBuilds`.
- [x] 0.2 TypeScript estricto (6.0.3), ESLint 9 con reglas de pureza del dominio, Vitest 5 (proyectos `unit` e `integration`).
- [x] 0.3 Tailwind 4 con los tokens de UI_UX 5 (claro, oscuro y preferencia del sistema), fuentes Overpass, Source Serif 4 y Overpass Mono con `next/font`, `components.json` de shadcn.
- [x] 0.4 Drizzle conectado a Neon `dev` (pool con `attachDatabasePool`, `sslmode=verify-full`), `db:migrate` y `drizzle.config.ts`.
- [x] 0.5 Llamada real a Claude con la configuración 13.1 y una herramienta (`pnpm ai:check`): `tool_use` y después `end_turn`.
- [x] 0.6 Scripts `verify`, `smoke`, `db:seed-check`, `ai:check`; `vercel.json` con `pnpm db:migrate && pnpm build`.
- [x] 0.7 `CLAUDE.md`, `PROGRESS.md`, `DECISIONS.md`, `BLOQUEOS.md`, `PARA_HUMANOS.md`, `.env.example`.
- [ ] 0.8 Commit, push a `dev`, preview en *Ready*.
- [ ] 0.9 `pnpm verify` completo, merge a `main`, despliegue de producción y `smoke`.

Evidencia hasta ahora:
- `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm test`: 2 archivos, 7 pruebas en verde (incluye `select 1` contra Neon `dev`).
- `pnpm ai:check` exit 0: `llamada 1: stop_reason=tool_use`, `llamada 2: stop_reason=end_turn` (docs/evidence/phase0-ai-check.json).
- `pnpm build` exit 0 (rutas `/`, `/_not-found`, `/api/health`).

## Deuda

Hallazgos medios y bajos de las revisiones y pendientes menores.

- Ninguno todavía.

## Recortes

Lo que se recorta según AUTONOMIA 8, con su motivo. Se declara como no implementado en los documentos.

- Ninguno todavía.
