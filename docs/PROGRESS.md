# Progreso

## Estado actual

- **Hora (Lima):** domingo 18 de octubre, 22:58.
- **Fase:** 7 Seguridad completa (en curso desde las 22:36; VC9 corriendo) y 8 Evaluación y documentos adelantada en paralelo. Fases 4, 5 y 6 cerradas y en producción (`b3e351c`), con la puerta G2 cumplida.
- **Subtarea en curso:** 7.4 revisión VC9 (auditor en segundo plano); 8.1 primera corrida de `eval:agent` con el modelo real contra la rama dev; 8.4 documentos de entrega (agente en segundo plano).
- **Siguiente paso exacto:** revisar la corrida de `eval:agent`; corregir con regresión lo que reporte VC9; `pnpm verify`, merge a `main` y smoke (cierre de la Fase 7 y G3); después las corridas oficiales de la Fase 8 sobre el commit final y `results:report`.
- **Último `pnpm verify`:** 22:18 a 22:25, exit 0 (34 archivos y 509 pruebas, más `secrets-scan`).
- **URL de producción:** https://arrivalguard.vercel.app (commit b3e351c, smoke con T1 CREDITED y T1 por chat CREDITED a las 22:34).
- **Bloqueos abiertos:** ninguno.
- **Gasto de IA estimado:** USD 0.006.

## Fases y puertas

| Fase | Estado | Objetivo (AUTONOMIA 8) | Cierre real | `verify` | Verificación crítica |
|---|---|---|---|---|---|
| 0 Arranque | cerrada | dom 18:00 | dom 18:01 | 17:57 exit 0 | sin VC |
| 1 Dominio | cerrada | dom 20:00 | dom 18:38 | 18:37 exit 0 | VC1 y VC2 aprobados con observaciones; VC3 corregido (docs/reviews) |
| 2 Persistencia y ejecución (G1) | cerrada | dom 23:00 | dom 19:48 | 19:46 exit 0 | VC4 corregido (2 altos, 3 medios y 2 bajos, sin críticos); VC5 aprobado (docs/reviews) |
| 3 API, sesiones y acceso | cerrada | lun 00:30 | dom 20:38 | 20:37 exit 0 | VC6 sin críticos ni altos; 2 medios y 6 bajos corregidos (docs/reviews/VC6.md) |
| 4 Interfaz | cerrada | lun 03:00 | dom 21:49 (en `main` 22:33) | 21:48 exit 0 | VC7 corregido: 1 alto, 8 medios, 7 bajos, sin críticos (docs/reviews/VC7.md) |
| 5 Agente (G2) | cerrada, G2 cumplida | lun 05:00 | dom 22:34 | 22:25 exit 0 | VC8 aprobado con deuda: 3 medios y 6 bajos, sin críticos; medios y 5 bajos corregidos (docs/reviews/VC8.md) |
| 6 Capacidades P1 | cerrada | lun 09:30 | dom 22:34 | 22:25 exit 0 | sin VC |
| 7 Seguridad completa (G3) | en curso | lun 11:30 | | | VC9 |
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
- [x] 3.8 `smoke` con T1 en modo estructurado y CREDITED; `pnpm verify`, revisión VC6, merge a `main` y smoke en producción.

Revisión (19:56 a 20:15, subagente `auditor-seguridad`, docs/reviews/VC6.md): 39 ataques propios, 11 comprobaciones HTTP y 390 sesiones revisadas; sin críticos ni altos. Medios: el mensaje de revocación afirmaba un envío sin intento (VC6-1) y faltaban pruebas propias de los criterios de VC6 (VC6-2). Bajos: Origin confiaba en `X-Forwarded-Host`, cookie mal codificada daba 500, vencimiento de sesión mal informado, vista de aprobación abierta al estudiante, reinicio sin límite por IP y sin revocación de sesiones. Todo corregido con pruebas (`tests/security/sessionAuthority.test.ts`, 12 pruebas, y la de revocación en `t6Api`), más `x-ag-workspace` contra pestañas de otro espacio y `POST /api/session/logout`.

Evidencia de cierre (20:37): `pnpm verify` exit 0: `OK typecheck`, `OK lint`, `OK test` (22 archivos y 442 pruebas), `OK db:seed-check` (5 escenarios válidos) y `OK build`, `verify: TODO EN VERDE`.

