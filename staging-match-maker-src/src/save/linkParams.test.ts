import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasConfirmableLink, parseLinkParams } from './linkParams.ts';

describe('parseLinkParams', () => {
  it('reads token_hash and type from the query', () => {
    const p = parseLinkParams('?state=save-link&token_hash=abc&type=signup', '');
    assert.deepEqual(p, { tokenHash: 'abc', type: 'signup', state: 'save-link' });
    assert.equal(hasConfirmableLink(p), true);
  });
  it('reads hash params when the query has only state', () => {
    const p = parseLinkParams('?state=save-link', '#token_hash=zzz&type=magiclink');
    assert.equal(p.tokenHash, 'zzz');
    assert.equal(p.type, 'magiclink');
    assert.equal(p.state, 'save-link');
  });
  it('does not look confirmable without a hash and type', () => {
    assert.equal(hasConfirmableLink(parseLinkParams('?state=save-link', '')), false);
  });
});
