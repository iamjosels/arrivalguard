# Progreso

## Estado actual

- **Hora (Lima):** domingo 18 de octubre, 18:20.
- **Fase:** 2 Persistencia y ejecución (en curso). Inicio 18:20. Fase 1 terminada a las 18:18; su revisión VC1 a VC3 está en curso.
- **Subtarea en curso:** 2.1 esquema Drizzle y primera migración (VC5).
- **Siguiente paso exacto:** escribir src/infrastructure/db/schema.ts, generar la migración, aplicarla en Neon dev y probarla en un esquema vacío.
- **Último `pnpm verify`:** 18:37, exit 0 (380 pruebas; cierre de la Fase 1).
- **URL de producción:** https://arrivalguard.vercel.app (commit cf4e5a1). El cierre de la Fase 1 se lleva a `main` al terminar su revisión.
- **Bloqueos abiertos:** ninguno.
- **Gasto de IA estimado:** USD 0.006.

## Fases y puertas

| Fase | Estado | Objetivo (AUTONOMIA 8) | Cierre real | `verify` | Verificación crítica |
|---|---|---|---|---|---|
| 0 Arranque | cerrada | dom 18:00 | dom 18:01 | 17:57 exit 0 | sin VC |
| 1 Dominio | cerrada | dom 20:00 | dom 18:38 | 18:37 exit 0 | VC1 y VC2 aprobados con observaciones; VC3 corregido (docs/reviews) |
| 2 Persistencia y ejecución (G1) | en curso | dom 23:00 | | | VC4, VC5 |
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
- [x] 0.8 Commit `cf4e5a1`, push a `dev`. Vercel lo compiló en *Ready*, pero lo publicó como producción (ver nota).
- [x] 0.9 `pnpm verify` exit 0, merge fast-forward a `main`, despliegue de producción en *Ready* y `smoke` OK.

Evidencia de cierre (18:01):
- `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm test`: 2 archivos, 7 pruebas en verde (incluye `select 1` contra Neon `dev`).
- `pnpm ai:check` exit 0: `llamada 1: stop_reason=tool_use`, `llamada 2: stop_reason=end_turn` (docs/evidence/phase0-ai-check.json).
- `pnpm build` exit 0 (rutas `/`, `/_not-found`, `/api/health`).
- `pnpm verify` (17:57): `OK typecheck`, `OK lint`, `OK test`, `OK db:seed-check`, `OK build`, `verify: TODO EN VERDE`, exit 0.
- Despliegue de producción desde `main` (`cf4e5a1`): `main:production:READY`.
- `pnpm smoke --base-url https://arrivalguard.vercel.app` (18:00): `GET /api/health -> 200 status=ok database=ok commit=cf4e5a1`, `GET / -> 200 simulation band=present`, `smoke: OK`, exit 0. Encabezados `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy` presentes. El dominio de producción es público.

Nota de Vercel: el primer push a `dev` generó un despliegue con destino *production* aunque la rama de producción configurada es `main` (`link.productionBranch: "main"`). Hipótesis: Vercel publica en producción el primer despliegue de un proyecto que todavía no tiene ninguno. Ese build sirvió el mismo commit que después pasó `verify`, y `db:migrate` no tenía migraciones, así que no hubo efecto sobre la base. Producción quedó luego en el despliegue de `main`. Se comprueba en el próximo push a `dev`.

## Fase 1: Dominio

Inicio: domingo 18, 18:02. Secciones: BUILD_PROMPT 4.2, 6, 7, 8; enmiendas A1, A2, A3.

