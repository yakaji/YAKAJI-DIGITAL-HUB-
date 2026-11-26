export const BULK_ORDER_STATUSES = [
  'New',
  'Confirmed',
  'Processing',
  'Ready for Shipping',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Completed',
  'Cancelled',
  'Returned',
  'Refunded',
] as const;

export type BulkOrderStatus = (typeof BULK_ORDER_STATUSES)[number];

export function toggleOrderSelection(selectedIds: string[], orderId: string): string[] {
  const cleanId = String(orderId || '').trim();
  if (!cleanId) return selectedIds;
  if (selectedIds.includes(cleanId)) {
    return selectedIds.filter((id) => id !== cleanId);
  }
  return [...selectedIds, cleanId];
}

export function pruneSelectedOrderIds<T extends { id: string }>(
  selectedIds: string[],
  activeOrders: ReadonlyArray<T>
): string[] {
  const validIds = new Set(activeOrders.map((order) => order.id));
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of selectedIds) {
    if (validIds.has(id) && !seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }
  return next;
}

export function getSelectedVisibleOrderIds<T extends { id: string }>(
  selectedIds: string[],
  visibleOrders: ReadonlyArray<T>
): string[] {
  const selectedSet = new Set(selectedIds);
  return visibleOrders.filter((order) => selectedSet.has(order.id)).map((order) => order.id);
}

export function areAllVisibleOrdersSelected<T extends { id: string }>(
  selectedIds: string[],
  visibleOrders: ReadonlyArray<T>
): boolean {
  if (!visibleOrders.length) return false;
  const selectedSet = new Set(selectedIds);
  return visibleOrders.every((order) => selectedSet.has(order.id));
}

export function areSomeVisibleOrdersSelected<T extends { id: string }>(
  selectedIds: string[],
  visibleOrders: ReadonlyArray<T>
): boolean {
  if (!visibleOrders.length) return false;
  const selectedSet = new Set(selectedIds);
  let selectedCount = 0;
  for (const order of visibleOrders) {
    if (selectedSet.has(order.id)) selectedCount++;
  }
  return selectedCount > 0 && selectedCount < visibleOrders.length;
}

export function toggleSelectAllVisibleOrders<T extends { id: string }>(
  selectedIds: string[],
  visibleOrders: ReadonlyArray<T>
): string[] {
  if (!visibleOrders.length) return selectedIds;
  const visibleIds = visibleOrders.map((order) => order.id);
  const visibleSet = new Set(visibleIds);
  if (areAllVisibleOrdersSelected(selectedIds, visibleOrders)) {
    return selectedIds.filter((id) => !visibleSet.has(id));
  }
  const merged = new Set(selectedIds);
  for (const id of visibleIds) {
    merged.add(id);
  }
  return [...merged];
}
