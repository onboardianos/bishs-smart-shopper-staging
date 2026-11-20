import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accountInitials, completedSmartShopper, formatMatchCount, matchCountLabel, welcomeHeading } from './matchesUnlock.ts';

describe('welcomeHeading', () => {
  it('uses the first name when it is known', () => {
    assert.equal(welcomeHeading('Jamie'), 'Welcome, Jamie.');
  });
  it('uses a friendly fallback with no fake name', () => {
    assert.equal(welcomeHeading(''), 'Welcome.');
    assert.equal(welcomeHeading('   '), 'Welcome.');
    assert.equal(welcomeHeading(null), 'Welcome.');
    assert.doesNotMatch(welcomeHeading(''), /Alex|Robert|Jackson/i);
  });
});

describe('accountInitials', () => {
  it('prefers name initials and otherwise uses the email, never a fake AM', () => {
    assert.equal(accountInitials('Jamie', 'Lee', 'x@example.com'), 'JL');
    assert.equal(accountInitials('', '', 'shopper@example.com'), 'S');
    assert.equal(accountInitials('', '', ''), '');
  });
});

describe('matchCountLabel', () => {
  it('formats the real engine total, with no stand-in numbers', () => {
    assert.equal(formatMatchCount(8255), '8,255');
    assert.equal(matchCountLabel(8255), '8,255 matching units');
    assert.equal(matchCountLabel(1), '1 matching unit');
    assert.equal(matchCountLabel(0), '0 matching units');
  });
});

describe('completedSmartShopper', () => {
  it('is false until the shopper finishes Smart Shopper', () => {
    assert.equal(completedSmartShopper({ done: [] }), false);
    assert.equal(completedSmartShopper({ done: ['01', '02', 'sleep'] }), false);
    assert.equal(completedSmartShopper(null), false);
  });
  it('is true after the last question or summary', () => {
    assert.equal(completedSmartShopper({ done: ['01', 'budget'] }), true);
    assert.equal(completedSmartShopper({ done: ['summary'] }), true);
  });
});
