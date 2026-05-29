/**
 * Token cleanup store tests.
 *
 * Run: npm run build && node tests/token-cleanup.test.js
 */

const {
  createTokenCleanupStore,
  TokenCleanupStore,
} = require("../dist/index.js");

const results = { total: 0, passed: 0, failed: 0 };

function assert(name, condition) {
  results.total += 1;
  if (condition) {
    results.passed += 1;
    console.log(`✓ ${name}`);
    return;
  }

  results.failed += 1;
  console.error(`✗ ${name}`);
}

function assertThrows(name, fn) {
  try {
    fn();
    assert(name, false);
  } catch {
    assert(name, true);
  }
}

function run() {
  const now = Date.parse("2026-05-29T00:00:00.000Z");
  const store = createTokenCleanupStore({
    revokedTokenMaxAgeMs: 60_000,
  });

  store.upsert({ id: "active", expiresAt: now + 10_000 });
  store.upsert({ id: "expired", expiresAt: now - 1 });
  store.upsert({
    id: "fresh-revoked",
    expiresAt: now + 10_000,
    revokedAt: now - 30_000,
  });
  store.upsert({
    id: "old-revoked",
    expiresAt: now + 10_000,
    revokedAt: now - 60_000,
  });

  const cleanup = store.cleanup({ now });

  assert("removes one expired token", cleanup.expired === 1);
  assert("removes one stale revoked token", cleanup.revoked === 1);
  assert("reports total removed tokens", cleanup.total === 2);
  assert("keeps active and freshly revoked tokens", cleanup.remaining === 2);
  assert("active token is still present", Boolean(store.get("active")));
  assert("fresh revoked token is still present", Boolean(store.get("fresh-revoked")));
  assert("expired token is removed", !store.get("expired"));
  assert("old revoked token is removed", !store.get("old-revoked"));

  const secondCleanup = store.cleanup({ now });
  assert("cleanup is idempotent", secondCleanup.total === 0);

  let callbackResult = null;
  const callbackStore = new TokenCleanupStore({
    onCleanup: (result) => {
      callbackResult = result;
    },
  });
  callbackStore.upsert({ id: "callback-expired", expiresAt: now - 1 });
  callbackStore.cleanup({ now });
  assert("cleanup callback receives audit counts", callbackResult?.expired === 1);

  assertThrows("rejects empty ids", () => {
    store.upsert({ id: "", expiresAt: now });
  });
  assertThrows("rejects invalid expiration timestamps", () => {
    store.upsert({ id: "bad-expiry", expiresAt: Number.NaN });
  });
  assertThrows("rejects invalid cleanup intervals", () => {
    store.startAutoCleanup(0);
  });

  store.startAutoCleanup(60_000);
  store.stopAutoCleanup();
  assert("auto cleanup can start and stop", true);

  if (results.failed > 0) {
    console.error(`${results.failed}/${results.total} token cleanup tests failed`);
    process.exit(1);
  }

  console.log(`${results.passed}/${results.total} token cleanup tests passed`);
}

run();
