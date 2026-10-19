// Redacción de payloads de eventos y registros (BUILD_PROMPT 14.1): sin secretos y con cuentas enmascaradas.

const SECRET_KEY = /token|secret|password|passwd|api[_-]?key|authorization|cookie|pepper|connection|credential|access[_-]?code/i;
const SECRET_VALUE = /(sk-ant-[A-Za-z0-9_-]+|postgres(?:ql)?:\/\/\S+|Bearer\s+[A-Za-z0-9._-]+)/g;
// 10 o más dígitos, con espacios o guiones entre ellos: números de cuenta o tarjeta.
const LONG_NUMBER = /\d(?:[\s-]?\d){9,}/g;

/** Enmascara un número largo dejando solo los 4 últimos dígitos. */
export function maskDigits(text: string): string {
  return text.replace(LONG_NUMBER, (match) => `•••• ${match.replace(/\D/g, "").slice(-4)}`);
}

export function redactString(text: string): string {
  return maskDigits(text.replace(SECRET_VALUE, "[redacted]"));
}

/** Copia profunda redactada. Las claves `minor` (unidades menores de dinero) no se enmascaran. */
export function redact<T>(value: T): T {
  return walk(value, "") as T;
}

function walk(value: unknown, key: string): unknown {
  if (value === null || value === undefined) return value;
  if (SECRET_KEY.test(key)) return "[redacted]";
  if (typeof value === "string") return key === "minor" ? value : redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((item) => walk(item, key));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = walk(v, k);
    return out;
  }
  return value;
}
