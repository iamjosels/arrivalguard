import { describe, expect, it } from "vitest";
import { maskDigits, redact } from "@/infrastructure/security/redact";

describe("Redacción de payloads (BUILD_PROMPT 14.1)", () => {
  it("enmascara números de cuenta o tarjeta y deja solo los 4 últimos dígitos", () => {
    expect(maskDigits("send it to 6222 0201 8800 4471 now")).toBe("send it to •••• 4471 now");
    expect(maskDigits("account 6222020188004471")).toBe("account •••• 4471");
    expect(maskDigits("ref AG-STUDENT-01, 48 h")).toBe("ref AG-STUDENT-01, 48 h");
  });

  it("borra valores con forma de secreto y claves sensibles", () => {
    const out = redact({
      note: "key sk-ant-api03-abcdef and postgresql://u:p@host/db",
      sessionToken: "abc",
      authorization: "Bearer x",
      evalAccessCode: "AG-1234",
      nested: [{ password: "x", value: "ok" }],
    });
    expect(out).toEqual({
      note: "key [redacted] and [redacted]",
      sessionToken: "[redacted]",
      authorization: "[redacted]",
      evalAccessCode: "[redacted]",
      nested: [{ password: "[redacted]", value: "ok" }],
    });
  });

  it("no toca las unidades menores de dinero aunque sean números largos", () => {
    expect(redact({ debit: { currency: "USD", minor: "123456789012" } })).toEqual({ debit: { currency: "USD", minor: "123456789012" } });
  });
});
