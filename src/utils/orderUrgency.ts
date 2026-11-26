export const NEW_ORDER_OVERDUE_MS = 24 * 60 * 60 * 1000;

export function isOrderOverdueNew(
  order: { status?: string; createdAt?: string },
  nowMs = Date.now()
): boolean {
  if (String(order?.status || '') !== 'New') return false;
  if (!order?.createdAt) return false;
  const createdMs = Date.parse(String(order.createdAt));
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs > NEW_ORDER_OVERDUE_MS;
}

export function formatOverdueNewDuration(
  createdAt?: string,
  nowMs = Date.now()
): string {
  if (!createdAt) return 'Overdue >24h';
  const createdMs = Date.parse(String(createdAt));
  if (!Number.isFinite(createdMs)) return 'Overdue >24h';
  const elapsedMs = Math.max(0, nowMs - createdMs);
  const totalHours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (totalHours < 24) return 'Overdue >24h';
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (days >= 1) {
    return remHours > 0 ? `Overdue · ${days}d ${remHours}h` : `Overdue · ${days}d`;
  }
  return `Overdue · ${totalHours}h`;
}
