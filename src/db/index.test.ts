import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDbErrorMessage,
  handleIdlePoolError,
  isTransientDbError,
  withDbRetry,
} from './index.ts';

test('isTransientDbError recognizes idle connection termination and PG transient codes', () => {
  assert.equal(
    isTransientDbError(new Error('Connection terminated unexpectedly')),
    true
  );
  assert.equal(
    isTransientDbError({ code: '57P01', message: 'terminating connection due to administrator command' }),
    true
  );
  assert.equal(
    isTransientDbError({ code: 'ECONNRESET', message: 'read ECONNRESET' }),
    true
  );
  assert.equal(
    isTransientDbError(
      Object.assign(new Error('Wrapped query error'), {
        cause: new Error('Connection terminated unexpectedly'),
      })
    ),
    true
  );
});

test('isTransientDbError does not treat application constraint/syntax errors as transient', () => {
  assert.equal(
    isTransientDbError({ code: '23505', message: 'duplicate key value violates unique constraint' }),
    false
  );
  assert.equal(isTransientDbError(null), false);
});

test('handleIdlePoolError ignores transient idle disconnects without logging errors', () => {
  const warnings: string[] = [];
  const outcome = handleIdlePoolError(
    new Error('Connection terminated unexpectedly'),
    (msg) => warnings.push(msg)
  );
  assert.equal(outcome, 'ignored_transient');
  assert.deepEqual(warnings, []);
});

test('handleIdlePoolError logs concise warning message for non-transient idle pool errors', () => {
  const warnings: string[] = [];
  const err = Object.assign(new Error('Unexpected protocol failure'), {
    _events: { error: () => {} },
    _connectionError: false,
  });
  const outcome = handleIdlePoolError(err, (msg) => warnings.push(msg));
  assert.equal(outcome, 'warned');
  assert.deepEqual(warnings, ['SQL pool idle client warning: Unexpected protocol failure']);
});

test('formatDbErrorMessage safely formats Errors, objects, and primitives', () => {
  assert.equal(formatDbErrorMessage(new Error('Connection reset')), 'Connection reset');
  assert.equal(formatDbErrorMessage({ message: 'Pool closed' }), 'Pool closed');
  assert.equal(formatDbErrorMessage('Timeout'), 'Timeout');
});

test('withDbRetry retries transient connection failures and resolves when recovered', async () => {
  let attempts = 0;
  const result = await withDbRetry(async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new Error('Connection terminated unexpectedly');
    }
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(attempts, 2);
});

test('withDbRetry fails fast on non-transient errors without retrying', async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      withDbRetry(async () => {
        attempts += 1;
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }),
    /duplicate key/
  );
  assert.equal(attempts, 1);
});
