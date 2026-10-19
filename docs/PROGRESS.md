# Progreso

## Estado actual

- **Hora (Lima):** domingo 18 de octubre, 19:50.
- **Fase:** 3 API, sesiones y acceso (en curso desde las 19:08). Fase 2 cerrada a las 19:48 (`d7cc287` en producción). Fase 1 cerrada a las 18:38.
- **Subtarea en curso:** 3.8 revisión VC6 (subagente `auditor-seguridad`, en curso desde las 19:56) y, en paralelo, inicio de la Fase 4 (componentes de marca e interfaz).
- **Siguiente paso exacto:** corregir lo que encuentre VC6 con pruebas de regresión, `pnpm verify`, merge a `main` y `pnpm smoke` en producción hasta CREDITED.
- **Último `pnpm verify`:** 19:51 a 19:54, exit 0 (21 archivos y 429 pruebas: unitarias, integración, API y seguridad contra Neon dev).
- **URL de producción:** https://arrivalguard.vercel.app (commit d7cc287, smoke OK 19:47).
- **Bloqueos abiertos:** ninguno.
- **Gasto de IA estimado:** USD 0.006.

## Fases y puertas

| Fase | Estado | Objetivo (AUTONOMIA 8) | Cierre real | `verify` | Verificación crítica |
|---|---|---|---|---|---|
| 0 Arranque | cerrada | dom 18:00 | dom 18:01 | 17:57 exit 0 | sin VC |
| 1 Dominio | cerrada | dom 20:00 | dom 18:38 | 18:37 exit 0 | VC1 y VC2 aprobados con observaciones; VC3 corregido (docs/reviews) |
| 2 Persistencia y ejecución (G1) | cerrada | dom 23:00 | dom 19:48 | 19:46 exit 0 | VC4 corregido (2 altos, 3 medios y 2 bajos, sin críticos); VC5 aprobado (docs/reviews) |
| 3 API, sesiones y acceso | en curso | lun 00:30 | | | VC6 |
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
- [x] 2.1 Esquema Drizzle completo, migración generada y aplicada en Neon dev; VC5 (esquema vacío y existente).
- [x] 2.2 Puertos de repositorios y unidad de trabajo; repositorios Drizzle con bloqueo en orden cuenta, obligación (o remesa) y plan.
- [x] 2.3 Creación de espacios por escenario (actores, cuentas, reserva, política, destinatarios, obligación, beca, gastos, mandato e historial).
- [x] 2.4 Proveedor simulado (cotizaciones, recotización, envío idempotente, respuesta perdida, eventos) e institución simulada (acreditación, libro, devoluciones).
- [x] 2.5 Reloj virtual y fallas inyectables con evento FAULT_INJECTED.
- [x] 2.6 Casos de uso de T1: planificar, comparar, pedir aprobación, aprobar, ejecutar (transaccional e idempotente) y conciliar; estado con procedencia.
- [x] 2.7 Bitácora de eventos redactada y secuencia por espacio.
- [x] 2.8 Pruebas de integración N01 y O01 a O08 (O06 requiere el agente: se cubre en la Fase 5).
- [x] 2.9 `pnpm verify`, revisión VC4 y VC5, correcciones, merge a `main` y smoke.

Revisión (19:06 a 19:21, subagente `revisor`, docs/reviews/VC4.md y VC5.md): VC4 requería correcciones. VC4-1 alto: el simulador volvía a entregar a la universidad ante un reenvío con la misma clave, y el libro quedaba duplicado. VC4-2 alto: conciliar un intento en SUBMITTING lo reenviaba durante el envío original y lo dejaba UNKNOWN sin motivo. VC4-3 a VC4-5 medios: la red de seguridad del índice único no veía el código envuelto por Drizzle, la redacción alteraba ids y O03 a O05 no miraban el lado del proveedor. VC4-6 y VC4-7 bajos. Sin críticos, así que no corresponde segunda ronda. VC5 aprobado con una observación baja. Todo se corrigió con pruebas: simulador idempotente con índice único del libro (migración `0001`), permiso de envío de 30 s, solo un timeout lleva a UNKNOWN, `DuplicateRecordError`, redacción que conserva identificadores, PROVIDER_SUBMIT_SENT registrado después del envío y migración probada sobre un esquema sembrado en la versión anterior. Decisión DEC-015: lo que bloquea un intento nuevo es el estado de la obligación, no un intento CREDITED (S03).

Evidencia de cierre (19:46): `pnpm verify` exit 0: `OK typecheck`, `OK lint`, `OK test` (17 archivos y 411 pruebas), `OK db:seed-check` (5 escenarios válidos) y `OK build`, `verify: TODO EN VERDE`. Antes, solo la suite de integración: 9 archivos y 42 pruebas en verde (237 s). En la rama `dev` de Neon se borraron las 6 filas duplicadas del libro antes de migrar; `db:migrate` en `dev`: "OK, 2 migraciones registradas".

