import { loadLocalEnv } from "@/infrastructure/config/localEnv";

// Las pruebas de integración usan la rama dev de Neon desde .env.local. Nunca credenciales de producción.
loadLocalEnv();
