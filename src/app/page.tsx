// Fase 0: página mínima con la banda de simulación. La landing completa llega en la Fase 4 (UI_UX_PROMPT 11.1).
export default function HomePage() {
  return (
    <>
      <div role="note" className="flex items-center gap-3 border-b border-line bg-paper px-8 py-1.5 text-[13px] text-ink-2">
        <span aria-hidden className="h-4 w-8 rounded-doc bg-[repeating-linear-gradient(135deg,var(--ag-ink)_0_4px,var(--ag-paper)_4px_8px)]" />
        Simulated funds and a fictional university. No real money moves.
      </div>
      <main className="mx-auto max-w-[1344px] px-8 py-24">
        <p className="text-[13px] font-semibold text-muted">ArrivalGuard</p>
        <h1 className="mt-4 max-w-3xl text-[56px] font-bold leading-[60px] tracking-[-0.02em]">
          Tuition that arrives. Savings that stay.
        </h1>
        <p className="mt-6 max-w-2xl text-ink-2">
          An AI agent that pays a student&apos;s international tuition inside the limits their family sets, follows the
          money until the university confirms it, and never pays twice.
        </p>
      </main>
    </>
  );
}
