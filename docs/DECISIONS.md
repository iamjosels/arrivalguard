# Decisiones

Registro de decisiones que no están en `docs/BUILD_PROMPT.md` ni en `docs/UI_UX_PROMPT.md`, o que los ajustan a la realidad del entorno. Cada entrada tiene fecha y hora de Lima, la decisión, el motivo y la fuente. Las entradas no se borran: si una decisión cambia, se agrega otra que la reemplaza.

---

## DEC-001. La rama de producción de Neon se llama `production`

- **Fecha:** domingo 18 de octubre, 17:42 (Lima). **Fuente:** indicación de los humanos.
- **Decisión:** la rama de Neon que los documentos llaman `main` (producción) se llama **`production`** en el proyecto real. La rama de desarrollo se llama `dev`, como en los documentos.
- **Cómo se aplica:**
  - Toda mención a "la rama `main` de Neon" en BUILD_PROMPT, AUTONOMIA y ARRANQUE se refiere a `production`. Eso incluye la prohibición de AUTONOMIA 7: no se borra la rama `production` de Neon.
  - Vercel **Production** usa las cadenas de Neon `production`. Vercel **Preview** y `.env.local` usan las de Neon `dev`.
  - Las ramas de **git** no cambian: `main` es producción (despliega en Vercel) y `dev` es la de trabajo.
  - El build de producción (`pnpm db:migrate && pnpm build`, AUTONOMIA 4) migra la rama `production` de Neon con la `DATABASE_URL_UNPOOLED` que los humanos cargaron en Vercel. En local nunca se usan credenciales de `production`.
  - Los documentos entregables (README y TECHNICAL) nombran la rama como `production`.

## DEC-002. `APP_BASE_URL` por entorno

- **Fecha:** domingo 18 de octubre, 17:42 (Lima). **Fuente:** indicación de los humanos y `vercel env ls` (solo nombres).
- **Decisión:**
  - Producción: `APP_BASE_URL=https://arrivalguard.vercel.app`, el dominio de producción que asignó Vercel al proyecto `arrivalguard`.
  - Local: `APP_BASE_URL=http://localhost:3000`.
  - Preview: no tiene `APP_BASE_URL` en Vercel, y está bien así, porque la URL de cada preview cambia. La configuración del servidor la deriva de las variables de sistema de Vercel (`VERCEL_BRANCH_URL` o `VERCEL_URL`, con `https://`). Ninguna parte del build exige `APP_BASE_URL` en Preview.
- **Uso:** origen esperado para la verificación de `Origin` (BUILD_PROMPT 11 y 14.1) y enlaces absolutos. `smoke` corre contra `https://arrivalguard.vercel.app`, nunca contra un preview (AUTONOMIA 4).

## DEC-003. pnpm 12.14.0 instalado de forma global

- **Fecha:** domingo 18 de octubre, 16:37 (Lima). **Fuente:** verificación previa (`npm view pnpm dist-tags`).
- **Decisión:** pnpm no estaba instalado. Se instaló la última estable, 12.14.0, con `npm install -g pnpm@12.14.0` en el prefijo de usuario (`%APPDATA%\npm`). En la Fase 0 se fija en `package.json` con `"packageManager": "pnpm@12.14.0"` para que Vercel use la misma versión.

## DEC-004. Efectos de `vercel link` revertidos en `.gitignore`

- **Fecha:** domingo 18 de octubre, 17:14 (Lima). **Fuente:** `git diff .gitignore` después de `vercel link`.
- **Decisión:** `vercel link` agregó `.vercel` y `.env*` al final de `.gitignore`. Se revirtió porque `.env*`, por ir al final, volvía a ignorar `.env.example`, que la sección 17 exige versionar. Las líneas que ya existían (`.vercel/` y `.env*.local`) cubren lo que Vercel quería proteger. Si alguien vuelve a correr `vercel link`, hay que revisar `.gitignore` antes del commit.

## DEC-005. Configuración 13.1 del modelo validada con una llamada mínima