Producción (20:39): merge fast-forward a `main` (`0eee748`), `main:production:READY`. `pnpm smoke --base-url https://arrivalguard.vercel.app`: `GET /api/health -> 200 status=ok database=ok commit=0eee748`, `GET / -> 200 simulation band=present`, acceso con el código de evaluación 201, plan con ruta B, solicitud, vista del pagador con huella, aprobación 201, `POST /api/payments` 201 PENDING_UNIVERSITY con débito USD 286000 (unidades menores), reloj +24 h, `reconcile -> 200 status=CREDITED`, `GET /api/case` con saldo 214000, `smoke: OK (T1 CREDITED)`.

Evidencia (19:50): pruebas de API y seguridad, 6 archivos y 23 pruebas en verde (acceso A4 con cookies y límites, CSRF, T1 por HTTP con O03, T4 y T5, N11, N12 en los dos órdenes, cambio preparado con confirmación fija, S03, S06, S07, S08, S09 y que ninguna ruta acepte "acreditado" o "aprobado" del navegador). `scripts/smoke.ts` ahora corre T1 por HTTP como el navegador (cookies, Origin, `x-ag-actor`, `Idempotency-Key`) y exige CREDITED. Contra `pnpm start` local: 9 pasos OK, `POST /api/payments/{id}/reconcile -> 200 status=CREDITED`, `GET /api/case -> 200 balance minor=214000`, `smoke: OK (T1 CREDITED)`.

## Fase 4: Interfaz

Inicio: domingo 18, 19:58 (en paralelo con la revisión VC6). Secciones: UI_UX_PROMPT completo (manda en lo visual), DESIGN_PLAN 2 a 6, BUILD_PROMPT 11 (contratos de la API).

Subtareas:
- [x] 4.1 Marca: ThresholdMark, Logo, ConsentSeal determinista (vector de prueba de DESIGN_PLAN 4.2), MiniSeal, SimulationBand, octágono; SVG en `public/brand`.
- [x] 4.2 Primitivas reestilizadas con los tokens (Button, Input, Field, Select, Switch, Tabs, Sheet, Panel, Skeleton, Toaster).
- [x] 4.3 Finanzas: MoneyFigure, StatusPill, reasonCopy (UI_UX 9.5), RouteBoard, JourneyLine, FundsBar, CashProjection, ConditionalIncomeCard, PermissionMeter, BlockedNotice, ApprovalRequestCard.
- [x] 4.4 Capa de datos del cliente (`x-ag-actor`, errores tipados, sondeo) y layout: TopBar con color de rol, RoleSwitcher accesible, VirtualClock, selector de tema sin parpadeo.
- [x] 4.5 Pantallas: landing con acceso del jurado, espacio de Sofía (zona A con modo estructurado, zona B con el estado del servidor), vista de Carlos (solicitudes, actividad, permisos con edición y revocación), documento de aprobación con sello, confirmación de cambios y consola del evaluador (escenario, reloj, fallas y bitácora).
- [x] 4.6 `/system` (P1) con tokens, tipografía, componentes y sellos.
- [x] 4.7 VC7: `pnpm ui:check` (Playwright) recorre T1 solo con clics hasta CREDITED; capturas a 1440 × 900 y 390 × 844 en claro y oscuro en `docs/design/screens/`; axe por pantalla en `docs/evidence/ui-axe.json`.
- [x] 4.8 `pnpm verify`, revisión VC7 con las capturas y correcciones. El merge a `main` va junto con la Fase 5 (ver Estado actual).

Revisión (20:59 a 21:19, subagente `revisor`, docs/reviews/VC7.md): rechazado por un alto, sin críticos. VC7-1 alto: tras una falla confirmada, el documento mostraba la aprobación consumida como vigente y no dejaba aprobar de nuevo. Ocho medios: clave de la interfaz sin la aprobación, avisos que contradecían al servidor, titular del tablero sin ruta, replan con la matrícula pagada, caja desactualizada, documento que no avisaba de un cambio, capturas incompletas del documento, faltantes P0 de la consola y promesas P1 en la landing. Siete bajos. Corregido todo lo que afecta corrección o el spec, con pruebas (integración de VC7-1 y del replan rechazado, unitaria del titular del tablero) y `ui:check` más estricto. Decisión DEC-016. Pendientes menores en la Deuda.

Evidencia de cierre (21:48): `pnpm verify` exit 0: `OK typecheck`, `OK lint`, `OK test` (31 archivos y 487 pruebas), `OK db:seed-check`, `OK build`, `verify: TODO EN VERDE` (el árbol incluye el agente de la Fase 5).

