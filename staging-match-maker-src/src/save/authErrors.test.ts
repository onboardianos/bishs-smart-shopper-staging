import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAuthError, mapRpcError } from './authErrors.ts';

describe('mapAuthError', () => {
  it('maps expired OTPs', () => {
    const e = mapAuthError({ code: 'otp_expired', message: 'Token has expired' });
    assert.equal(e.code, 'expired');
    assert.match(e.message, /expired/i);
  });
  it('maps invalid / consumed tokens without sounding like a crash', () => {
    const e = mapAuthError({ message: 'Token has expired or is invalid' });
    assert.equal(e.code, 'invalid');
    assert.doesNotMatch(e.message, /Token has expired or is invalid/);
  });
  it('maps rate limits', () => {
    const e = mapAuthError({ code: 'over_email_send_rate_limit', status: 429 });
    assert.equal(e.code, 'rate_limited');
    assert.match(e.message, /Wait a minute/i);
  });
});

describe('mapRpcError', () => {
  it('refuses staff accounts in plain language', () => {
    const e = mapRpcError({ message: 'staff accounts cannot save shopper progress' });
    assert.equal(e.code, 'staff');
  });
});