- **Fecha:** domingo 18 de octubre, 17:40 (Lima). **Fuente:** referencia de la API de Claude (caché del 6 de octubre de 2026) y llamada real con el script de verificación previa.
- **Decisión:** se mantiene la configuración de BUILD_PROMPT 13.1 para `claude-sonnet-5-5`: `thinking: { type: "between_tools" }` sin otros campos, `output_config: { effort: "low" }` (con `between_tools` solo se admiten `low`, `medium` o `high`, y el effort no cambia a mitad de conversación) y `tool_choice: { type: "auto" }` (`any` y `tool` devuelven 400). Una llamada mínima con esa configuración y una herramienta `strict: true` respondió `stop_reason end_turn` (381 tokens de entrada, 4 de salida). Falta la prueba completa con `tool_use` real, que hace la Fase 0.
- **Precios de referencia** (misma caché, a confirmar en la página oficial durante la Fase 0): USD 2.00 por millón de tokens de entrada, USD 10.00 de salida y USD 0.20 de lectura de caché. La escritura de caché se fija en la Fase 0 con la página de precios.

## DEC-006. `sslmode=require` en las cadenas de Neon

- **Fecha:** domingo 18 de octubre, 17:40 (Lima). **Fuente:** aviso de `pg` 8.23 durante la verificación previa.
- **Decisión:** se usan las cadenas tal como las entrega Neon (`sslmode=require`). `pg` 8.x trata hoy `require` como `verify-full`, que es lo más estricto, y avisa que en `pg` 9 pasará a la semántica de libpq, que es más débil. En la Fase 0 se fija `pg` 8.x en el lockfile. Si se migra a `pg` 9, se cambia a `sslmode=verify-full` para no perder la verificación del certificado.

## DEC-007. Versiones de la base técnica (Fase 0)

- **Fecha:** domingo 18 de octubre, 17:50 (Lima). **Fuente:** `npm view` y dependencias pares de cada paquete.
- **Decisión:** versiones exactas en `package.json` y en el lockfile. Next.js 16.4.2 (App Router, Turbopack), React 19.3.1, Tailwind CSS 4.3.3, Drizzle ORM 0.45.4 con drizzle-kit 0.31.11, `pg` 8.23.1, Zod 4.6.7, `@anthropic-ai/sdk` 0.135.0, Vitest 5.0.5 con Vite 8.3.4 y tsx 4.23.15.
- **TypeScript 6.0.3, no 7.0.2:** typescript-eslint 8.71.2 exige `typescript <6.1.0`, y la 7 es el compilador nativo nuevo, que todavía no admite. En TS 6 `types` vale `[]` por defecto, así que `tsconfig.json` declara `"types": ["node"]`.
- **ESLint 9.39.5, no 10:** eslint-config-next admite ESLint 9 y 10, pero la 9 es la que comparte todo el ecosistema de complementos.
- **pnpm 12 y cadena de suministro:** pnpm 12 aplica una antigüedad mínima de publicación y bloquea scripts de instalación. Se eligieron `postcss@8.5.30` y `shadcn@4.21.5` (de hace 6 y 4 días) en lugar de las publicadas hoy, para no agregar excepciones. `pnpm-workspace.yaml` permite solo los scripts de `esbuild` y `unrs-resolver` (binarios nativos).
- **Instalación en Vercel:** `vercel.json` fija `installCommand` en `npm install -g pnpm@12.14.0 && pnpm install --frozen-lockfile`, para que Vercel use la misma versión de pnpm que el lockfile. No depende de variables de entorno nuevas.

## DEC-008. Precios oficiales de Claude Sonnet 5.5 (reemplaza la nota de precios de DEC-005)

