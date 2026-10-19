import { loadLocalEnv } from "@/infrastructure/config/localEnv";

// Las pruebas de integración usan la rama dev de Neon desde .env.local. Nunca credenciales de producción.
loadLocalEnv();

// Las pruebas de integración corren en paralelo (cada una en su espacio): pool más grande que el de producción.
process.env.DB_POOL_MAX ??= "12";
