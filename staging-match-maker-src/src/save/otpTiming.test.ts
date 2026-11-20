import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_WRONG_TRIES, RESEND_SECONDS, markCodeSent, recordWrongTry, resendWaitSeconds, triesLocked, wrongTries } from './otpTiming.ts';

function mem() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

describe('otpTiming', () => {
  it('counts down 60 seconds after a send', () => {
    const s = mem();
    const now = 1_000_000;
    markCodeSent(now, s);
    assert.equal(resendWaitSeconds(now, s), RESEND_SECONDS);
    assert.equal(resendWaitSeconds(now + 59_000, s), 1);
    assert.equal(resendWaitSeconds(now + 60_000, s), 0);
    assert.equal(wrongTries(s), 0);
  });
  it('locks after five wrong tries', () => {
    const s = mem();
    for (let i = 0; i < MAX_WRONG_TRIES; i++) recordWrongTry(s);
    assert.equal(wrongTries(s), 5);
    assert.equal(triesLocked(s), true);
    markCodeSent(Date.now(), s);
    assert.equal(triesLocked(s), false);
  });
});