- **Fecha:** domingo 18 de octubre, 17:54 (Lima). **Fuente:** https://platform.claude.com/docs/en/about-claude/pricing, leída hoy.
- **Valores por defecto** en `src/infrastructure/config/env.ts` (una variable de entorno los reemplaza): entrada USD 2.00, salida USD 10.00, lectura de caché USD 0.10 (0.05 veces la entrada para Sonnet 5.5) y escritura de caché a 5 minutos USD 2.50, todo por millón de tokens. La caché de 1 hora (USD 4.00) no se usa.
- La referencia en caché de DEC-005 decía USD 0.20 para la lectura de caché. Se corrigió con la página oficial.

## DEC-009. `sslmode` normalizado a `verify-full` en el código (ajusta DEC-006)

- **Fecha:** domingo 18 de octubre, 17:52 (Lima).
- **Decisión:** en lugar de fijar `pg` 8 y convivir con el aviso, `normalizeSslMode()` (`src/infrastructure/db/connection.ts`) reescribe `sslmode=require|prefer|verify-ca` como `verify-full` al crear el pool, el cliente de migraciones y la configuración de drizzle-kit. Es el comportamiento actual de `pg` 8, se mantiene con `pg` 9 y no requiere cambiar las cadenas cargadas por los humanos. Tiene pruebas unitarias.

## DEC-010. Alcance de `smoke` en la Fase 0

- **Fecha:** domingo 18 de octubre, 17:55 (Lima). **Fuente:** BUILD_PROMPT 17 y AUTONOMIA 4.
- **Decisión:** en la Fase 0 todavía no existen T1 ni el modo estructurado. `pnpm smoke --base-url <url>` comprueba `GET /api/health` (servicio y base de datos en `ok`) y que la página principal muestre la banda de simulación. Cuando exista T1 en modo estructurado (Fases 2 y 3), `smoke` crea un espacio de evaluación, corre T1 y exige `CREDITED`. El cierre final (objetivo, punto 3) usa esa versión completa.

## DEC-011. Prueba real de Claude de la Fase 0

- **Fecha:** domingo 18 de octubre, 17:53 (Lima). **Fuente:** `pnpm ai:check` y `docs/evidence/phase0-ai-check.json`.
- **Resultado:** con la configuración 13.1 y una herramienta `strict`, la primera llamada devolvió `tool_use` (`get_case_overview`). La segunda, con el contenido del asistente reenviado literal y el `tool_result`, devolvió `end_turn`. Uso: 487 + 591 tokens de entrada y 38 + 160 de salida.
- **Observación para la Fase 5:** el modelo citó "2,000,000 minor units" porque el resultado de la herramienta traía `minor`. Las herramientas del agente devuelven montos como decimales con código de moneda (`CNY 20,000.00`), nunca unidades menores.

## DEC-012. Decisiones de dominio de la Fase 1

