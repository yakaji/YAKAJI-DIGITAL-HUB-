import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEW_ORDER_OVERDUE_MS,
  formatOverdueNewDuration,
  isOrderOverdueNew,
} from './orderUrgency';

const BASE_NOW = Date.parse('2026-11-25T12:00:00.000Z');

test('isOrderOverdueNew returns false for New orders at or under 24 hours', () => {
  const under24h = new Date(BASE_NOW - (NEW_ORDER_OVERDUE_MS - 60_000)).toISOString();
  const exact24h = new Date(BASE_NOW - NEW_ORDER_OVERDUE_MS).toISOString();

  assert.equal(isOrderOverdueNew({ status: 'New', createdAt: under24h }, BASE_NOW), false);
  assert.equal(isOrderOverdueNew({ status: 'New', createdAt: exact24h }, BASE_NOW), false);
});

test('isOrderOverdueNew returns true for New orders older than 24 hours', () => {
  const over24h = new Date(BASE_NOW - (NEW_ORDER_OVERDUE_MS + 60_000)).toISOString();
  const over36h = new Date(BASE_NOW - 36 * 60 * 60 * 1000).toISOString();

  assert.equal(isOrderOverdueNew({ status: 'New', createdAt: over24h }, BASE_NOW), true);
  assert.equal(isOrderOverdueNew({ status: 'New', createdAt: over36h }, BASE_NOW), true);
});

test('isOrderOverdueNew returns false for non-New orders regardless of age', () => {
  const old72h = new Date(BASE_NOW - 72 * 60 * 60 * 1000).toISOString();
  for (const status of ['Confirmed', 'Processing', 'Ready for Shipping', 'Shipped', 'Completed', 'Cancelled']) {
    assert.equal(isOrderOverdueNew({ status, createdAt: old72h }, BASE_NOW), false);
  }
});

test('isOrderOverdueNew handles missing or invalid createdAt safely', () => {
  assert.equal(isOrderOverdueNew({ status: 'New', createdAt: '' }, BASE_NOW), false);
  assert.equal(isOrderOverdueNew({ status: 'New', createdAt: 'not-a-date' }, BASE_NOW), false);
  assert.equal(isOrderOverdueNew({ status: 'New' }, BASE_NOW), false);
});

test('formatOverdueNewDuration formats day and hour durations cleanly', () => {
  const d1 = new Date(BASE_NOW - 24 * 60 * 60 * 1000).toISOString();
  const d36 = new Date(BASE_NOW - 36 * 60 * 60 * 1000).toISOString();
  assert.equal(formatOverdueNewDuration(d1, BASE_NOW), 'Overdue · 1d');
  assert.equal(formatOverdueNewDuration(d36, BASE_NOW), 'Overdue · 1d 12h');
});
