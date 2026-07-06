import assert from "node:assert/strict";
import test from "node:test";
import { assertCronAuthorized } from "../api/_lib/cron-auth.js";
import { assertFallbackStoreAllowed } from "../api/_lib/fallback-store.js";
import { readJson } from "../api/_lib/http.js";
import { validateStaffPassword, validateWorkerPassword } from "../api/_lib/password-policy.js";
import { safeCsvCell } from "../api/_lib/reports.js";
import { getSessionSecret } from "../api/_lib/auth.js";
import { getWorkerSessionSecret } from "../api/_lib/worker-auth.js";
import {
  assertWorkerSignOutAuthorized,
  createWorkerSignOutToken,
} from "../api/_lib/signins.js";

const UUID_ONE = "11111111-1111-4111-8111-111111111111";
const UUID_TWO = "22222222-2222-4222-8222-222222222222";

test("session helpers require SESSION_SECRET and do not fall back to cron secrets", () => {
  withEnv({ SESSION_SECRET: "", CRON_SECRET: "cron-only" }, () => {
    assert.throws(() => getSessionSecret(), /Missing SESSION_SECRET/);
    assert.throws(() => getWorkerSessionSecret(), /Missing SESSION_SECRET/);
  });
  withEnv({ SESSION_SECRET: "session-secret", CRON_SECRET: "cron-secret" }, () => {
    assert.equal(getSessionSecret(), "session-secret");
    assert.equal(getWorkerSessionSecret(), "session-secret");
  });
});

test("cron auth rejects query string secrets and accepts bearer or cron headers", () => {
  withEnv({ SUPABASE_CRON_SECRET: "cron-secret", CRON_SECRET: "" }, () => {
    assert.throws(
      () => assertCronAuthorized(req({ url: "/api/cron/auto-reports?secret=cron-secret" })),
      /Cron request is not authorized/,
    );
    assert.doesNotThrow(() =>
      assertCronAuthorized(req({ headers: { authorization: "Bearer cron-secret" } })),
    );
    assert.doesNotThrow(() =>
      assertCronAuthorized(req({ headers: { "x-cron-secret": "cron-secret" } })),
    );
  });
});

test("password policies reject blank and short new passwords", () => {
  assert.throws(() => validateStaffPassword("short"), /12 characters/);
  assert.throws(() => validateStaffPassword("            "), /12 characters/);
  assert.doesNotThrow(() => validateStaffPassword("long-enough-12"));
  assert.throws(() => validateWorkerPassword("short"), /8 characters/);
  assert.doesNotThrow(() => validateWorkerPassword("worker-8"));
});

test("worker sign-out tokens must match requested sign-in ids", () => {
  withEnv({ SESSION_SECRET: "session-secret" }, () => {
    const token = createWorkerSignOutToken(UUID_ONE);
    assert.doesNotThrow(() => assertWorkerSignOutAuthorized([UUID_ONE], token));
    assert.throws(
      () => assertWorkerSignOutAuthorized([UUID_TWO], token),
      /does not match/,
    );
    assert.throws(
      () => assertWorkerSignOutAuthorized([UUID_ONE], "bad-token"),
      /not valid/,
    );
  });
});

test("readJson enforces explicit body size limits", async () => {
  await assert.rejects(
    () => readJson(streamReq(["{\"a\":\"", "too-large", "\"}"]), { limitBytes: 8 }),
    (error) => error.statusCode === 413,
  );
  assert.deepEqual(
    await readJson(streamReq(["{\"ok\":true}"]), { limitBytes: 100 }),
    { ok: true },
  );
});

test("CSV cells are neutralized before spreadsheet export", () => {
  assert.equal(safeCsvCell("=1+1"), "'=1+1");
  assert.equal(safeCsvCell("+SUM(A:A)"), "'+SUM(A:A)");
  assert.equal(safeCsvCell("-2+3"), "'-2+3");
  assert.equal(safeCsvCell("@cmd"), "'@cmd");
  assert.equal(safeCsvCell("plain"), "plain");
});

test("fallback store is disabled in production", () => {
  withEnv({ NODE_ENV: "production", DISABLE_FALLBACK_STORE: "" }, () => {
    assert.throws(() => assertFallbackStoreAllowed(), /disabled/);
  });
});

function req({ url = "/api/cron/auto-reports", headers = {} } = {}) {
  return {
    url,
    headers: {
      host: "example.test",
      ...headers,
    },
  };
}

function streamReq(chunks) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function withEnv(values, callback) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    return callback();
  } finally {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}