Evidencia (21:34): `pnpm ui:check` contra `pnpm build && pnpm start`: T1 solo con clics hasta CREDITED con "Check this payment" pulsado mientras espera la universidad; `axe: 34 capturas revisadas, 0 violaciones serias o críticas`; `scroll horizontal: ninguno`; `ui:check: OK`.

Evidencia (20:51): `pnpm ui:check --base-url http://localhost:3000` contra `pnpm build && pnpm start`: landing, acceso con el código (escenario base), Plan my payment (ruta B), Request approval, Carlos abre la solicitud y aprueba (aparece el sello), Sofía envía, el evaluador avanza 24 horas y Check this payment llega a CREDITED, todo con clics; `axe: 34 capturas revisadas, 0 violaciones serias o críticas`; `scroll horizontal: ninguno`; `ui:check: OK (T1 CREDITED solo con clics)`. Capturas en `docs/design/screens/` (landing, /system, estudiante vacío, esperando y acreditado, documento pendiente y aprobado, vista del pagador y consola), a 1440 × 900 y 390 × 844, en claro y oscuro (la consola solo en oscuro). Revisadas a ojo: se corrigieron el desborde horizontal de la consola en móvil, la bitácora sin día después de avanzar el reloj, textos duplicados en fondos y beca, la tarjeta invalidada con opacidad (no cumplía 4.5:1) y pestañas con `aria-controls` sin panel.

`pnpm verify` (20:51 a 20:57): exit 0, 25 archivos y 460 pruebas (incluye las unitarias de la interfaz: geometría del sello con el vector de DESIGN_PLAN 4.2, textos de razones de UI_UX 9.5, hora virtual y montos del pagador sin punto flotante).

Cambios de API para la interfaz (aditivos): `SessionDTO` agrega `virtualStart` y `people` (nombres sintéticos para el selector de rol); `PlanDTO` agrega `targetArrivalHours` y `comparedAt` (sacados de las cotizaciones evaluadas).

## Fase 5: Agente (puerta G2)

Inicio: domingo 18, 21:00 (en paralelo con la revisión VC7). Secciones: BUILD_PROMPT 13 (13.1 a 13.6), 14.1 (texto del modelo), 14.2 (S01, S02, S04, S05, S10 a S13 de nivel agente), A5.

Subtareas:
- [x] 5.1 Puertos del agente (modelo, herramientas, conversación, uso de IA) y `ChatTurnUseCase`: el actor sale de la sesión; `<case_state>` compacto, enmascarado y por rol; hasta 4 llamadas al modelo y 6 herramientas por turno; no se empieza otra llamada pasados 30 s (25 s por llamada, `maxDuration` de 60 s).
- [x] 5.2 Adaptador de Claude con la configuración 13.1 (thinking between_tools con effort low, system con cache_control, herramientas strict, tool_choice auto) y el system prompt literal de 13.4.
- [x] 5.3 Herramientas por rol (13.3) con Zod en el servidor; nunca hay herramientas para aprobar, confirmar, destinatarios, reloj, fallas ni acreditar; una herramienta ajena al rol da ROLE_NOT_ALLOWED y SECURITY_BLOCK (PRIVILEGE_ESCALATION). La clave del envío por el agente la deriva el servidor (`tuition:{planId}:v{version}:{approvalId}`).
- [x] 5.4 Historial A5 (pasados como texto plano, turno en curso literal) en `conversations` y `conversation_turns`; presupuesto con reserva previa en `ai_usage` (3.00 USD por espacio, 15.00 USD diarios), 10 turnos por minuto y 60 por día; salida segura (AI_UNAVAILABLE, tope, error de la API, rechazo) con AI_FALLBACK_ACTIVATED y modo estructurado.
- [x] 5.5 Señales de ataque en el mensaje (inducción, aprobación afirmada sin aprobación real, cambio de reglas, secretos, número completo) como SECURITY_BLOCK con su categoría oficial. El control real es estructural.
- [x] 5.6 Interfaz del chat: hilo, actividad del servidor, sugerencias, compositor, tarjetas desde el estado del servidor, texto del modelo como markdown mínimo sin HTML, modo estructurado ante una falla; `GET` y `POST /api/chat`; "AI usage" en la consola.
- [x] 5.7 `pnpm verify`, revisión VC8, correcciones, merge a `main`, smoke y T1 por chat en producción (G2).

