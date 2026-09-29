import { describe, it, expect } from "vitest";
import { escapeHtml, riskLabelText, reportTypeText, formatDate } from "./utils";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it("escapes ampersand", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Av. Corrientes 1000")).toBe("Av. Corrientes 1000");
  });
});

describe("riskLabelText", () => {
  it("translates all risk levels to es-AR", () => {
    expect(riskLabelText("critico")).toBe("Crítico");
    expect(riskLabelText("alto")).toBe("Alto");
    expect(riskLabelText("medio")).toBe("Medio");
    expect(riskLabelText("bajo")).toBe("Bajo");
    expect(riskLabelText("muy_bajo")).toBe("Muy bajo");
  });

  it("falls back to the raw value for unknown labels", () => {
    expect(riskLabelText("desconocido")).toBe("desconocido");
  });
});

describe("reportTypeText", () => {
  it("translates report types", () => {
    expect(reportTypeText("accidente")).toBe("Accidente");
    expect(reportTypeText("bache")).toBe("Bache");
    expect(reportTypeText("sin_senalizacion")).toBe("Sin señalización");
    expect(reportTypeText("animales")).toBe("Animales en ruta");
  });
});

describe("formatDate", () => {
  it("formats ISO date in es-AR", () => {
    const out = formatDate("2026-04-15T10:30:00Z");
    // Should include day, month, year, hour
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
