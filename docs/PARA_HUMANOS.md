# Para los humanos

Lo que deben hacer o probar, lo más urgente arriba. Cada entrada lleva la hora de Lima.

## Ahora

- **Lunes 19, 00:30. Fase 7 cerrada (puerta G3, seguridad completa).** Producción tiene ahora las correcciones de la revisión adversarial: devoluciones en paralelo que no pagan de más, señales de ataque en otros idiomas y en base64, y un tope de IA por red. La consola del evaluador trae un botón nuevo, **Run T1 to T8**. Corre las ocho tareas en el servidor, cada una en un espacio nuevo, y muestra qué comprobó en cada una. En producción tardó 3.9 s y dio 8 de 8. Si quieren probarlo: entren con el código, pasen a "Evaluator" y presionen "Run T1 to T8". Arranca una corrida por minuto en toda la demo; si sale "Another scripted run just started", esperen un minuto. Nada más que hacer por ahora. El aviso para el video final llega con la puerta G4.
- **Domingo 18, 22:36. Puerta G2 cumplida: graben la toma de respaldo del video.** La demo completa ya está en producción (https://arrivalguard.vercel.app): la interfaz, el chat con el agente, las transferencias de llegada y las devoluciones. Sugerencia para la toma: en "For judges" usen el código y el escenario "Base scenario"; en el chat de Sofía escriban "Pay my tuition without touching the arrival reserve. It must arrive within 48 hours."; pasen a Carlos (selector de rol arriba), abran "Review and approve" y aprueben (aparece el sello); vuelvan a Sofía y escriban "Carlos approved it. Send the payment now."; en la consola del evaluador avancen 24 horas; de nuevo con Sofía, "Has the university received my payment?". Si el chat tarda, los mismos pasos están en "Use structured controls".
- **Qué probar en el celular (390 px):** la landing, el acceso, las pestañas Chat, Payment y Funds de Sofía, el documento de aprobación de Carlos (se ve entero con el sello al final) y la consola. Avísennos si algo se corta o hay que desplazarse a lo ancho.
- **Domingo 18, 20:40. Fase 3 cerrada: la API de la demo funciona en producción.** El smoke de producción hizo un pago de matrícula completo por HTTP (acceso con el código, plan, aprobación de Carlos, pago y acreditación). La interfaz para hacerlo con clics llega con la Fase 4 en las próximas horas; mientras tanto no hay nada que probar a mano.
- **Domingo 18, 19:48. Fase 2 cerrada (persistencia y ejecución de T1, puerta G1).** Todavía no hay nada nuevo que probar en la web: el pago de matrícula de punta a punta (con respuesta perdida, pagos simultáneos, eventos duplicados y conciliación) está demostrado por las pruebas de integración contra la base `dev`. Si quieren verlo: `pnpm exec vitest run --project integration` (unos 4 minutos). La interfaz para probarlo a mano llega con las Fases 3 y 4.
- **Domingo 18, 17:56. Nada urgente.** La Fase 0 está terminando. Cuando aparezca aquí "Fase 0 cerrada", pueden abrir https://arrivalguard.vercel.app: por ahora muestra la banda de simulación y el lema, y `https://arrivalguard.vercel.app/api/health` responde `status: ok` y `database: ok`.

## Siempre

- **Código de evaluación:** está en `.env.local` y en Vercel como `EVAL_ACCESS_CODE`. En documentos y en la entrega se escribe como marcador `<EVAL_ACCESS_CODE>`; nunca su valor en el repositorio.
- **Cómo entrar a la demo:** abrir https://arrivalguard.vercel.app, ir a "For judges", escribir el código de evaluación (`<EVAL_ACCESS_CODE>`, el mismo de Vercel) y elegir un escenario. Se abre un espacio nuevo con los tres roles en ese navegador (Sofía, Carlos y la consola del evaluador), con sesiones de 14 días.
- **Toma de respaldo del video:** G2 cumplida el domingo 18 a las 22:34 (ver arriba).
- **Video final:** se avisa aquí cuando se cumpla la puerta G4 (Fase 8).
