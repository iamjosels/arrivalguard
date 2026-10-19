"use client";

import { ChevronDown, MessageSquare, Route as RouteIcon, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { CashProjectionDTO, CaseViewDTO, PlanDTO, RouteEvaluationDTO, RoutingDTO } from "@/application/dto/CaseDTO";
import { formatMoney } from "@/interfaces/format/money";
import { CashProjection, channelName, ConditionalIncomeCard, FundsBar, JourneyLine, MoneyFigure, RouteBoard, StatusPill, type PillStatus, type ReasonContext } from "@/ui/finance";
import { formatClock, formatDuration, formatVirtual, minutesBetween, formatWhen } from "@/ui/format/time";
import { Button, Field, Input, Panel, Switch, Tabs, notify, notifyWaiting } from "@/ui/primitives";
import { api } from "@/ui/lib/api";
import { cn } from "@/ui/lib/cn";
import { ConversationPanel } from "@/ui/chat";
import { studentApi, useActionState, usePaymentKey, type ActionState } from "./actions";
import { firstName, parseUsdToMinor } from "./copy";
import { ProblemNotice } from "./ProblemNotice";

// Espacio de Sofía (UI_UX 11.2, DESIGN_PLAN 5.2). Zona A: conversación (en esta fase, controles estructurados).
// Zona B: el estado verdadero del servidor, en el orden factura, viaje del pago, rutas, fondos y caja.

export const lastFour = (masked: string) => masked.replace(/\D/g, "").slice(-4);

export function routeLine(route: RouteEvaluationDTO): string {
  return `Route ${route.routeId}, ${channelName(route.channel)}, arrives in about ${route.arrivalHours} h. University receives ${formatMoney(route.net)}.`;
}

export function planTargetHours(plan: PlanDTO): number | null {
  return plan.targetArrivalHours;
}

export function reasonContext(data: CaseViewDTO, targetHours?: number | null): ReasonContext {
  return {
    targetHours: targetHours ?? undefined,
    invoiceNet: data.tuition.netDue,
    limit: data.familyFunds.tuitionLimit,
    reserve: data.familyFunds.arrivalReserve,
    available: data.familyFunds.availableForTuition,
    payerName: firstName(data.people.payer),
    studentName: firstName(data.people.student),
    mandateUsed: data.mandate?.usedThisPeriod,
    mandateMax: data.mandate?.periodMax,
  };
}

type MobileTab = "chat" | "payment" | "funds";

export function StudentView({ data, refresh }: { data: CaseViewDTO; refresh: () => Promise<void> }) {
  const actions = useActionState(refresh);
  const paymentKey = usePaymentKey();
  const [tab, setTab] = useState<MobileTab>("payment");
  const plan = data.plan;
  const targetHours = plan ? planTargetHours(plan) : null;
  const ctx = reasonContext(data, targetHours);

  const send = async () => {
    if (!plan) return;
    // La clave va ligada a la aprobación vigente: tras una falla confirmada y una aprobación nueva, la clave es otra (VC7-2).
    const approvalId = plan.approvals.find((a) => a.planVersion === plan.version && a.status === "ACTIVE")?.approvalId ?? "none";
    const result = await actions.run("send", () => studentApi.send("student", plan.planId, paymentKey(plan.planId, plan.version, approvalId)));
    if (result) announceAttempt(result.attempt.status, result.replayed);
  };
  const check = async () => {
    const attemptId = data.payment.attempt?.attemptId;
    if (!attemptId) return;
    const result = await actions.run("check", () => studentApi.check("student", attemptId));
    if (result) announceAttempt(result.attempt.status, false, result.attempt.status === data.payment.attempt?.status);
  };

  // Conciliación periódica (BUILD_PROMPT 15.4): con un pago en vuelo, cada 10 s se consulta el MISMO intento.
  const inFlight = data.payment.attempt && ["SUBMITTING", "UNKNOWN", "PROVIDER_ACCEPTED", "PENDING_UNIVERSITY"].includes(data.payment.attempt.status) ? data.payment.attempt.attemptId : null;
  useEffect(() => {
    if (!inFlight) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void studentApi
        .check("student", inFlight)
        .then(() => refresh())
        .catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [inFlight, refresh]);
  const requestApproval = async () => {
    if (!plan) return;
    const result = await actions.run("request", () => studentApi.requestApproval(plan.planId));
    if (result) notify(`Approval requested from ${firstName(data.people.payer)}`);
  };

  const section = (id: MobileTab) => (tab === id ? "block" : "hidden lg:block");

  return (
    <div className="mx-auto w-full max-w-[1344px] px-4 pt-4 pb-24 md:px-8 md:pt-6 lg:pb-8">
      <Tabs
        className="mb-4 lg:hidden"
        ariaLabel="Workspace sections"
        value={tab}
        onChange={(id) => setTab(id as MobileTab)}
        tabs={[
          { id: "chat", label: "Chat", icon: <MessageSquare aria-hidden className="size-4" strokeWidth={1.75} /> },
          { id: "payment", label: "Payment", icon: <RouteIcon aria-hidden className="size-4" strokeWidth={1.75} /> },
          { id: "funds", label: "Funds", icon: <Wallet aria-hidden className="size-4" strokeWidth={1.75} /> },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="panel-chat" role="tabpanel" aria-label="Chat" className={cn("min-w-0 lg:col-span-5", section("chat"))}>
          <Panel title="Conversation" className="lg:sticky lg:top-6">
            <ConversationPanel
              role="student"
              workspaceId={data.workspace.id}
              data={data}
              refresh={refresh}
              ctx={ctx}
              structured={<StructuredControls data={data} actions={actions} ctx={ctx} onSend={send} onCheck={check} onRequest={requestApproval} />}
            />
          </Panel>
        </div>
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <div id="panel-payment" role="tabpanel" aria-label="Payment" className={section("payment")}>
            <div className="space-y-4">
              <InvoicePanel data={data} />
              <JourneyPanel data={data} actions={actions} ctx={ctx} onSend={send} onCheck={check} onRequest={requestApproval} />
              {plan ? <RoutesPanel plan={plan} data={data} /> : null}
            </div>
          </div>
          <div id="panel-funds" role="tabpanel" aria-label="Funds" className={section("funds")}>
            <FundsPanels data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicePanel({ data }: { data: CaseViewDTO }) {
  const t = data.tuition;
  const dueIn = minutesBetween(data.workspace.virtualNow, t.dueAt);
  const credited = t.status === "CREDITED";
  return (
    <Panel title="Tuition invoice" aside={credited ? <StatusPill status="CREDITED" /> : null}>
      <MoneyFigure money={t.netDue} size="xl" />
      <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
        {t.institution}, account ending {lastFour(t.receiverMasked)}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[14px] leading-[22px]">
        <div>
          <dt className="text-[13px] font-semibold text-muted">Reference</dt>
          <dd className="text-ink">{t.reference}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold text-muted">Due</dt>
          <dd className="tabular text-ink">
            {formatVirtual(t.dueAt)} {!credited && dueIn > 0 ? <span className="text-muted">in {formatDuration(dueIn)}</span> : null}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

interface StepProps {
  data: CaseViewDTO;
  actions: ActionState;
  ctx: ReasonContext;
  onSend: () => Promise<void>;
  onCheck: () => Promise<void>;
  onRequest: () => Promise<void>;
}

function JourneyPanel({ data, actions, ctx, onSend, onCheck, onRequest }: StepProps) {
  const status = data.payment.visibleStatus as PillStatus;
  const approval = data.plan?.approvals.find((a) => a.planVersion === data.plan?.version && (a.status === "ACTIVE" || a.status === "CONSUMED"));
  return (
    <Panel title="Payment journey" aside={<StatusPill status={status} payerName={firstName(data.people.payer)} />}>
      <JourneyLine stations={data.payment.journey} payerName={firstName(data.people.payer)} approvalFingerprint={approval?.fingerprint ?? null} referenceAt={data.workspace.virtualStart} />
      <div className="mt-5 border-t border-line pt-4">
        <NextStep data={data} actions={actions} ctx={ctx} onSend={onSend} onCheck={onCheck} onRequest={onRequest} />
      </div>
    </Panel>
  );
}

function NextStep({ data, actions, ctx, onSend, onCheck, onRequest }: StepProps) {
  const plan = data.plan;
  const attempt = data.payment.attempt;
  const payer = firstName(data.people.payer);
  const invalidated = plan?.approvals.find((a) => a.status === "INVALIDATED" && a.planVersion < plan.version);
  const step = (title: string, detail: string, action?: React.ReactNode) => (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-[14px] leading-[22px] text-ink-2">{detail}</p>
      </div>
      {action}
    </div>
  );
  let body: React.ReactNode;
  switch (data.payment.nextAction) {
    case "PLAN_PAYMENT":
      body = step("No payments yet.", "Ask ArrivalGuard to plan your tuition, or use Plan my payment.");
      break;
    case "REQUEST_APPROVAL":
      body = step(
        `Needs ${payer}'s approval`,
        `Send the request. ${payer} approves on his own screen.`,
        <Button onClick={onRequest} loading={actions.busy === "request"} loadingText="Requesting">
          Request approval
        </Button>,
      );
      break;
    case "WAIT_FOR_PAYER":
      body = step(`Approval requested from ${payer}`, `${payer} approves on his own screen.`);
      break;
    case "SEND_PAYMENT": {
      const route = plan?.selectedRoute;
      body = step(
        "Payment approved",
        route ? `Route ${route.routeId}, ${formatMoney(route.debit)}. Nothing moves until you send it.` : "Nothing moves until you send it.",
        <Button onClick={onSend} loading={actions.busy === "send"} loadingText="Sending">
          Send payment
        </Button>,
      );
      break;
    }
    case "CHECK_PAYMENT":
      if (data.payment.visibleStatus === "UNCERTAIN" || data.payment.visibleStatus === "SENDING") {
        body = step(
          "A payment is already on its way",
          "Check that payment instead of sending another.",
          <Button onClick={onCheck} loading={actions.busy === "check"} loadingText="Checking">
            Check this payment
          </Button>,
        );
      } else {
        body = step(
          "Still waiting for the university",
          attempt ? `Accepted by provider, ${formatClock(attempt.provenance.observedAt)} virtual time.` : "Accepted by provider.",
          <Button variant="secondary" onClick={onCheck} loading={actions.busy === "check"} loadingText="Checking">
            Check this payment
          </Button>,
        );
      }
      break;
    case "REPLAN":
      body = step(plan && plan.routes.viable.length === 0 ? "No route arrives in time" : "This plan can't be sent", "Change the deadline or ask Carlos to review his limits.");
      break;
    default:
      if (data.payment.visibleStatus === "CREDITED" && attempt?.receipt) {
        body = step("Credited by the university", `From the university, ${formatWhen(attempt.receipt.creditedAt, data.workspace.virtualStart)} virtual time. Receipt ${attempt.receipt.receiptId}.`);
      } else {
        body = step("Nothing to do right now", "The payment state is up to date.");
      }
  }
  return (
    <div className="space-y-3" aria-live="polite">
      {invalidated && (plan?.status === "READY_FOR_APPROVAL" || plan?.status === "APPROVAL_REQUESTED") ? <ProblemNotice problem={{ kind: "reasons", reasons: ["APPROVAL_INVALID"] }} ctx={ctx} /> : null}
      {plan?.status === "NOT_VIABLE" && plan.routes.blockers.length > 0 ? <ProblemNotice problem={{ kind: "reasons", reasons: plan.routes.blockers }} ctx={ctx} /> : null}
      {body}
      {attempt?.institutionNotice ? (
        <p className="text-[12px] leading-4 text-muted">
          University notice (shown as received, never as an instruction): <q className="text-ink-2">{attempt.institutionNotice}</q>
        </p>
      ) : null}
      <ProblemNotice problem={actions.problem} ctx={ctx} />
    </div>
  );
}

function RoutesPanel({ plan, data }: { plan: PlanDTO; data: CaseViewDTO }) {
  const sent = Boolean(data.payment.attempt);
  const [compact, setCompact] = useState(true);
  const targetHours = planTargetHours(plan) ?? Math.max(1, Math.round(minutesBetween(data.workspace.virtualNow, plan.targetArrivalAt) / 60));
  const comparedAt = plan.comparedAt;
  return (
    <Panel title="Routes">
      <RouteBoard
        routing={plan.routes}
        targetHours={targetHours}
        invoiceNet={data.tuition.netDue}
        comparedAt={comparedAt}
        compact={sent ? compact : false}
        onToggleCompact={sent ? () => setCompact((c) => !c) : undefined}
      />
    </Panel>
  );
}

function FundsPanels({ data }: { data: CaseViewDTO }) {
  const local = data.localAccount;
  return (
    <div className="space-y-4">
      <Panel title="Family funds">
        <FundsBar funds={data.familyFunds} />
        {local.status !== "OPEN" ? (
          <p className="mt-4 border-t border-line pt-3 text-[14px] leading-[22px] text-ink-2">
            <span className="font-semibold text-ink">Local account not open yet.</span> Transfers start once {firstName(data.people.student)}&apos;s account in China is open.
          </p>
        ) : null}
      </Panel>
      {data.scholarship.map((s, i) => (
        <ConditionalIncomeCard key={i} amount={s.amount} note={`Awarded, expected ${formatVirtual(s.expectedAt)} virtual time.`} />
      ))}
      {data.expectedExpenses.length > 0 ? <CashPanel refreshKey={`${data.familyFunds.balance.minor}:${data.familyFunds.activeHolds.minor}:${data.plan?.version ?? 0}:${data.plan?.selectedRoute?.routeId ?? ""}`} /> : null}
    </div>
  );
}

/** Se vuelve a pedir cuando cambia el caso (saldo, retenciones, plan o ruta), y el veredicto es el del servidor (VC7). */
function CashPanel({ refreshKey }: { refreshKey: string }) {
  const [projection, setProjection] = useState<CashProjectionDTO | null>(null);
  useEffect(() => {
    let alive = true;
    api<CashProjectionDTO>("/api/cash-projection", { role: "student" })
      .then((p) => alive && setProjection(p))
      .catch(() => alive && setProjection(null));
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  if (!projection) return null;
  return (
    <Panel title="Cash for the first weeks">
      <ProjectionRows projection={projection} />
    </Panel>
  );
}

/** Solo la moneda del veredicto del servidor lleva veredicto; no se inventa uno para las demás. */
export function ProjectionRows({ projection }: { projection: CashProjectionDTO }) {
  const row = projection.byCurrency.find((c) => c.currency === projection.verdict.margin.currency);
  return row ? <CashProjection row={row} verdict={projection.verdict} /> : null;
}

function announcePlan(status: string) {
  if (status === "NOT_VIABLE") notifyWaiting("No route meets every rule");
  else notify("Plan ready");
}

function announceAttempt(status: string, replayed: boolean, unchanged = false) {
  if (status === "FAILED_CONFIRMED") notifyWaiting("Failed, no money left the account");
  else if (status === "CREDITED") notify("Credited by the university");
  else if (replayed) notifyWaiting("This payment was already sent");
  else if (unchanged) notifyWaiting("Still waiting for the university");
  else notify(status === "SUBMITTING" || status === "UNKNOWN" ? "Payment sent. Checking with the provider" : "Payment sent");
}

function StructuredControls({ data, actions, ctx, onSend, onCheck, onRequest }: StepProps) {
  const due = Math.max(1, Math.floor(minutesBetween(data.workspace.virtualNow, data.tuition.dueAt) / 60));
  const [hours, setHours] = useState(String(due));
  const [compareHours, setCompareHours] = useState(String(due));
  const [compared, setCompared] = useState<RoutingDTO | null>(null);
  const [expenses, setExpenses] = useState("");
  const [projection, setProjection] = useState<CashProjectionDTO | null>(null);
  const [open, setOpen] = useState<string>("plan");
  const plan = data.plan;
  const attempt = data.payment.attempt;
  const hoursValue = /^\d{1,3}$/.test(hours) ? Math.max(1, Math.min(720, Number.parseInt(hours, 10))) : null;
  const compareValue = /^\d{1,3}$/.test(compareHours) ? Math.max(1, Math.min(720, Number.parseInt(compareHours, 10))) : null;

  const sectionHeader = (id: string, label: string) => (
    <button
      type="button"
      aria-expanded={open === id}
      onClick={() => setOpen(open === id ? "" : id)}
      className="flex h-12 w-full items-center justify-between px-4 text-left font-semibold text-ink"
    >
      {label}
      <ChevronDown aria-hidden strokeWidth={1.75} className={cn("size-5 text-ink-2 transition-transform duration-[120ms]", open === id ? "rotate-180" : "")} />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="divide-y divide-line overflow-hidden rounded-control border border-line-strong">
        <section>
          {sectionHeader("plan", "Plan my payment")}
          {open === "plan" ? (
            <form
              className="space-y-4 px-4 pb-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!hoursValue) return;
                const result = await actions.run("plan", () => studentApi.plan(hoursValue));
                if (result) announcePlan(result.plan.status);
              }}
            >
              <Field label="Tuition invoice" htmlFor="plan-invoice">
                <Input id="plan-invoice" readOnly value={`${data.tuition.reference}, ${data.tuition.institution}, ${formatMoney(data.tuition.netDue)}`} />
              </Field>
              <Field
                label="Must arrive within (hours)"
                htmlFor="plan-hours"
                hint={`From ${formatVirtual(data.workspace.virtualNow)} virtual time. The invoice is due in ${formatDuration(minutesBetween(data.workspace.virtualNow, data.tuition.dueAt))}.`}
                error={hoursValue ? null : "Enter whole hours, from 1 to 720."}
              >
                <Input id="plan-hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} invalid={!hoursValue} />
              </Field>
              <Switch checked disabled onCheckedChange={() => undefined} label="Keep the arrival reserve" description={`${formatMoney(data.familyFunds.arrivalReserve)} stays aside for the first weeks.`} />
              {data.tuition.status !== "PENDING" ? <p className="text-[14px] leading-[22px] text-ink-2">This invoice is already paid. There is nothing to plan.</p> : null}
              <Button type="submit" loading={actions.busy === "plan"} loadingText="Planning" disabled={!hoursValue || data.tuition.status !== "PENDING"}>
                Plan my payment
              </Button>
            </form>
          ) : null}
        </section>
        <section>
          {sectionHeader("compare", "Compare routes")}
          {open === "compare" ? (
            <form
              className="space-y-4 px-4 pb-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!compareValue) return;
                const result = await actions.run("compare", () =>
                  api<{ routes: RoutingDTO }>(`/api/routes/compare?purpose=TUITION&targetArrivalHours=${compareValue}`, { role: "student" }),
                );
                if (result) setCompared(result.routes);
              }}
            >
              <Field label="Must arrive within (hours)" htmlFor="compare-hours" hint="Comparing changes nothing." error={compareValue ? null : "Enter whole hours, from 1 to 720."}>
                <Input id="compare-hours" inputMode="numeric" value={compareHours} onChange={(e) => setCompareHours(e.target.value)} invalid={!compareValue} />
              </Field>
              <Button type="submit" variant="secondary" loading={actions.busy === "compare"} loadingText="Comparing" disabled={!compareValue}>
                Compare routes
              </Button>
              {compared && compareValue ? <RouteBoard routing={compared} targetHours={compareValue} invoiceNet={data.tuition.netDue} comparedAt={data.workspace.virtualNow} /> : null}
            </form>
          ) : null}
        </section>
        <section>
          {sectionHeader("request", "Request approval")}
          {open === "request" ? (
            <div className="space-y-3 px-4 pb-4 text-[14px] leading-[22px] text-ink-2">
              {plan?.selectedRoute ? <p>{routeLine(plan.selectedRoute)}</p> : <p>Plan the payment first.</p>}
              <Button onClick={onRequest} loading={actions.busy === "request"} loadingText="Requesting" disabled={plan?.status !== "READY_FOR_APPROVAL"}>
                Request approval
              </Button>
            </div>
          ) : null}
        </section>
        <section>
          {sectionHeader("send", "Send payment")}
          {open === "send" ? (
            <div className="space-y-3 px-4 pb-4 text-[14px] leading-[22px] text-ink-2">
              <p>{plan?.status === "APPROVED" ? `Approved by ${firstName(data.people.payer)}. Nothing moves until you send it.` : `Sending needs ${firstName(data.people.payer)}'s approval of the current plan.`}</p>
              <Button onClick={onSend} loading={actions.busy === "send"} loadingText="Sending" disabled={plan?.status !== "APPROVED"}>
                Send payment
              </Button>
            </div>
          ) : null}
        </section>
        <section>
          {sectionHeader("check", "Check this payment")}
          {open === "check" ? (
            <div className="space-y-3 px-4 pb-4 text-[14px] leading-[22px] text-ink-2">
              <p>{attempt ? "Checks the same payment with the provider and the university. It never sends a new one." : "No payment has been sent yet."}</p>
              <Button variant="secondary" onClick={onCheck} loading={actions.busy === "check"} loadingText="Checking" disabled={!attempt}>
                Check this payment
              </Button>
            </div>
          ) : null}
        </section>
        <section>
          {sectionHeader("project", "Project my funds")}
          {open === "project" ? (
            <form
              className="space-y-4 px-4 pb-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const minor = expenses.trim() === "" ? null : parseUsdToMinor(expenses);
                if (expenses.trim() !== "" && !minor) return;
                const query = minor ? `?arrivalExpensesMinor=${minor}` : "";
                const result = await actions.run("project", () => api<CashProjectionDTO>(`/api/cash-projection${query}`, { role: "student" }));
                if (result) setProjection(result);
              }}
            >
              <Field label="Arrival expenses estimate in USD (optional)" htmlFor="project-expenses" hint="Leave empty to use the estimate on file.">
                <Input id="project-expenses" inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="2,500.00" />
              </Field>
              <Button type="submit" variant="secondary" loading={actions.busy === "project"} loadingText="Projecting">
                Project my funds
              </Button>
              {projection ? <ProjectionRows projection={projection} /> : null}
            </form>
          ) : null}
        </section>
      </div>
      <ProblemNotice problem={open === "plan" || open === "compare" || open === "project" ? actions.problem : null} ctx={ctx} />
      <p className="sr-only" aria-live="polite">
        {actions.busy ? "Working" : ""}
      </p>
    </div>
  );
}
