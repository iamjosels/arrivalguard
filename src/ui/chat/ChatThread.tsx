"use client";

import { useEffect, useRef } from "react";
import type { CaseViewDTO } from "@/application/dto/CaseDTO";
import type { ChatTurnDTO } from "@/application/dto/ChatDTO";
import { ThresholdMark } from "@/ui/brand";
import type { ReasonContext } from "@/ui/finance";
import { cn } from "@/ui/lib/cn";
import { ActivityChip } from "./ActivityChip";
import { AssistantText } from "./AssistantText";
import { ChatComponentCard } from "./ChatComponentCard";
import type { ChatRole } from "./labels";

// Hilo del chat (UI_UX 12): el agente sin burbuja con el símbolo a la izquierda, el usuario a la derecha sobre
// route-tint y las tarjetas del servidor a todo el ancho. El texto del modelo pasa por un markdown mínimo, sin HTML.

export interface ChatThreadProps {
  readonly turns: readonly ChatTurnDTO[];
  /** Mensaje enviado que todavía espera respuesta. */
  readonly pending?: string | null;
  readonly role: ChatRole;
  readonly workspaceId: string;
  readonly data: CaseViewDTO;
  readonly ctx?: ReasonContext;
  readonly className?: string;
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[68ch] rounded-control bg-route-tint px-3 py-2 text-[15px] leading-[22px] whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">
        <span className="sr-only">You: </span>
        {text}
      </p>
    </div>
  );
}

function AgentRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0">
        <ThresholdMark size={20} />
      </span>
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  );
}

export function ChatThread({ turns, pending = null, role, workspaceId, data, ctx, className }: ChatThreadProps) {
  const box = useRef<HTMLDivElement | null>(null);

  // Al llegar un turno nuevo, el final del hilo queda a la vista (solo el hilo se desplaza, no la página).
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [turns.length, pending]);

  return (
    <div ref={box} role="log" aria-live="polite" aria-label="Conversation with ArrivalGuard" tabIndex={0} className={cn("space-y-4 overflow-y-auto", className)}>
      {turns.map((turn) => (
        <div key={`${turn.conversationId}-${turn.turnIndex}`} className="space-y-3">
          <UserMessage text={turn.userText} />
          <AgentRow>
            {turn.activity.map((a, i) => (
              <ActivityChip key={`${a.tool}-${i}`} activity={a} ctx={ctx} />
            ))}
            {turn.text ? <AssistantText text={turn.text} /> : null}
            {turn.fallback ? <p className="max-w-[68ch] text-[14px] leading-[22px] text-ink-2">{turn.fallback.message}</p> : null}
          </AgentRow>
          {turn.components.map((component, i) => (
            <ChatComponentCard key={`${component.kind}-${i}`} component={component} role={role} workspaceId={workspaceId} data={data} ctx={ctx} />
          ))}
        </div>
      ))}
      {pending ? (
        <div className="space-y-3">
          <UserMessage text={pending} />
          <AgentRow>
            <ActivityChip working />
          </AgentRow>
        </div>
      ) : null}
    </div>
  );
}
