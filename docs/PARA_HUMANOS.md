# Para los humanos

Lo que deben hacer o probar, lo más urgente arriba. Cada entrada lleva la hora de Lima.

## Ahora

- **Domingo 18, 19:48. Fase 2 cerrada (persistencia y ejecución de T1, puerta G1).** Todavía no hay nada nuevo que probar en la web: el pago de matrícula de punta a punta (con respuesta perdida, pagos simultáneos, eventos duplicados y conciliación) está demostrado por las pruebas de integración contra la base `dev`. Si quieren verlo: `pnpm exec vitest run --project integration` (unos 4 minutos). La interfaz para probarlo a mano llega con las Fases 3 y 4.
- **Domingo 18, 17:56. Nada urgente.** La Fase 0 está terminando. Cuando aparezca aquí "Fase 0 cerrada", pueden abrir https://arrivalguard.vercel.app: por ahora muestra la banda de simulación y el lema, y `https://arrivalguard.vercel.app/api/health` responde `status: ok` y `database: ok`.

## Siempre

- **Código de evaluación:** está en `.env.local` y en Vercel como `EVAL_ACCESS_CODE`. En documentos y en la entrega se escribe como marcador `<EVAL_ACCESS_CODE>`; nunca su valor en el repositorio.
- **Cómo entrar a la demo:** se completa en la Fase 3 (acceso del jurado con código y escenario).
- **Qué probar en el celular:** se completa en la Fase 4.
- **Toma de respaldo del video:** se avisa aquí cuando se cumpla la puerta G2 (Fase 5).
- **Video final:** se avisa aquí cuando se cumpla la puerta G4 (Fase 8).