Producción (19:47): merge fast-forward de `dev` a `main` (`d7cc287`); el build de Vercel aplicó la migración `0001` en `production` y quedó `main:production:READY`. `pnpm smoke --base-url https://arrivalguard.vercel.app`: `GET /api/health -> 200 status=ok database=ok commit=d7cc287`, `GET / -> 200 simulation band=present`, `smoke: OK`. El smoke con T1 por HTTP llega con la Fase 3, que es la que agrega las rutas.

Evidencia (19:05): `pnpm verify` exit 0 con 16 archivos y 403 pruebas. Integración contra Neon dev: N01 (B, débito USD 2,860.00 una sola vez, CREDITED con recibo, saldo USD 2,140.00), idempotencia (misma clave devuelve el mismo intento; misma clave con otro contenido da IDEMPOTENCY_CONFLICT), O01, O02a (USD 2,865.00 y saldo USD 2,135.00), O02b (EXCEEDS_PAYER_MAX, plan READY_FOR_APPROVAL, aprobación INVALIDATED, ningún intento), O03 (UNKNOWN, ActiveAttemptExists ante otro pago y un solo débito tras conciliar), O04 (dos ejecuciones concurrentes reales: un solo intento y un solo débito; misma clave en paralelo: mismo intento), O05 (DUPLICATE_EVENT_IGNORED, saldo intacto), O07 (HOLD_RELEASED una vez, reintento con aprobación nueva), O08 (PENDING_UNIVERSITY hasta 24 h más 36 h, sin recibo inventado), N02, N10, D05 (versión 2 con D, aprobación anterior invalidada, saldo final USD 2,120.00), el intento persistido antes de enviar (proveedor espía) y VC5 (29 tablas y 3 índices parciales sobre un esquema vacío; la base existente se vuelve a migrar sin perder datos). Puerta G1: T1 de punta a punta en modo estructurado, con respuesta perdida y concurrencia, demostrada a nivel de caso de uso. O06 (IA no disponible) se cubre en la Fase 5.

Cambio de diseño por concurrencia: ninguna transacción consulta a los simuladores mientras retiene conexión y bloqueos (se consultan antes de abrirla). Las pruebas de integración corren en paralelo (cada una en su espacio): de 319 s a 71 s. Fijada la región `iad1` de Vercel, igual a la de Neon (`us-east-1`).

## Fase 3: API, sesiones y acceso

Inicio: domingo 18, 19:08. Secciones: BUILD_PROMPT 4.3, 9.3, 11, 13.6 (límites), 14.1 y 14.2 (S03, S06 a S09), A4.

Subtareas:
- [x] 3.1 Sesiones: token de 256 bits, hash HMAC-SHA256 con pepper, 14 días, revocación; cookies ag_student, ag_payer y ag_evaluator (HttpOnly, Secure, SameSite=Strict).
- [x] 3.2 Acceso del jurado: código de evaluación, espacio con los tres roles, límites 20 por hora por IP con hash y 200 por día.
- [x] 3.3 Envoltorio HTTP: actor de sesión con x-ag-actor, Origin, Content-Type, Zod, requestId y httpErrorMapper único.
- [x] 3.4 DTO y Mapper de salida (CaseViewDTO, PlanDTO, ApprovalViewDTO, AttemptDTO, CashProjectionDTO, eventos).
- [x] 3.5 T6: cambio de política del pagador, cambios preparados con confirmación fija, revocación (N11, N12 en los dos órdenes).
- [x] 3.6 Rutas de la sección 11 para T1, T2, T5, T6 y la consola del evaluador (22 rutas en el build). `/api/chat` llega en la Fase 5; remesas, devoluciones y evidencia, en la Fase 6.
- [x] 3.7 Pruebas de API: T1 completa por HTTP, S03, S06, S07, S08, S09, cookies, Origin y límites.
- [ ] 3.8 `smoke` con T1 en modo estructurado y CREDITED; `pnpm verify`, revisión VC6, merge a `main` y smoke en producción.

Evidencia (19:50): pruebas de API y seguridad, 6 archivos y 23 pruebas en verde (acceso A4 con cookies y límites, CSRF, T1 por HTTP con O03, T4 y T5, N11, N12 en los dos órdenes, cambio preparado con confirmación fija, S03, S06, S07, S08, S09 y que ninguna ruta acepte "acreditado" o "aprobado" del navegador). `scripts/smoke.ts` ahora corre T1 por HTTP como el navegador (cookies, Origin, `x-ag-actor`, `Idempotency-Key`) y exige CREDITED. Contra `pnpm start` local: 9 pasos OK, `POST /api/payments/{id}/reconcile -> 200 status=CREDITED`, `GET /api/case -> 200 balance minor=214000`, `smoke: OK (T1 CREDITED)`.

## Deuda

Hallazgos medios y bajos de las revisiones y pendientes menores.

- Ninguno todavía.

## Recortes

Lo que se recorta según AUTONOMIA 8, con su motivo. Se declara como no implementado en los documentos.

- Ninguno todavía.
