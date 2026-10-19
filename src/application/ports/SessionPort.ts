import type { ActorRole } from "@/domain/events/DomainEvent";
import type { RealInstant } from "@/domain/time/Instant";

export interface SessionRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly role: ActorRole;
  readonly expiresAt: RealInstant;
}

/** Sesiones de servidor (BUILD_PROMPT 14.1): token aleatorio de 256 bits; en la base, solo su hash con pepper. */
export interface SessionPort {
  issue(input: { readonly workspaceId: string; readonly actorId: string; readonly role: ActorRole; readonly ttlHours: number }): Promise<{ readonly token: string; readonly session: SessionRecord }>;
  /** Sesión vigente (hora real, no revocada) para el token; null si no existe. */
  resolve(token: string): Promise<SessionRecord | null>;
  revoke(sessionId: string): Promise<void>;
}

/** Límite de uso por ventana fija, con hora real. */
export interface RateLimiterPort {
  hit(key: string, windowSeconds: number, limit: number): Promise<{ readonly allowed: boolean; readonly count: number; readonly retryAfterSeconds: number }>;
}

/** Verifica el código de evaluación del jurado en tiempo constante. */
export interface AccessCodePort {
  verify(code: string): boolean;
}
