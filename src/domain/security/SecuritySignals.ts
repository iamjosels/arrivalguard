import type { SecurityCategory } from "../events/DomainEvent";

/**
 * Señales de ataque en un mensaje del usuario (BUILD_PROMPT 14.2). No son el control: el servidor ya impide el efecto
 * (ninguna herramienta cambia el receptor, aprueba, cambia límites ni revela secretos). Sirven para dejar un
 * SECURITY_BLOCK con su categoría oficial en la bitácora y mostrar el aviso. Son conservadoras para no rotular
 * preguntas normales.
 */
export interface SecuritySignal {
  readonly category: SecurityCategory;
  readonly reason: "NEW_DESTINATION" | "CLAIMED_APPROVAL" | "INSTRUCTION_OVERRIDE" | "SECRET_REQUEST" | "FULL_ACCOUNT_NUMBER";
}

const MOVE = /\b(send|pay|transfer|wire|move|deposit|route|redirect|execute)\b/i;
const NEW_DESTINATION = /\b(new|other|another|different|this)\s+(bank\s+)?(account|acct|iban|card|recipient|beneficiary)\b|\baccount\s+(ending|number|no\.?)\s*[:#]?\s*\d{4,}|\b\d(?:[\s-]?\d){7,}\b/i;
const CLAIMED_APPROVAL = /\b(already|has|have)\s+(approved|authori[sz]ed|signed)\b|\b(dad|father|mom|mother|parent|carlos|payer)\s+(said|says|approved|authori[sz]ed|agreed|allows?|lets?)\b|\b(approve|authori[sz]e)\s+(it\s+)?(yourself|for\s+(him|her|them|me))\b|\bmay\s+approve\b/i;
const OVERRIDE = /\b(ignore|disregard|forget|bypass|override)\s+(all\s+|any\s+|your\s+|the\s+|previous\s+|prior\s+)*(instructions|rules|limits?|restrictions|policy|policies|guardrails|system prompt)\b|\byou\s+are\s+now\b|\bdeveloper\s+mode\b|\bjailbreak\b/i;
const SECRET = /\b(api[\s_-]?key|secret|session\s+token|access\s+token|auth(entication)?\s+token|password|connection\s+string|database\s+(url|password|credentials)|env(ironment)?\s+variables?|system\s+prompt|hidden\s+(config|configuration|instructions)|evaluation\s+code|access\s+code|pepper)\b/i;
const FULL_ACCOUNT = /\b(full|complete|entire|whole)\s+(account|card|iban)(\s+number)?\b|\b(all|every)\s+(the\s+)?digits\b/i;

export function detectSecuritySignals(text: string): SecuritySignal[] {
  const signals: SecuritySignal[] = [];
  if (MOVE.test(text) && NEW_DESTINATION.test(text)) signals.push({ category: "INDUCED_TRANSFER", reason: "NEW_DESTINATION" });
  if (CLAIMED_APPROVAL.test(text)) signals.push({ category: "INDUCED_TRANSFER", reason: "CLAIMED_APPROVAL" });
  if (OVERRIDE.test(text)) signals.push({ category: "PROMPT_INJECTION", reason: "INSTRUCTION_OVERRIDE" });
  if (SECRET.test(text)) signals.push({ category: "DATA_EXTRACTION", reason: "SECRET_REQUEST" });
  if (FULL_ACCOUNT.test(text)) signals.push({ category: "DATA_EXTRACTION", reason: "FULL_ACCOUNT_NUMBER" });
  return signals;
}
