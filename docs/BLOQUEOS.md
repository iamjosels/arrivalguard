# Bloqueos

Lo que falta para avanzar y solo pueden resolver los humanos. Lo más urgente va arriba. Cuando un bloqueo se resuelva, se marca como resuelto con la hora de Lima.

Última revisión: domingo 18 de octubre, 16:39 (Lima).

---

## Abiertos

### B1. Falta `.env.local` en la raíz (urgente, bloquea la Fase 0)

- **Qué falta:** el archivo `.env.local` no existe en `C:\Users\giosi\Desktop\ArrivalGuard`.
- **Por qué bloquea:** sin él no se puede comprobar Neon `dev` (`select 1`), ni hacer la llamada real a Claude que exige la Fase 0, ni conectar Drizzle, ni correr `pnpm test` contra Neon.
- **Qué deben hacer (ARRANQUE, paso 2):**
  1. En Neon, un proyecto con las ramas `main` (producción) y `dev`. De la rama `dev`, copiar la cadena con pooling (host con `-pooler`) y la directa.
  2. Crear `.env.local` en la raíz, **solo con valores de `dev`**:
     ```
     DATABASE_URL=<cadena con pooling de dev>
     DATABASE_URL_UNPOOLED=<cadena directa de dev>
     ANTHROPIC_API_KEY=<clave con acceso a claude-sonnet-5-5>
     ANTHROPIC_MODEL=claude-sonnet-5-5
     SESSION_PEPPER=<salida del comando de abajo>
     EVAL_ACCESS_CODE=<código de evaluación del jurado, 8 caracteres o más>
     APP_BASE_URL=http://localhost:3000
     ```
     Pepper: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
  3. No pongan la clave de Anthropic como variable de entorno de Windows (hoy no lo está: correcto).
- **Cómo lo verifico:** corro el script de verificación previa, que carga `.env.local` sin imprimir valores y muestra "presente" o "ausente" por variable, si las cadenas son de Neon con pooling y directa del mismo endpoint, `select 1` con ambas cadenas y una llamada mínima a `claude-sonnet-5-5` con la configuración 13.1 (`between_tools`, effort `low`, `tool_choice: auto`, herramienta `strict`).

### B2. Falta el repositorio remoto en GitHub (urgente, bloquea los push y el despliegue)

- **Qué falta:** no hay remoto `origin` y el repositorio `iamjosels/arrivalguard` no existe en GitHub. `gh` sí tiene la sesión iniciada como `iamjosels` con permiso `repo`.
- **Por qué bloquea:** AUTONOMIA prohíbe que yo agregue remotos o publique algo fuera del repositorio. Sin `origin` no hay respaldo remoto, ni previews, ni producción en Vercel.
- **Ya hecho por Claude (solo local):** `git init -b main`, commit `a3466e2 docs: especificaciones y diseño` con `.gitignore`, `.gitattributes`, `.claude` y `docs`, y rama `dev` creada. La sesión está en `dev`.
- **Qué deben hacer** (PowerShell en la carpeta del proyecto, o en esta sesión anteponiendo `!` a cada línea). El push inicial tiene que salir de `main`, para que `main` sea la rama por defecto y la de producción:
  ```powershell
  git switch main
  gh repo create arrivalguard --private --source . --remote origin --push
  git switch dev
  git push -u origin dev
  ```
  Según ARRANQUE, el modo automático solo confía en los remotos que existían al abrir la sesión: si usan modo automático, después de crear el remoto cierren Claude Code y ábranlo con `claude --continue`.
- **Cómo lo verifico:** `git remote -v`, `git ls-remote --heads origin` (deben estar `main` y `dev`) y `gh repo view iamjosels/arrivalguard --json visibility,defaultBranchRef` (esperado: `PRIVATE` y `main`).

### B3. Falta el proyecto de Vercel (bloquea el despliegue de la Fase 0)

- **Qué falta:** `vercel whoami` responde `iamjosels`, pero en `vercel project ls` no hay ningún proyecto de ArrivalGuard y la carpeta no está enlazada (no existe `.vercel/`).
- **Por qué bloquea:** la Fase 0 termina con un hola mundo desplegado, y AUTONOMIA prohíbe que yo toque las variables de entorno de Vercel.
- **Qué deben hacer (ARRANQUE, paso 4), después de resolver B2:**
  1. Importar el repositorio `arrivalguard` en Vercel: framework Next.js, rama de producción `main`, Node 24.x.
  2. Variables en **Production** con las cadenas de Neon `main` y en **Preview** con las de Neon `dev`: `DATABASE_URL` (con pooling) y `DATABASE_URL_UNPOOLED` (directa; la usa el build de producción, que corre `pnpm db:migrate && pnpm build`). En ambos entornos además: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-sonnet-5-5`, `SESSION_PEPPER`, `EVAL_ACCESS_CODE` (el mismo de `.env.local`) y `APP_BASE_URL` (la URL de producción; si todavía no la saben, cárguenla después del primer despliegue).
  3. El primer build va a fallar porque aún no hay código: es normal.
  4. Recomendado: en esta carpeta, `vercel link` (elige el proyecto recién importado), para que yo pueda comprobar los builds con `vercel ls` y `vercel inspect`.
- **Cómo lo verifico:** `vercel project ls` muestra el proyecto; con la carpeta enlazada, `vercel env ls` lista los **nombres** de las variables por entorno (sin leer valores) y `vercel ls` muestra los despliegues.

---

## Resueltos

- **R1. pnpm no estaba instalado** (resuelto 16:37). Lo instalé con `npm install -g pnpm@12.14.0` en el prefijo de usuario (`%APPDATA%\npm`, sin permisos de administrador). `pnpm --version` responde 12.14.0 en Git Bash y en PowerShell. npm avisó que no corrió los scripts de instalación del paquete (`allow-scripts`); pnpm funciona igual. Si fallara, la alternativa es `corepack`.
- **R2. Repositorio git local** (resuelto 16:38). Ver B2: queda pendiente solo la parte remota.
