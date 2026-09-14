import { describe, expect, it } from "vitest";
import { estimateTotalCents, formatMoney, splitInstallments } from "./quote.js";

// Базові (happy path) тести. Навмисно неповні — розширення покриття
// це і є ваш перший промпт з cookbook (Task A).

describe("estimateTotalCents", () => {
  it("рахує суму без знижки", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000 })).toBe(50000);
  });

  it("застосовує знижку", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 10 })).toBe(45000);
  });

  it("знижка 0% не змінює суму (явний аргумент)", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 0 })).toBe(50000);
  });

  it("знижка 100% занулює суму", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 100 })).toBe(0);
  });

  it("дробові години рахуються коректно", () => {
    expect(estimateTotalCents({ hours: 2.5, rateCents: 10000 })).toBe(25000);
  });

  it("округлює дробовий результат після знижки", () => {
    // 10 * 999 = 9990; знижка 33% -> 9990 - 3296.7 = 6693.3 -> round(6693.3) = 6693
    expect(estimateTotalCents({ hours: 10, rateCents: 999, discountPercent: 33 })).toBe(6693);
  });

  it("0 годин дає 0", () => {
    expect(estimateTotalCents({ hours: 0, rateCents: 5000 })).toBe(0);
  });

  it("нульова ставка дає 0 незалежно від годин і знижки", () => {
    expect(estimateTotalCents({ hours: 40, rateCents: 0, discountPercent: 20 })).toBe(0);
  });
});

describe("splitInstallments", () => {
  it("ділить суму, що ділиться націло", () => {
    expect(splitInstallments(90000, 3)).toEqual([30000, 30000, 30000]);
  });

  it("1 платіж повертає всю суму", () => {
    expect(splitInstallments(12345, 1)).toEqual([12345]);
  });

  // ДЕФЕКТ: кожен платіж округлюється незалежно, тому сума масиву
  // може НЕ дорівнювати totalCents — клієнт або недоплатить, або
  // виконавець недоотримає різницю в кілька центів.
  it("сума платежів має дорівнювати totalCents навіть при округленні", () => {
    const total = 100; // 100 центів / 3 = 33.33... на платіж
    const parts = splitInstallments(total, 3);
    const sum = parts.reduce((a, b) => a + b, 0);
    expect(sum).toBe(total); // FAILS зараз: [33, 33, 33] = 99, не 100
  });

  it("сума платежів коректна для іншого проблемного випадку", () => {
    const total = 10000; // /3 = 3333.33...
    const parts = splitInstallments(total, 3);
    const sum = parts.reduce((a, b) => a + b, 0);
    expect(sum).toBe(total); // FAILS зараз: 3333*3 = 9999
  });

  it("детерміновано розподіляє залишок по одному центу починаючи з перших платежів", () => {
    // 10 / 4 = 2.5 -> base 2, залишок 2 центи -> перші 2 платежі отримують +1
    expect(splitInstallments(10, 4)).toEqual([3, 3, 2, 2]);
    // повторний виклик з тим самим входом дає той самий результат (детермінізм)
    expect(splitInstallments(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it("коректно ділить, коли parts більше за totalCents", () => {
    const total = 100;
    const parts = splitInstallments(total, 250);
    expect(parts).toHaveLength(250);
    const sum = parts.reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
    // перші 100 платежів по 1 центу, решта — 0
    expect(parts.slice(0, 100).every((p) => p === 1)).toBe(true);
    expect(parts.slice(100).every((p) => p === 0)).toBe(true);
  });

  it("коректно ділить від'ємну суму (сума платежів дорівнює totalCents)", () => {
    const total = -100;
    const parts = splitInstallments(total, 3);
    const sum = parts.reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
    expect(parts).toEqual([-34, -33, -33]);
  });

  // РЕГРЕС: production-інцидент — `RangeError: Invalid array length`.
  // `new Array(parts)` кидає RangeError, якщо parts дробове або від'ємне,
  // оскільки такі значення є невалідною довжиною масиву в JS.
  // Замість непрозорого RangeError маємо кидати зрозумілу помилку валідації.
  it("кидає явну помилку, якщо parts дробове число (репро RangeError)", () => {
    expect(() => splitInstallments(100, 2.5)).toThrow(/parts/i);
  });

  it("кидає явну помилку, якщо parts від'ємне (репро RangeError)", () => {
    expect(() => splitInstallments(100, -2)).toThrow(/parts/i);
  });

  // РЕГРЕС: production-інцидент — платіжний план порожній при ненульовій сумі.
  // При parts = 0 попередня реалізація ділила на нуль (Infinity/NaN) і
  // повертала new Array(0) без жодної помилки — [] замість платежів.
  it("кидає явну помилку, якщо parts дорівнює 0 (репро порожнього плану)", () => {
    expect(() => splitInstallments(100, 0)).toThrow(/parts/i);
  });

  it("кидає явну помилку, якщо parts не є цілим числом (наприклад NaN)", () => {
    expect(() => splitInstallments(100, Number.NaN)).toThrow(/parts/i);
  });

  // РЕГРЕС: знайдено рев'ю (prompts/review-changes.md) — дробовий totalCents
  // мовчки "губив" центи (сума платежів розходилась із вихідною сумою без
  // жодної помилки). Закрито через prompts/debug-quote.md.
  it("кидає явну помилку, якщо totalCents не ціле число центів", () => {
    expect(() => splitInstallments(100.5, 3)).toThrow(/totalCents/i);
  });

  // РЕГРЕС: знайдено рев'ю — дуже велика кількість платежів валила процес
  // нативним RangeError або вичерпувала пам'ять (parts не мав верхньої межі).
  it("кидає явну помилку замість нативного RangeError/OOM при надмірній кількості платежів", () => {
    expect(() => splitInstallments(100, 5_000_000_000)).toThrow(/parts/i);
  });

  it("не кидає помилку рівно на межі MAX_INSTALLMENT_PARTS (100_000)", () => {
    const parts = splitInstallments(100_000, 100_000);
    expect(parts).toHaveLength(100_000);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100_000);
  });

  it("нульова сума розподіляється як масив нулів (сума = 0)", () => {
    expect(splitInstallments(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("кидає явну помилку, якщо від'ємний totalCents дробовий", () => {
    expect(() => splitInstallments(-100.5, 3)).toThrow(/totalCents/i);
  });
});

describe("formatMoney", () => {
  it("форматує центи", () => {
    expect(formatMoney(123450)).toBe("$1,234.50");
  });

  it("форматує нуль", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("форматує від'ємну суму", () => {
    expect(formatMoney(-500)).toBe("-$5.00");
  });

  it("доповнює дробову частину нулем зліва", () => {
    expect(formatMoney(105)).toBe("$1.05");
  });

  it("форматує суми з роздільником тисяч", () => {
    expect(formatMoney(100000000)).toBe("$1,000,000.00");
  });

  it("форматує невелику від'ємну суму (менше долара)", () => {
    expect(formatMoney(-5)).toBe("-$0.05");
  });
});