Revisión (21:50 a 22:12, subagente `revisor`, docs/reviews/VC8.md): aprobado con deuda, sin críticos ni altos. VC8-1 medio: presupuesto superable con turnos simultáneos (corregido con reserva atómica bajo advisory locks). VC8-2 medio: el texto de turnos pasados viajaba sin escapar (corregido). VC8-3 medio: falsos positivos de las señales en preguntas normales (corregido). Bajos: timeout con costo 0, eventos antes del límite, pruebas débiles, `ai-turns` sin estado de T1 del servidor y plazo del turno (corregidos); mapeos dentro del caso de uso (Deuda). Pruebas nuevas en `chatTurn.test.ts` y `securitySignals.test.ts`.

Evidencia (21:20): `pnpm ai:turns` con el modelo real contra Neon `dev`: 20 turnos seguidos, 0 con error del modelo; T1 por chat hasta CREDITED (recibo AU-RC-BC49EF68) con la aprobación dada en la pantalla fija; ataques S01, S10, S13 y S05 con SECURITY_BLOCK; el pagador prepara un cambio de límite que queda pendiente de confirmación (`docs/evidence/agent-turns-2026-10-19T02-20-43-194Z.json`). Integración con modelo guionizado (`tests/integration/chatTurn.test.ts`, 8 pruebas): actor de la sesión, historial A5, escalada rechazada sin efectos, ids de otro espacio, reintento sin pago doble, topes 4 y 6, O06 con AI_UNAVAILABLE, presupuesto, error de la API y rechazo.

## Fase 6: Capacidades P1

Inicio: domingo 18, 21:52. Secciones: BUILD_PROMPT 7 (T3, T4, T7), 8.4 (aprobación puntual de remesas), 8.5, 11 (rutas de remesas, devoluciones y evidencia), 16.2 (N05, N13, N14, N17, N18), 16.6, enmiendas A1 y A2.

Subtareas:
- [x] 6.1 Remesas (T3, A1): preparar (rutas a la cuenta local verificada; dentro del tope del permiso queda lista, fuera escala al pagador; destinatario no abierto o no verificado bloquea), ejecutar con Idempotency-Key volviendo a autorizar bajo bloqueo (encadenar remesas no supera el tope), aprobación puntual del pagador con huella, entrega una sola vez a la cuenta local al cumplirse la llegada, reserva de llegada consumida primero y notificación al pagador.
- [x] 6.2 Devoluciones (T7, A2): reclamo por el exceso verificado contra el libro de la institución, destino fijo en la cuenta de origen, envío idempotente y seguimiento hasta REFUNDED (abono de la liquidación una sola vez) al avanzar la hora virtual.
- [x] 6.3 Rutas: `POST /api/remittances`, `/api/remittances/{id}/execute`, `/api/remittances/{id}/view` y `/approve` (solo payer), `POST /api/refund-claims` y `/api/refund-claims/{id}/submit`, `GET /api/evidence` (JSON y `?format=md`).
- [x] 6.4 Herramientas del agente: `prepare_remittance` (un `recipient_id` ajeno da RECIPIENT_NOT_VERIFIED y SECURITY_BLOCK), `execute_remittance`, `prepare_refund_claim` y `submit_refund_claim`, con claves derivadas por el servidor; remesas y devoluciones en `<case_state>`.
- [x] 6.5 Interfaz: transferencias y devolución en la zona B, "Send transfer" y "Submit refund request" en el modo estructurado, aprobación puntual de transferencias en la vista de Carlos, actividad del pagador, tarjetas en el chat y expediente de evidencia en una hoja lateral con descarga JSON y Markdown.
- [x] 6.6 `pnpm verify`, merge a `main` y smoke.

Cierre conjunto de las Fases 4, 5 y 6 (22:25 a 22:34): `pnpm verify` exit 0 (`OK typecheck`, `OK lint`, `OK test` con 34 archivos y 509 pruebas, `OK db:seed-check`, `OK build`, `OK secrets-scan`, `verify: TODO EN VERDE`). `pnpm ui:check` contra el build local: T1 con clics y una transferencia con clics, 38 capturas, 0 violaciones de axe, sin scroll horizontal y sin violaciones de CSP. Commit `b3e351c`, merge fast-forward a `main`, `main:production:READY`. `pnpm smoke --base-url https://arrivalguard.vercel.app` (22:33): `commit=b3e351c`, T1 por HTTP hasta `status=CREDITED` y saldo 214000, `smoke: OK (T1 CREDITED)`; la respuesta trae `Content-Security-Policy` con nonce.