- **Fecha:** domingo 18 de octubre, 18:25 (Lima). **Fuente:** BUILD_PROMPT 6, 8 y enmiendas A1 a A3. Cada punto tiene pruebas en `tests/unit/domain`.
- **Canales aceptados:** la universidad acepta los cinco canales de matrícula siempre que el dinero llegue a su cuenta registrada. Así la ruta E se descarta solo por `RECEIVER_NOT_ALLOWED`, como dice la tabla 6.2. `CHANNEL_NOT_ALLOWED` existe y está probado con una lista de canales más corta.
- **Reserva frente a fondos:** `INSUFFICIENT_FUNDS` cuando el débito supera lo que puede salir de la cuenta (saldo menos retenciones activas). `BREAKS_RESERVE` cuando el débito tocaría dinero apartado (`availableForTuition`) o dejaría el saldo bajo la reserva mínima del pagador.
- **Máximo efectivo:** al ejecutar o recotizar se usa el menor entre el máximo aprobado y el vigente del pagador, y la mayor de las dos reservas. Un pagador que baja su máximo después de aprobar siempre gana.
- **Llegada:** se calcula desde la hora virtual actual más el plazo de la ruta. El objetivo de la estudiante no puede ser posterior al vencimiento (`TARGET_LATER_THAN_DUE_DATE`).
- **Recotización (A3):** B se recotiza a USD 2,865.00 por defecto y a USD 2,905.00 con `REQUOTE_ABOVE_MAX` (spec). Para las otras rutas el spec no fija valor; se usa el débito original más USD 5.00 (A 2,825.00, C 2,845.00, D 2,885.00, E 2,835.00).
- **Versiones del plan:** un plan tiene un id fijo y versiones numeradas; cada versión es una fila. Las aprobaciones se ligan a (id, versión, huella). Re-planificar sin cambio material (por ejemplo, otro objetivo que mantiene la misma ruta) conserva la versión. Con cambio material se crea una versión nueva y la aprobación anterior queda `INVALIDATED` con los campos que cambiaron.
- **Vigencia en la huella:** `approvalExpiresAt` se fija al pedir la aprobación: mínimo entre la hora virtual de la solicitud más 24 h y el vencimiento de la obligación. Así la huella que ve el pagador es la misma que verifica el servidor.
- **Mandato:** sin mandato vigente (revocado, vencido o para otro destinatario) no hay ejecución autónoma; la remesa pide una aprobación puntual del pagador con la razón (`MANDATE_REVOKED`, `MANDATE_EXPIRED` o `MANDATE_MISSING`). Período móvil: ventana (ahora menos N días, ahora].
- **Destinatario de remesas:** una cuenta que todavía no abre no se puede verificar, así que solo se informa `RECIPIENT_ACCOUNT_NOT_OPEN` (N18). Una cuenta abierta sin verificar da `RECIPIENT_NOT_VERIFIED` (S15).
- **Canales de remesa:** el spec no los nombra; se usan `LOCAL_TRANSFER_STANDARD` (R1), `LOCAL_TRANSFER_INSTANT` (R2) y `FX_BROKER_FAST` (R3).
- **Hora virtual inicial:** `2026-10-20T09:00:00Z`, que se muestra como "Tue 20 Oct, 09:00 virtual time". La hora virtual se muestra en UTC con el rótulo *virtual time*.
- **Escenario `overpayment_refund`:** el spec no fija el saldo; se usa USD 2,140.00 (como si la matrícula ya se hubiera pagado). La devolución de USD 70.00 se abona a la cuenta de origen.
- **Formato:** `formatMoney` vive en `src/interfaces/format/money.ts`, porque lo usan la interfaz y los resultados de herramientas del agente. Nunca usa punto flotante (UI_UX 6.3).

## DEC-013. La devolución en USD es una liquidación informada por la institución, no una conversión

- **Fecha:** domingo 18 de octubre, 18:52 (Lima). **Fuente:** revisión VC1 (hallazgo VC1-1) y BUILD_PROMPT 4.2 y 6.3.
- **Decisión:** el reclamo se hace en la moneda de la obligación (CNY 500.00 de exceso verificado). La institución simulada informa el monto que liquida en la cuenta de origen: USD 70.00, tomado de la configuración del escenario (`refund.settlementUsd`). El sistema no convierte CNY a USD en ningún punto de esta operación: guarda el monto informado (`settlement`) junto al reclamo.
- **Cómo se muestra:** la interfaz y la evidencia dicen "Refunded USD 70.00, settled by the university to the paying account" y nunca presentan la cifra como resultado de una conversión ni muestran una tasa implícita. Toda conversión real del sistema sigue pasando por `convertWithQuote` con una cotización explícita.

## DEC-014. Latencia de red en pruebas de integración y región de las funciones

- **Fecha:** domingo 18 de octubre, 19:20 (Lima). **Fuente:** medición local (`select 1` y cada caso de uso de T1 contra Neon `dev`).
- **Medición:** desde Lima cada viaje de ida y vuelta a Neon (región `us-east-1`) tarda unos 100 ms. Un flujo T1 completo (crear espacio, planificar, pedir aprobación, ver, aprobar, ejecutar, consultar y avanzar el reloj) tarda unos 23 s; ejecutar un pago, unos 7 s (unos 70 viajes).
- **Decisión:** el proyecto `integration` de Vitest usa 120 s por prueba. No tapa carreras: las pruebas de concurrencia (O04) corren de verdad en paralelo contra la base y verifican un solo efecto. Producción corre en `iad1` (fijado en `vercel.json`), la misma región que Neon, así que allí cada viaje tarda pocos milisegundos.

