import type { SecurityCategory } from "../events/DomainEvent";

/**
 * Señales de ataque en un mensaje del usuario (BUILD_PROMPT 14.2). No son el control: el servidor ya impide el efecto
 * (ninguna herramienta cambia el receptor, aprueba, cambia límites ni revela secretos). Sirven para dejar un
 * SECURITY_BLOCK con su categoría oficial en la bitácora y mostrar el aviso. Son conservadoras: una pregunta normal del
 * flujo ("Has my dad approved it yet?", una fecha, "Is my password needed?") no se rotula (VC8). Además del inglés
 * reconocen patrones mínimos en español, portugués y chino, y el texto escondido en base64 (VC9-4).
 */
export interface SecuritySignal {
  readonly category: SecurityCategory;
  readonly reason: "NEW_DESTINATION" | "CLAIMED_APPROVAL" | "INSTRUCTION_OVERRIDE" | "SECRET_REQUEST" | "FULL_ACCOUNT_NUMBER";
}

const MOVE = /\b(send|pay|transfer|wire|move|deposit|route|redirect|execute)\b/i;
const NEW_DESTINATION_WORDS = /\b(new|other|another|different)\s+(bank\s+)?(account|acct|iban|card|recipient|beneficiary)\b|\baccount\s+(ending|number|no\.?)\s*[:#]?\s*\d{4,}/i;
const ACCOUNT_DIGITS = /\b\d(?:[\s-]?\d){9,}\b/;
// Fechas y horas no son números de cuenta.
const DATES_AND_TIMES = /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b|\b\d{1,2}[:.]\d{2}\b/g;
const CLAIMED_APPROVAL = /\b(already|has|have)\s+(approved|authori[sz]ed|signed)\b|\b(dad|father|mom|mother|parent|carlos|payer)\s+(said|says|approved|authori[sz]ed|agreed|allows?|lets?)\b|\b(approve|authori[sz]e)\s+(it\s+)?(yourself|for\s+(him|her|them|me))\b|\bmay\s+approve\b/i;
// Una pregunta sobre el estado ("Has Carlos approved it?") no afirma nada.
const QUESTION = /^\s*(has|have|did|does|do|is|was|were|can|could|will|would)\b[^.!]*\?\s*$/i;
const OVERRIDE = /\b(ignore|disregard|forget|bypass|override)\s+(all\s+|any\s+|your\s+|the\s+|previous\s+|prior\s+)*(instructions|rules|limits?|restrictions|policy|policies|guardrails|system prompt)\b|\byou\s+are\s+now\b|\bdeveloper\s+mode\b|\bjailbreak\b/i;
const SECRET_TERMS = String.raw`(api[\s_-]?key|secret|session\s+token|access\s+token|auth(entication)?\s+token|password|connection\s+string|database\s+(url|password|credentials)|env(ironment)?\s+variables?|system\s+prompt|hidden\s+(config|configuration|instructions)|evaluation\s+code|access\s+code|pepper)`;
// Pedir un secreto: un verbo de pedido o "what is" junto al término.
const SECRET_REQUEST = new RegExp(
  String.raw`\b(show|print|give|tell|reveal|send|share|display|dump|leak|list|output|repeat|expose)\b[^.?!]*\b` + SECRET_TERMS + String.raw`\b|\bwhat\s+(is|are)\s+(your|the)\b[^.?!]*\b` + SECRET_TERMS + String.raw`\b`,
  "i",
);
const FULL_ACCOUNT = /\b(full|complete|entire|whole)\s+(account|card|iban)(\s+number)?\b|\b(all|every)\s+(the\s+)?digits\b/i;

// Español, portugués y chino (VC9-4). \b no sirve con acentos ni con chino: se usan límites explícitos.
const MOVE_OTHER = /(^|[^\p{L}])(env[ií]a(lo|la)?|paga(lo)?|transfiere|transfere|manda(lo)?|deposita|pague|envie)([^\p{L}]|$)|转账|汇款|付款|支付|转到|汇到|打到/iu;
const NEW_DESTINATION_OTHER = /(cuenta|conta)\s+(nueva|nova)|(nueva|otra|nova|outra)\s+(cuenta|conta)|新(的)?(账户|账号|帐户)|另一个(账户|账号)|这个(账户|账号)/iu;
const CLAIMED_APPROVAL_OTHER =
  /(ya|j[aá])\s+(lo\s+|la\s+)?(aprob[oó]|autoriz[oó]|aprovou|autorizou)|(pap[aá]|padre|mam[aá]|madre|carlos|pai|m[aã]e)\s+(lo\s+)?(aprob[oó]|autoriz[oó]|aprovou|autorizou|dijo que s[ií]|disse que sim)|已经?(批准|同意|授权)|(批准|同意|授权)了/iu;
const OVERRIDE_OTHER =
  /(^|[^\p{L}])(ignora|ignore|olvida|omite|esquece|desconsidera)\s+[^.!?。！？]{0,30}(instrucciones|instru[cç][oõ]es|reglas|regras|l[ií]mites|restricciones|restri[cç][oõ]es)|(忽略|无视|忘记|不要理会)[^。！？]{0,20}(指令|规则|限制|提示|说明)|你现在是/iu;
const SECRET_OTHER =
  /(mu[eé]stra(me)?|dame|dime|imprime|revela|mostra|me\s+d[aá]|diga)[^.?!¿¡]{0,40}(clave\s+de\s+api|contrase[nñ]a|token|cadena\s+de\s+conexi[oó]n|prompt\s+del\s+sistema|chave\s+de\s+api|senha)|(显示|打印|告诉我|给我|泄露)[^。！？]{0,20}(系统提示|密钥|密码|令牌|配置)/iu;
// Una pregunta en otro idioma ("¿Ya aprobó Carlos?", "批准了吗？") no afirma nada.
const QUESTION_OTHER = /[¿?？]|吗\s*$/u;
// Tramos largos en base64: se decodifican y se vuelven a revisar, solo si el resultado es texto legible.
const BASE64_RUN = /[A-Za-z0-9+/]{24,}={0,2}/g;

function decodedRuns(text: string): string[] {
  const out: string[] = [];
  for (const run of text.match(BASE64_RUN) ?? []) {
    try {
      const decoded = atob(run.length % 4 === 0 ? run : run + "=".repeat(4 - (run.length % 4)));
      if (/^[\x20-\x7E\s]+$/.test(decoded) && /[a-z]{3,}\s+[a-z]{2,}/i.test(decoded)) out.push(decoded);
    } catch {
      // No era base64.
    }
  }
  return out;
}

export function detectSecuritySignals(text: string): SecuritySignal[] {
  const signals = signalsIn(text);
  for (const decoded of decodedRuns(text)) {
    for (const s of signalsIn(decoded)) if (!signals.some((x) => x.reason === s.reason)) signals.push(s);
  }
  return signals;
}

function signalsIn(text: string): SecuritySignal[] {
  const signals: SecuritySignal[] = [];
  const withoutDates = text.replace(DATES_AND_TIMES, " ");
  const moves = MOVE.test(text) || MOVE_OTHER.test(text);
  if (moves && (NEW_DESTINATION_WORDS.test(text) || NEW_DESTINATION_OTHER.test(text) || ACCOUNT_DIGITS.test(withoutDates))) signals.push({ category: "INDUCED_TRANSFER", reason: "NEW_DESTINATION" });
  if ((CLAIMED_APPROVAL.test(text) && !QUESTION.test(text)) || (CLAIMED_APPROVAL_OTHER.test(text) && !QUESTION_OTHER.test(text))) signals.push({ category: "INDUCED_TRANSFER", reason: "CLAIMED_APPROVAL" });
  if (OVERRIDE.test(text) || OVERRIDE_OTHER.test(text)) signals.push({ category: "PROMPT_INJECTION", reason: "INSTRUCTION_OVERRIDE" });
  if (SECRET_REQUEST.test(text) || SECRET_OTHER.test(text)) signals.push({ category: "DATA_EXTRACTION", reason: "SECRET_REQUEST" });
  if (FULL_ACCOUNT.test(text)) signals.push({ category: "DATA_EXTRACTION", reason: "FULL_ACCOUNT_NUMBER" });
  return signals;
}
