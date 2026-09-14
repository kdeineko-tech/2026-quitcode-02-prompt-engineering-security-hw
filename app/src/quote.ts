/**
 * Розрахунок кошторису для проєкту автоматизації.
 * Усі суми — у центах (цілі числа), щоб уникнути похибок float.
 *
 * Це навчальний модуль-ціль для промптів з `prompts/`.
 * Він НАВМИСНЕ недосконалий — саме це ви і знайдете добре сформульованим
 * промптом з acceptance criteria (Task A).
 */

export interface QuoteInput {
  /** Оцінка робіт у годинах */
  hours: number;
  /** Ставка за годину, у центах (напр. 5000 = $50.00) */
  rateCents: number;
  /** Знижка у відсотках, 0..100 */
  discountPercent?: number;
}

/** Ціна проєкту в центах з урахуванням знижки. */
export function estimateTotalCents(input: QuoteInput): number {
  const { hours, rateCents, discountPercent = 0 } = input;
  const gross = hours * rateCents;
  const discount = (gross * discountPercent) / 100;
  return Math.round(gross - discount);
}

/**
 * Розподілити цілочисельний залишок `remainder` (у центах) по `parts`
 * базовим платежам розміром `base`.
 *
 * Повертає новий масив довжиною `parts`, де перші `Math.abs(remainder)`
 * елементів збільшені (або зменшені, якщо `remainder` від'ємний) на 1 —
 * так само детерміновано у прибутковому, як і у від'ємному випадку.
 * Чиста функція: не має побічних ефектів і не змінює вхідні дані.
 */
function distributeRemainderCents(
  base: number,
  parts: number,
  remainder: number,
): number[] {
  const result = new Array(parts).fill(base);
  const step = remainder > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(remainder); i++) {
    result[i] += step;
  }
  return result;
}

/**
 * Верхня межа кількості платежів. Обрана значно нижче ліміту довжини
 * масиву в рушії JS (2^32 - 1), щоб замінити непрозорий нативний
 * RangeError / вичерпання пам'яті зрозумілою помилкою валідації.
 * Знайдено рев'ю (`prompts/review-changes.md`) і закрито через
 * `prompts/debug-quote.md`.
 */
const MAX_INSTALLMENT_PARTS = 100_000;

/**
 * Розбити суму на `parts` платежів (у центах).
 * Повертає масив довжиною `parts`, сума елементів якого завжди
 * точно дорівнює `totalCents` (залишок від цілочисельного ділення
 * детерміновано розподіляється по одному центу, починаючи з перших
 * платежів — так само у прибутковому, так і у від'ємному totalCents).
 *
 * `totalCents` має бути цілим числом (центи): для дробового значення
 * залишок після `Math.trunc` теж стає дробовим, і сума платежів мовчки
 * розходиться з `totalCents` — тому такий вхід відхиляється явною помилкою.
 */
export function splitInstallments(totalCents: number, parts: number): number[] {
  if (!Number.isInteger(totalCents)) {
    throw new Error(
      `splitInstallments: "totalCents" must be an integer number of cents, отримано ${totalCents}`,
    );
  }
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(
      `splitInstallments: "parts" must be a positive integer, отримано ${parts}`,
    );
  }
  if (parts > MAX_INSTALLMENT_PARTS) {
    throw new Error(
      `splitInstallments: "parts" перевищує допустиму межу (${MAX_INSTALLMENT_PARTS}), отримано ${parts}`,
    );
  }
  const base = Math.trunc(totalCents / parts);
  const remainder = totalCents - base * parts;
  return distributeRemainderCents(base, parts, remainder);
}

/** Форматування центів у рядок на кшталт "$1,234.50". */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${frac}`;
}
