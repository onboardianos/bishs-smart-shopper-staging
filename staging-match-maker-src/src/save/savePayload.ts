// Build ss_save_progress arguments. Unit JSON must never include invoice/cost/margin keys.
export const FORBIDDEN_UNIT_KEYS = ['invoice', 'cost', 'costs', 'margin', 'gross', 'acv'] as const;
export const ANSWER_KEY = /^[a-z][a-z0-9_]{0,62}$/;
export const SS_REDIRECT = 'https://bishsos.com/staging-match-maker/?state=save-link';
export const APP_VERSION = 'staging-match-maker';

export type PublicUnit = Record<string, unknown>;

export function publicUnitJson(unit: Record<string, unknown> | null | undefined, stock: string): PublicUnit {
  const src: PublicUnit = unit ? { ...unit } : { stock };
  if (src.stock == null) src.stock = stock;
  for (const key of FORBIDDEN_UNIT_KEYS) delete src[key];
  return src;
}

/** ss_save_progress only allows lowercase answer keys, so camelCase becomes snake_case. */
export function toAnswerKey(key: string): string | null {
  const snake = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  return ANSWER_KEY.test(snake) ? snake : null;
}

export function answersToJson(answers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers || {})) {
    const safe = toAnswerKey(key);
    if (!safe) continue;
    out[safe] = value;
  }
  return out;
}

export function picksPayload(
  pins: string[],
  unitOf: (stock: string) => Record<string, unknown> | null,
): { rank: number; stock: string; unit: PublicUnit }[] {
  return pins.filter(Boolean).slice(0, 3).map((stock, i) => ({
    rank: i + 1,
    stock,
    unit: publicUnitJson(unitOf(stock), stock),
  }));
}

export function savedPayload(
  saved: string[],
  unitOf: (stock: string) => Record<string, unknown> | null,
): { stock: string; unit: PublicUnit }[] {
  const seen = new Set<string>();
  const rows: { stock: string; unit: PublicUnit }[] = [];
  for (const stock of saved.filter(Boolean)) {
    if (seen.has(stock)) continue;
    seen.add(stock);
    rows.push({ stock, unit: publicUnitJson(unitOf(stock), stock) });
  }
  return rows;
}

export function stepsDone(answers: Record<string, unknown>): string[] {
  const done = answers?.done;
  return Array.isArray(done) ? done.filter((x) => typeof x === 'string') : [];
}
