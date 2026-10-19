"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import type { JourneyStationDTO } from "@/application/dto/CaseDTO";
import { ConsentSeal } from "@/ui/brand/ConsentSeal";
import { StopOctagon } from "@/ui/brand/StopOctagon";
import { formatClock } from "@/ui/format/time";
import { cn } from "@/ui/lib/cn";

export interface JourneyLineProps {
  readonly stations: readonly JourneyStationDTO[];
  readonly payerName?: string;
  readonly approvalFingerprint?: string | null;
  readonly orientation?: "horizontal" | "vertical" | "responsive";
  readonly className?: string;
}

const LABELS: Record<JourneyStationDTO["key"], string> = {
  PLANNED: "Planned",
  APPROVED: "Approved",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  UNIVERSITY: "University",
  CREDITED: "Credited",
};

// Firma 1 de UI_UX 8: el tramo se rellena desde la estación anterior (400 ms) y el incierto se desplaza lento (2 s).
const JOURNEY_CSS = `
@keyframes ag-journey-fill-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes ag-journey-fill-y { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes ag-journey-drift-x { from { background-position: 0 0; } to { background-position: 12px 0; } }
@keyframes ag-journey-drift-y { from { background-position: 0 0; } to { background-position: 0 12px; } }
@keyframes ag-journey-arrive { from { transform: scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
.ag-journey-fill-x { transform-origin: 0 50%; animation: ag-journey-fill-x 400ms var(--ag-ease-standard) both; }
.ag-journey-fill-y { transform-origin: 50% 0; animation: ag-journey-fill-y 400ms var(--ag-ease-standard) both; }
.ag-journey-drift-x { background-image: repeating-linear-gradient(90deg, var(--ag-wait) 0 6px, transparent 6px 12px); animation: ag-journey-drift-x 2s linear infinite; }
.ag-journey-drift-y { background-image: repeating-linear-gradient(180deg, var(--ag-wait) 0 6px, transparent 6px 12px); animation: ag-journey-drift-y 2s linear infinite; }
.ag-journey-fill-r { transform-origin: 50% 0; animation: ag-journey-fill-y 400ms var(--ag-ease-standard) both; }
.ag-journey-drift-r { background-image: repeating-linear-gradient(180deg, var(--ag-wait) 0 6px, transparent 6px 12px); animation: ag-journey-drift-y 2s linear infinite; }
@media (min-width: 48rem) {
  .ag-journey-fill-r { transform-origin: 0 50%; animation-name: ag-journey-fill-x; }
  .ag-journey-drift-r { background-image: repeating-linear-gradient(90deg, var(--ag-wait) 0 6px, transparent 6px 12px); animation-name: ag-journey-drift-x; }
}
.ag-journey-arrive { animation: ag-journey-arrive var(--ag-dur-slow) var(--ag-ease-standard) both; }
@media (prefers-reduced-motion: reduce) {
  .ag-journey-fill-x, .ag-journey-fill-y, .ag-journey-fill-r, .ag-journey-arrive { animation: none; }
  .ag-journey-drift-x, .ag-journey-drift-y, .ag-journey-drift-r { animation: none; }
}
`;

// Clases literales por orientación (Tailwind necesita verlas escritas).
const LAYOUT = {
  horizontal: {
    list: "grid grid-flow-col auto-cols-fr",
    item: "relative flex flex-col gap-2 pr-2",
    rail: "absolute left-[30px] right-[6px] top-[10.5px] h-[3px]",
    text: "flex flex-col",
    fill: "ag-journey-fill-x",
    drift: "ag-journey-drift-x",
  },
  vertical: {
    list: "flex flex-col",
    item: "relative flex flex-row gap-3 pb-6 last:pb-0",
    rail: "absolute bottom-[4px] left-[10.5px] top-[30px] w-[3px]",
    text: "flex flex-col pt-0.5",
    fill: "ag-journey-fill-y",
    drift: "ag-journey-drift-y",
  },
  responsive: {
    list: "flex flex-col md:grid md:grid-flow-col md:auto-cols-fr",
    item: "relative flex flex-row gap-3 pb-6 last:pb-0 md:flex-col md:gap-2 md:pb-0 md:pr-2",
    rail: "absolute bottom-[4px] left-[10.5px] top-[30px] w-[3px] md:bottom-auto md:left-[30px] md:right-[6px] md:top-[10.5px] md:h-[3px] md:w-auto",
    text: "flex flex-col pt-0.5 md:pt-0",
    fill: "ag-journey-fill-r",
    drift: "ag-journey-drift-r",
  },
} as const;

const filled = (s: JourneyStationDTO | undefined) => s?.state === "done" || s?.state === "current";

/**
 * Línea del pago estilo mapa de metro (UI_UX 12): hecho, actual, incierto (tramo punteado en `wait`), bloqueado
 * (octágono) y acreditado (relleno `arrive` con check). Bajo cada estación, hora virtual y procedencia.
 */
