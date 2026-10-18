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