Subtareas (dinero, políticas y consentimiento: prueba primero):
- [x] 1.1 Money, Rate y cotización FX explícita, VirtualInstant y RealInstant, errores de dominio (VC1).
- [x] 1.2 ReasonCode, cotizaciones y PolicyEngine de matrícula con orden de selección (VC2).
- [x] 1.3 Invariantes de caja y proyección por moneda (T4, N07 y N08).
- [x] 1.4 Consentimiento: JSON canónico, huella, Approval, alcance A3 y cambios materiales (VC3).
- [x] 1.5 Mandato permanente con período móvil y política de remesas (A1, N05 y N17).
- [x] 1.6 Máquinas de estado: PaymentPlan, PaymentAttempt (matrícula y remesa) y RefundClaim; estado visible.
- [x] 1.7 Cuenta: retenciones que se capturan o liberan una sola vez y reserva consumida primero.
- [x] 1.8 Devoluciones: exceso verificado y destino fijo (A2).
- [x] 1.9 Escenarios como configuración tipada (sección 6) y `db:seed-check` real.
- [x] 1.10 Prueba de arquitectura (VC1).
- [x] 1.11 `pnpm verify`, revisión VC1 a VC3, correcciones, merge a `main` y `smoke`.

Revisión (18:35, subagente `revisor`, docs/reviews/VC1.md, VC2.md y VC3.md): VC1 y VC2 aprobados con observaciones (solo hallazgos bajos). VC3 requería correcciones: VC3-1 alto (`Approval.grant` no amarraba sujeto, versión, vigencia, máximo y reserva al payload firmado) y VC3-2 a VC3-5 medios. Sin críticos, así que no corresponde segunda ronda. Se corrigieron el alto, los medios y los bajos, con 21 pruebas nuevas.

Evidencia de cierre (18:37): `pnpm verify` exit 0: typecheck, lint, 12 archivos y 380 pruebas, `db:seed-check` con 5 escenarios válidos y build (`verify: TODO EN VERDE`).

Evidencia (18:17): `pnpm verify` exit 0: typecheck, lint, 12 archivos y 359 pruebas, `db:seed-check` (base: 48 h B USD 2860.00 y 6 h D USD 2880.00; deadline_impossible sin ruta; arrival_remittance R1 USD 288.00) y build. Prueba de arquitectura verificada con una mutación temporal (detectó `pg`, `parseFloat` y `Number(`). Commits f057545, 2636caa y e033135. Comprobado: el push a `dev` crea un Preview (`dev:preview:READY`).

## Fase 2: Persistencia y ejecución (puerta G1)

Inicio: domingo 18, 18:20. Secciones: BUILD_PROMPT 8.3 a 8.6, 10, 11 (idempotencia), 12, 16.2 (N01), 16.3 (O01 a O08).

Subtareas:
- [ ] 2.1 Esquema Drizzle completo, migración generada y aplicada en Neon dev; VC5 (esquema vacío y existente).
- [ ] 2.2 Puertos de repositorios y unidad de trabajo; repositorios Drizzle con bloqueo en orden cuenta, obligación (o remesa) y plan.
- [ ] 2.3 Creación de espacios por escenario (actores, cuentas, reserva, política, destinatarios, obligación, beca, gastos, mandato e historial).
- [ ] 2.4 Proveedor simulado (cotizaciones, recotización, envío idempotente, respuesta perdida, eventos) e institución simulada (acreditación, libro, devoluciones).
- [ ] 2.5 Reloj virtual y fallas inyectables con evento FAULT_INJECTED.
- [ ] 2.6 Casos de uso de T1: planificar, comparar, pedir aprobación, aprobar, ejecutar (transaccional e idempotente) y conciliar; estado con procedencia.
- [ ] 2.7 Bitácora de eventos redactada y secuencia por espacio.
- [ ] 2.8 Pruebas de integración N01 y O01 a O08 (O06 requiere el agente: se cubre en la Fase 5).
- [ ] 2.9 `pnpm verify`, revisión VC4 (y VC5), merge a `main`, smoke.

## Deuda

Hallazgos medios y bajos de las revisiones y pendientes menores.

- Ninguno todavía.

## Recortes

Lo que se recorta según AUTONOMIA 8, con su motivo. Se declara como no implementado en los documentos.

- Ninguno todavía.
