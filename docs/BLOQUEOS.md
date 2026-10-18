# Bloqueos

Lo que falta para avanzar y solo pueden resolver los humanos. Lo más urgente va arriba. Cuando un bloqueo se resuelva, se marca como resuelto con la hora de Lima.

Última revisión: domingo 18 de octubre, 17:16 (Lima).

## Regla vigente mientras falten los secretos (indicada por los humanos)

- Mientras B1 y B2 sigan abiertos: avanzar la parte de la Fase 0 que no necesita secretos y la Fase 1 completa.
- Cuando los humanos avisen que están listos: cerrar la Fase 0 (Neon `dev`, llamada real a Claude con la configuración 13.1 y despliegue en Vercel) **antes** de empezar la Fase 2.

---

## Abiertos

### B1. Faltan tres secretos en `.env.local` (bloquea el cierre de la Fase 0)

- **Qué falta:** `.env.local` ya existe (UTF-8, ignorado por git) con `ANTHROPIC_MODEL=claude-sonnet-5-5`, `APP_BASE_URL=http://localhost:3000`, y `SESSION_PEPPER` y `EVAL_ACCESS_CODE` generados al azar. Siguen vacías estas tres líneas:
  ```
  DATABASE_URL=            cadena con pooling (host con -pooler) de la rama dev de Neon
  DATABASE_URL_UNPOOLED=   cadena directa de la rama dev de Neon
  ANTHROPIC_API_KEY=       clave con acceso a claude-sonnet-5-5
  ```
- **Por qué bloquea:** sin ellas no hay `select 1` contra Neon `dev`, ni Drizzle conectado, ni la llamada real a Claude que pide la Fase 0, ni pruebas de integración.
- **Qué deben hacer:** abrir `.env.local` en un editor y completar las tres líneas. Solo valores de `dev`; nunca credenciales de producción en local. No pongan la clave como variable de entorno de Windows.
- **Cómo lo verifico:** con el script de verificación previa, que no imprime valores. Muestra "presente" o "ausente" por variable, si las cadenas son de Neon con pooling y directa del mismo endpoint, `select 1` con ambas y una llamada mínima a `claude-sonnet-5-5` con `between_tools`, effort `low`, `tool_choice: auto` y una herramienta `strict`.

### B2. Faltan las variables de entorno en Vercel (bloquea el despliegue de la Fase 0)

- **Qué falta:** el proyecto `arrivalguard` existe y está conectado al repositorio, pero no tiene ninguna variable (0 en la API). AUTONOMIA prohíbe que yo las cargue.
- **Qué deben hacer** (Vercel, proyecto `arrivalguard`, Settings, Environment Variables):
  - **Production**, con las cadenas de la rama `main` de Neon: `DATABASE_URL` (con pooling) y `DATABASE_URL_UNPOOLED` (directa; la usa el build de producción, que correrá `pnpm db:migrate && pnpm build`).
  - **Preview**, con las cadenas de la rama `dev` de Neon: `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
  - **En ambos entornos:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-sonnet-5-5`, `SESSION_PEPPER` (recomendado: uno nuevo para Production con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`; en Preview pueden reutilizar el de `.env.local`), `EVAL_ACCESS_CODE` (**el mismo** de `.env.local`) y `APP_BASE_URL=https://arrivalguard.vercel.app` (dominio de producción que asignó Vercel).
- **Cómo lo verifico:** `vercel env ls` lista solo los **nombres** por entorno, sin leer valores. Después, el primer despliegue de la Fase 0 queda en *Ready* y `smoke` corre contra `https://arrivalguard.vercel.app`.

---

## Resueltos

- **R1. pnpm no estaba instalado** (resuelto 16:37). Lo instalé con `npm install -g pnpm@12.14.0` en el prefijo de usuario (`%APPDATA%\npm`, sin permisos de administrador). `pnpm --version` responde 12.14.0 en Git Bash y en PowerShell. npm avisó que no corrió los scripts de instalación del paquete (`allow-scripts`); pnpm funciona igual. Si fallara, la alternativa es `corepack`.
- **R2. Repositorio git local** (resuelto 16:38). `git init -b main`, commit `a3466e2` con las especificaciones y rama `dev`.
- **R3. Repositorio remoto** (resuelto 17:12, autorizado por los humanos). `gh repo create arrivalguard --private --source . --remote origin --push` desde `main`, y después `git push -u origin dev`. Verificado: `origin` apunta a `https://github.com/iamjosels/arrivalguard.git`, el remoto tiene `main` y `dev`, visibilidad `PRIVATE` y rama por defecto `main`.
- **R4. Proyecto de Vercel** (resuelto 17:14, autorizado por los humanos). `vercel project create arrivalguard`, preset Next.js y Node 24.x, `vercel link --yes --project arrivalguard` y `vercel git connect`. Verificado por la API: conectado a `iamjosels/arrivalguard`, rama de producción `main`, 0 variables y dominio de producción `arrivalguard.vercel.app`. `vercel link` creó un `.env.local` con un `VERCEL_OIDC_TOKEN` temporal (se reemplazó por el archivo de R5) y agregó `.vercel` y `.env*` al final de `.gitignore`. Revertí ese cambio porque `.env*` volvía a ignorar `.env.example`; las líneas que ya existían (`.vercel/` y `.env*.local`) cubren ambos casos.
- **R5. `.env.local` creado** (resuelto 17:15). Ver B1: faltan solo los tres secretos.
- **R6. Modo automático** (resuelto 17:16). Agregué el bloque `autoMode` de ARRANQUE a `C:\Users\giosi\.claude\settings.json` sin borrar nada. No había `defaultMode`, así que no hubo nada que quitar. `claude auto-mode config` ya muestra las dos reglas de ArrivalGuard.
