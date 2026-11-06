import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function worker() {
  const listeners = {};
  const puts = [];
  const self = {
    location: { origin: "https://planner.test" },
    addEventListener: (type, callback) => {
      listeners[type] = callback;
    },
  };

  vm.runInNewContext(
    readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
    {
      self,
      URL,
      Response,
      fetch: async () => new Response("page", { status: 200 }),
      caches: {
        open: async () => ({ put: async (key) => puts.push(key) }),
        match: async () => undefined,
      },
    },
  );

  return { listeners, puts };
}

test("la PWA no intercepta ni cachea callbacks de autenticación", () => {
  const { listeners, puts } = worker();
  let intercepted = false;

  listeners.fetch({
    request: {
      url: "https://planner.test/auth/callback?code=one-use",
      method: "GET",
      mode: "navigate",
    },
    respondWith: () => {
      intercepted = true;
    },
  });
  assert.equal(intercepted, false);
  assert.deepEqual(puts, []);
});

test("solo la navegación raíz sin parámetros actualiza el shell offline", async () => {
  const { listeners, puts } = worker();

  for (const path of ["/?code=unexpected", "/", "/other"]) {
    let response;
    const pending = [];

    listeners.fetch({
      request: {
        url: "https://planner.test" + path,
        method: "GET",
        mode: "navigate",
      },
      respondWith: (p) => (response = p),
      waitUntil: (p) => pending.push(p),
    });
    await response;
    await Promise.all(pending);
  }
  assert.deepEqual(puts, ["/"]);
});