**Puerta G2 (22:34):** `pnpm smoke:chat --base-url https://arrivalguard.vercel.app` con el modelo real en producción: el primer mensaje de Sofía planifica la ruta B y pide la aprobación (herramientas compare_routes, project_cash, plan_tuition_payment y request_payer_approval, 9.3 s); Carlos aprueba en su pantalla fija (201); "Send the payment now" ejecuta (execute_approved_payment, 5.2 s); el evaluador avanza 24 h; "Has the university received my payment?" responde con el recibo; `T1 (servidor): CREDITED AU-RC-8555B526`, `smoke:chat: OK (T1 CREDITED por chat)`. Evidencia: `docs/evidence/g2-chat-2026-10-19T03-34-06-061Z.json` (commit b3e351c).

Evidencia (22:00 a 22:15): integración `tests/integration/remittanceRefund.test.ts` (6 pruebas): N05 (R1 USD 288.00 sin aprobación nueva, reserva USD 1,512.00, entrega única de CNY 2,000.00), N17 (720 > 600 escala; solo el pagador aprueba con su huella; se ejecuta una vez), encadenar tres remesas listas (la tercera escala), N18 (RECIPIENT_ACCOUNT_NOT_OPEN sin intento), N13 (CNY 500.00, REFUNDED con USD 70.00, saldo USD 2,210.00) y N14 (sin exceso, sin reclamo). API `tests/api/p1Api.test.ts` (4 pruebas): T3 por HTTP con aprobación puntual, S15 por HTTP, S14 por HTTP con REFUNDED y el expediente sin secretos con claves recortadas. Agente `chatTurn.test.ts` (3 pruebas P1): remesa por chat sin envío doble, S15 por chat y reclamo por chat. `pnpm ui:check`: T1 con clics y una transferencia de CNY 2,000 con clics hasta "Accepted by provider"; `axe: 38 capturas, 0 violaciones serias o críticas`; sin scroll horizontal; consola sin violaciones de CSP.

Adelantado de la Fase 7: CSP con nonce (`src/proxy.ts`, DEC-017) y `scripts/secrets-scan.ts` (329 archivos y los valores reales del entorno, sin imprimirlos) como último paso de `pnpm verify`.

## Fase 7: Seguridad completa (puerta G3)

Inicio: domingo 18, 22:36. Secciones: BUILD_PROMPT 14.1 y 14.2 (S01 a S16), AUTONOMIA 6 (VC9).

Subtareas:
- [x] 7.1 S01 a S16 con su categoría oficial y efectos en la base, a nivel API (y herramienta del agente donde corresponde), en `tests/security` (`officialSuite.test.ts` con S01, S02, S04, S05 y S10 a S16; S03 y S06 a S09 en `apiSecurity.test.ts`), commit `31c3952`.
- [x] 7.2 Encabezados: CSP con nonce (DEC-017), `frame-ancestors 'none'`, nosniff, Referrer-Policy, X-Frame-Options y Permissions-Policy.
- [x] 7.3 `secrets-scan` en `pnpm verify`.
- [ ] 7.4 Revisión VC9 (`auditor-seguridad`): las cuatro categorías contra la API y el agente en local; cada falla, primero prueba de regresión y después corrección.
- [ ] 7.5 `pnpm verify`, merge a `main` y smoke.

## Deuda

Hallazgos medios y bajos de las revisiones y pendientes menores.

- VC6: el límite por IP depende del primer valor de `X-Forwarded-For` (en Vercel lo fija la plataforma); endurecer con `ipAddress()` de `@vercel/functions`.
- VC7: que el documento de aprobación entre completo en 1440 × 900; indicador de cambios en las pestañas móviles; columna de estado del tablero de la landing en móvil; nombres de escenario leídos de la configuración del servidor en la landing.
- VC8: mapeos dentro de `ChatTurnUseCase` (turno a DTO, historial, tool_result, costo) a llevar a Mapper y servicio; la clave del agente se deriva en la capa de interfaz.
- Fase 6: el medidor del permiso no muestra los días que quedan del período; el botón Evidence no aparece en móvil.
- VC7: "Run T1 to T8" en la consola llega con `tasks:run` (Fase 8); los enlaces a la guía de demo y al video, con DEMO_GUIDE (Fase 8) y el video de los humanos.

## Recortes

Lo que se recorta según AUTONOMIA 8, con su motivo. Se declara como no implementado en los documentos.

- Ninguno todavía.
