"use client";

import { CirclePause } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { CaseViewDTO } from "@/application/dto/CaseDTO";
import type { ChatFallbackReason, ChatHistoryDTO, ChatTurnDTO } from "@/application/dto/ChatDTO";
import { BlockedNotice, type ReasonContext } from "@/ui/finance";
import { Skeleton } from "@/ui/primitives";
import { ApiError, api } from "@/ui/lib/api";
import { ChatComposer } from "./ChatComposer";
import { ChatThread } from "./ChatThread";
import { fallbackDetail, fallbackFromStatus, isFallbackStatus, WELCOME, type ChatRole } from "./labels";
import { SuggestionChips } from "./SuggestionChips";

// Conversación de la zona A (UI_UX 11.2, 11.3 y 11.6). El chat narra y propone; el estado verdadero está en la zona B
// y se vuelve a leer del servidor después de cada turno. Si el asistente no está (falla, presupuesto o error), los
// controles estructurados ocupan el lugar del compositor y el hilo sigue visible: nada se pierde.

type Mode = "chat" | "fault" | "manual";

export interface ConversationPanelProps {
  readonly role: ChatRole;
  readonly workspaceId: string;
  readonly data: CaseViewDTO;
  readonly refresh: () => Promise<void>;
  /** Controles estructurados del rol (formularios y botones de T1 a T8). */
  readonly structured: ReactNode;
  readonly ctx?: ReasonContext;
}

export function ConversationPanel({ role, workspaceId, data, refresh, structured, ctx }: ConversationPanelProps) {
  const [turns, setTurns] = useState<ChatTurnDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [reason, setReason] = useState<ChatFallbackReason | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    api<ChatHistoryDTO>("/api/chat", { role })
      .then((history) => {
        if (!alive) return;
        setTurns([...history.turns]);
        setLoaded(true);
        if (history.assistantAvailable) {
          setMode((m) => (m === "fault" ? "chat" : m));
          setReason(null);
        } else {
          setMode("fault");
          setReason(history.unavailableReason);
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded(true);
        setMode("fault");
        setReason(error instanceof ApiError ? fallbackFromStatus(error.status, error.code) : "MODEL_ERROR");
      });
    return () => {
      alive = false;
    };
  }, [role, reload]);

  const send = async (text: string) => {
    setPending(text);
    setNotice(null);
    try {
      const turn = await api<ChatTurnDTO>("/api/chat", { role, body: { message: text } });
      setTurns((current) => [...current, turn]);
      if (turn.fallback) {
        setMode("fault");
        setReason(turn.fallback.reason);
      }
    } catch (error) {
      if (error instanceof ApiError && isFallbackStatus(error.status)) {
        setMode("fault");
        setReason(fallbackFromStatus(error.status, error.code));
      } else {
        setNotice(error instanceof ApiError ? error.message : "Couldn't reach ArrivalGuard. Your payment state is saved. Try again.");
      }
    } finally {
      setPending(null);
      await refresh();
    }
  };

  const quiet = "min-h-11 text-left text-[14px] font-semibold text-route hover:underline md:min-h-0";
  const detail = fallbackDetail(reason);

  return (
    <div className="flex flex-col gap-4">
      {mode === "fault" ? (
        <div className="space-y-2">
          <div role="status" className="flex items-start gap-2 rounded-control bg-wait-tint px-3 py-2 text-[14px] leading-[22px] text-wait">
            <CirclePause aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
            <p>Assistant unavailable. Structured controls are active.</p>
          </div>
          <p className="text-[14px] leading-[22px] text-ink-2">
            The assistant is unavailable right now. You can continue with the controls below. Nothing has been lost.
            {detail ? ` ${detail}` : ""}
          </p>
        </div>
      ) : null}

      {turns.length === 0 && !pending ? (
        <p className="max-w-[68ch] text-[15px] leading-[24px] text-ink">{WELCOME[role]}</p>
      ) : (
        <ChatThread turns={turns} pending={pending} role={role} workspaceId={workspaceId} data={data} ctx={ctx} className="max-h-[60vh] pr-1" />
      )}

      {mode === "chat" ? (
        <>
          {!loaded ? <Skeleton className="h-11" /> : null}
          {loaded && turns.length === 0 && !pending ? <SuggestionChips role={role} onPick={(text) => void send(text)} /> : null}
          {notice ? <BlockedNotice code="MESSAGE" title="Message not sent" detail={notice} tone="wait" /> : null}
          <ChatComposer onSend={(text) => void send(text)} busy={pending !== null} disabled={!loaded} />
          <button type="button" className={quiet} onClick={() => setMode("manual")}>
            Use structured controls
          </button>
        </>
      ) : (
        <>
          {mode === "manual" ? <h4 className="text-[15px] leading-[22px] font-semibold text-ink">Structured controls</h4> : null}
          {structured}
          {mode === "fault" ? (
            <button type="button" className={quiet} onClick={() => setReload((n) => n + 1)}>
              Try the assistant again
            </button>
          ) : (
            <button type="button" className={quiet} onClick={() => setMode("chat")}>
              Back to the assistant
            </button>
          )}
        </>
      )}
    </div>
  );
}