## DEC-015. Un intento acreditado no bloquea por sí solo: decide el estado de la obligación

- **Fecha:** domingo 18 de octubre, 19:41 (Lima), durante las correcciones de VC4. **Fuente:** BUILD_PROMPT 10 ("una obligación CREDITED no admite intentos nuevos, verifícalo además en el dominio") y 14.2 (S03).
- **Antes:** `newAttemptBlockers` devolvía `OBLIGATION_NOT_PENDING` si existía cualquier intento CREDITED. Era una interpretación más amplia que el spec, que habla del estado de la OBLIGACIÓN.
- **Ahora:** la obligación acreditada se bloquea por su estado (`checkTuitionExecution` devuelve `OBLIGATION_NOT_PENDING`, con prueba unitaria y una de integración tras N01). Un pago parcial ya acreditado con la obligación todavía pendiente no bloquea: su débito cuenta para el máximo acumulado, que es lo que pide S03 ("USD 1,500.00 ya debitados y un nuevo cargo de 1,500.00 con máximo de 2,900.00": `EXCEEDS_PAYER_MAX`).
- **Prueba cambiada:** el caso unitario que exigía `OBLIGATION_NOT_PENDING` para `newAttemptBlockers(["CREDITED"])` se reemplazó por uno que fija la regla nueva. No se relajó ningún control: los dos bloqueos (estado de la obligación y máximo acumulado) siguen probados.

## DEC-016. Una matrícula acreditada no se vuelve a planificar

- **Fecha:** domingo 18 de octubre, 21:30 (Lima), durante las correcciones de VC7. **Fuente:** BUILD_PROMPT 10 ("una obligación CREDITED no admite intentos nuevos") y la revisión VC7.
- **Antes:** planificar con la obligación acreditada creaba un plan nuevo `NOT_VIABLE` (`OBLIGATION_NOT_PENDING`) que reemplazaba en la vista al plan que la pagó: la línea del pago pasaba a "bloqueada" y el sello desaparecía.
- **Ahora:** `PlanTuitionPaymentUseCase` rechaza con `OBLIGATION_NOT_PENDING` y no crea nada; la interfaz deshabilita "Plan my payment" con la matrícula pagada.
- **Prueba cambiada:** la de idempotencia usaba ese plan nuevo para demostrar "misma clave con otro contenido da 409". Ahora exige el rechazo del replan y demuestra el 409 con un segundo plan sintético preparado por la prueba (como S03 prepara su pago histórico). No se relajó ninguna aserción: el 409 sigue probado.

## DEC-017. CSP con nonce para scripts y estilos en línea permitidos

- **Fecha:** domingo 18 de octubre, 22:17 (Lima). **Fuente:** BUILD_PROMPT 14.1 y la guía de CSP de Next.js 16 (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
- **Decisión:** `src/proxy.ts` genera un nonce por petición. `script-src 'self' 'nonce-…' 'strict-dynamic'` (con `'unsafe-eval'` solo en desarrollo), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `connect-src 'self'` y `upgrade-insecure-requests` fuera de localhost. El único script en línea (el del tema) lleva el nonce.
- **Excepción:** `style-src 'self' 'unsafe-inline'`. Los componentes usan atributos `style` para anchos y tamaños calculados (barras, sello) y el aviso de sonner inserta estilos; un nonce no cubre atributos `style`. Los estilos no ejecutan código; el riesgo que queda (inyección de CSS) no alcanza a los scripts ni a los datos de la API.
- **Efecto:** todas las páginas se renderizan en el servidor por petición (el nonce lo exige). `pnpm ui:check` vigila la consola del navegador y falla ante cualquier violación de la CSP.
