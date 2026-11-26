import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BULK_ORDER_STATUSES,
  areAllVisibleOrdersSelected,
  areSomeVisibleOrdersSelected,
  getSelectedVisibleOrderIds,
  pruneSelectedOrderIds,
  toggleOrderSelection,
  toggleSelectAllVisibleOrders,
} from './bulkOrderActions';

const sampleOrders = [{ id: 'ord-1' }, { id: 'ord-2' }, { id: 'ord-3' }];

test('BULK_ORDER_STATUSES includes Ready for Shipping and core stages', () => {
  assert.ok(BULK_ORDER_STATUSES.includes('Ready for Shipping'));
  assert.ok(BULK_ORDER_STATUSES.includes('Confirmed'));
  assert.ok(BULK_ORDER_STATUSES.includes('Shipped'));
  assert.ok(BULK_ORDER_STATUSES.includes('Completed'));
});

test('toggleOrderSelection adds and removes individual order IDs', () => {
  const afterAdd = toggleOrderSelection([], 'ord-1');
  assert.deepEqual(afterAdd, ['ord-1']);

  const afterSecond = toggleOrderSelection(afterAdd, 'ord-2');
  assert.deepEqual(afterSecond, ['ord-1', 'ord-2']);

  const afterRemove = toggleOrderSelection(afterSecond, 'ord-1');
  assert.deepEqual(afterRemove, ['ord-2']);
});

test('pruneSelectedOrderIds removes IDs no longer in active orders and deduplicates', () => {
  const pruned = pruneSelectedOrderIds(['ord-1', 'ord-removed', 'ord-1', 'ord-3'], sampleOrders);
  assert.deepEqual(pruned, ['ord-1', 'ord-3']);
});

test('selection predicates detect empty, partial, and full selection accurately', () => {
  assert.equal(areAllVisibleOrdersSelected([], sampleOrders), false);
  assert.equal(areSomeVisibleOrdersSelected([], sampleOrders), false);

  assert.equal(areAllVisibleOrdersSelected(['ord-1'], sampleOrders), false);
  assert.equal(areSomeVisibleOrdersSelected(['ord-1'], sampleOrders), true);

  assert.equal(areAllVisibleOrdersSelected(['ord-1', 'ord-2', 'ord-3'], sampleOrders), true);
  assert.equal(areSomeVisibleOrdersSelected(['ord-1', 'ord-2', 'ord-3'], sampleOrders), false);

  assert.equal(areAllVisibleOrdersSelected(['ord-1'], []), false);
  assert.equal(areSomeVisibleOrdersSelected(['ord-1'], []), false);
});

test('toggleSelectAllVisibleOrders selects all visible when partial/none and deselects visible when all selected', () => {
  const visible = [{ id: 'ord-1' }, { id: 'ord-2' }];
  // Preserve hidden selection ord-3 while selecting visible ord-1 and ord-2
  const selectedAll = toggleSelectAllVisibleOrders(['ord-3', 'ord-1'], visible);
  assert.deepEqual(selectedAll, ['ord-3', 'ord-1', 'ord-2']);

  // Deselects only visible orders when all visible orders are already selected
  const clearedVisible = toggleSelectAllVisibleOrders(selectedAll, visible);
  assert.deepEqual(clearedVisible, ['ord-3']);

  assert.deepEqual(getSelectedVisibleOrderIds(selectedAll, visible), ['ord-1', 'ord-2']);
});
