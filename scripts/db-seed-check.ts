import { runMain } from "./lib/args";

// Valida la configuración de escenarios (BUILD_PROMPT 6 y 17). Los escenarios se registran en la Fase 1.
runMain(async () => {
  console.log("db:seed-check: todavía no hay escenarios registrados (llegan en la Fase 1).");
  return 0;
});
