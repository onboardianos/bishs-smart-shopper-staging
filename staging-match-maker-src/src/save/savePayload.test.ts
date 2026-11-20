import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { answersToJson, picksPayload, publicUnitJson, savedPayload, stepsDone } from './savePayload.ts';

describe('publicUnitJson', () => {
  it('strips invoice, cost, and margin keys', () => {
    const unit = publicUnitJson({
      stock: '101251', year: 2024, invoice: 40000, cost: 38000, costs: { hold: 1 }, margin: 0.2, gross: 9, acv: 1, price: 74995,
    }, '101251');
    assert.equal(unit.stock, '101251');
    assert.equal(unit.price, 74995);
    for (const k of ['invoice', 'cost', 'costs', 'margin', 'gross', 'acv']) assert.equal(k in unit, false);
  });
  it('falls back to stock only', () => {
    assert.deepEqual(publicUnitJson(null, '100384'), { stock: '100384' });
  });
});

describe('answersToJson', () => {
  it('keeps legal keys and drops illegal ones', () => {
    const out = answersToJson({ stores: ['MID'], 'Bad Key': 1, sleepsMin: 2, fifthSub: ['fw'], done: ['01'] });
    assert.deepEqual(out, { stores: ['MID'], sleeps_min: 2, fifth_sub: ['fw'], done: ['01'] });
  });
});

describe('picks and saved', () => {
  const units = { '101251': { stock: '101251', invoice: 1, year: 2024 } };
  const unitOf = (s: string) => (units as Record<string, Record<string, unknown>>)[s] || null;
  it('ranks the first three pins and strips cost keys', () => {
    const picks = picksPayload(['101251', '', 'x', 'y'], unitOf);
    assert.equal(picks.length, 3);
    assert.equal(picks[0].rank, 1);
    assert.equal(picks[0].unit.year, 2024);
    assert.equal('invoice' in picks[0].unit, false);
    assert.equal(picks[1].stock, 'x');
  });
  it('unions saved stocks and lists steps done', () => {
    const saved = savedPayload(['a', 'a', 'b'], unitOf);
    assert.deepEqual(saved.map((s) => s.stock), ['a', 'b']);
    assert.deepEqual(stepsDone({ done: ['01', 2, 'budget'] }), ['01', 'budget']);
  });
});