export function JourneyLine({ stations, payerName = "Carlos", approvalFingerprint, orientation = "responsive", className }: JourneyLineProps) {
  const layout = LAYOUT[orientation];
  const signature = stations.map((s) => s.state).join(",");
  const [previous, setPrevious] = useState(signature);
  const [fresh, setFresh] = useState<ReadonlySet<number>>(() => new Set());

  // Patrón de React para comparar con el render anterior: los tramos que recién quedaron llenos se animan una vez.
  if (signature !== previous) {
    const before = previous.split(",");
    const next = new Set<number>();
    stations.forEach((s, i) => {
      const was = before[i];
      if (i > 0 && (s.state === "done" || s.state === "current") && was !== "done" && was !== "current") next.add(i - 1);
    });
    setPrevious(signature);
    setFresh(next);
  }

  const current = stations.find((s) => s.state === "uncertain" || s.state === "blocked" || s.state === "current") ?? [...stations].reverse().find((s) => s.state === "done");
  const announcement = current ? `${stationLabel(current)}: ${subtitle(current, payerName) ?? stateWord(current)}` : "";

  return (
    <div className={className}>
      <style href="ag-journey-line" precedence="default">
        {JOURNEY_CSS}
      </style>
      <p className="sr-only" aria-live="polite">
        Payment journey. {announcement}
      </p>
      <ol className={layout.list}>
        {stations.map((station, i) => {
          const next = stations[i + 1];
          const segment = next ? (next.state === "uncertain" ? "uncertain" : filled(next) ? "filled" : "empty") : null;
          const sub = subtitle(station, payerName);
          const isCurrent = station.state === "current" || station.state === "uncertain" || station.state === "blocked";
          return (
            <li key={station.key} className={layout.item} aria-current={isCurrent ? "step" : undefined}>
              {segment ? (
                <span
                  aria-hidden
                  className={cn(
                    layout.rail,
                    "rounded-full",
                    segment === "filled" && "bg-route",
                    segment === "filled" && fresh.has(i) && layout.fill,
                    segment === "uncertain" && layout.drift,
                    segment === "empty" && "bg-line",
                  )}
                />
              ) : null}
              <Dot station={station} />
              <span className={layout.text}>
                <span className={cn("text-[14px] font-semibold leading-5", station.state === "pending" ? "text-ink-2" : "text-ink")}>{stationLabel(station)}</span>
                {sub ? (
                  <span className={cn("text-[12px] font-medium leading-4 tracking-[0.01em]", station.state === "uncertain" ? "text-wait" : station.state === "blocked" ? "text-stop" : "text-muted")}>
                    {sub}
                  </span>
                ) : null}
                {station.key === "APPROVED" && station.state === "done" && approvalFingerprint ? (
                  <ConsentSeal fingerprint={approvalFingerprint} size={28} caption={false} className="mt-1.5" />
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dot({ station }: { station: JourneyStationDTO }) {
  const box = "relative z-[1] flex size-6 shrink-0 items-center justify-center";
  if (station.state === "blocked") {
    return (
      <span className={box}>
        <StopOctagon size={24} />
      </span>
    );
  }
  if (station.key === "CREDITED" && station.state === "done") {
    return (
      <span className={box}>
        <span className="ag-journey-arrive flex size-7 items-center justify-center rounded-full bg-arrive text-surface">
          <Check aria-hidden className="size-4" strokeWidth={2.5} />
        </span>
      </span>
    );
  }
  const dot =
    station.state === "done"
      ? "size-4 rounded-full bg-route"
      : station.state === "current"
        ? "size-[18px] rounded-full border-[3px] border-route bg-surface"
        : station.state === "uncertain"
          ? "size-[18px] rounded-full border-[3px] border-dashed border-wait bg-surface"
          : "size-3 rounded-full border-2 border-line-strong bg-surface";
  return (
    <span className={box}>
      <span className={dot} />
    </span>
  );
}

function stationLabel(station: JourneyStationDTO): string {
  return station.key === "CREDITED" && station.state === "done" ? "Credited by the university" : LABELS[station.key];
}

function stateWord(station: JourneyStationDTO): string {
  return station.state === "done" ? "done" : station.state === "pending" ? "pending" : station.state;
}

const SOURCE: Record<NonNullable<JourneyStationDTO["source"]>, (payer: string) => string> = {
  SYSTEM: () => "ArrivalGuard",
  PAYER: (payer) => payer,
  PROVIDER: () => "Provider",
  UNIVERSITY: () => "University",
};

function subtitle(station: JourneyStationDTO, payer: string): string | null {
  if (station.state === "uncertain") return "Checking with the provider";
  if (station.state === "blocked") return "Blocked";
  if (station.at && (station.state === "done" || station.state === "current")) {
    return station.source ? `${formatClock(station.at)}, ${SOURCE[station.source](payer)}` : formatClock(station.at);
  }
  if (station.state === "current") {
    switch (station.key) {
      case "PLANNED":
        return "Next";
      case "APPROVED":
        return `Waiting for ${payer}`;
      case "SENT":
        return "Ready to send";
      case "ACCEPTED":
        return "Waiting for the provider";
      case "UNIVERSITY":
        return "Waiting for the university";
      default:
        return null;
    }
  }
  return null;
}
