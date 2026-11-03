import test from "node:test";
import assert from "node:assert/strict";
import {
  startGoogleLogin,
  completeGoogleCallback,
} from "../lib/google-auth.ts";
function fakeAuth(
  exchange = async () => ({
    data: { session: { user: { id: "A" } } },
    error: null,
  }),
) {
  return {
    signInWithOAuth: async () => ({ data: {}, error: null }),
    exchangeCodeForSession: exchange,
  };
}
test("Google usa el callback del origen actual y no requiere correo ni contraseña", async () => {
  const auth = fakeAuth();
  let request;
  auth.signInWithOAuth = async (value) => {
    request = value;
    return { data: {}, error: null };
  };
  await startGoogleLogin(auth, "https://planner.vercel.app");
  assert.equal(request.provider, "google");
  assert.equal(
    request.options.redirectTo,
    "https://planner.vercel.app/auth/callback",
  );
  assert.equal(request.options.queryParams.prompt, "select_account");
});
test("un error al iniciar OAuth se informa al usuario", async () => {
  const auth = fakeAuth();
  auth.signInWithOAuth = async () => ({
    data: {},
    error: { message: "private detail" },
  });
  await assert.rejects(
    startGoogleLogin(auth, "http://localhost:3000"),
    /No se pudo iniciar/,
  );
});
test("el callback intercambia el código exactamente una vez con dos efectos React", async () => {
  let calls = 0;
  const auth = fakeAuth(async (code) => {
    assert.equal(code, "one-use-code");
    calls++;
    return { data: { session: { user: { id: "A" } } }, error: null };
  });
  await Promise.all([
    completeGoogleCallback(
      auth,
      "https://app.test/auth/callback?code=one-use-code",
    ),
    completeGoogleCallback(
      auth,
      "https://app.test/auth/callback?code=one-use-code",
    ),
  ]);
  assert.equal(calls, 1);
});
test("cancelación o callback sin código no intenta crear una sesión", async () => {
  let calls = 0;
  const auth = fakeAuth(async () => {
    calls++;
    return { data: { session: {} }, error: null };
  });
  await assert.rejects(
    completeGoogleCallback(
      auth,
      "https://app.test/auth/callback?error=access_denied&error_description=untrusted",
    ),
    /cancelado/,
  );
  await assert.rejects(
    completeGoogleCallback(auth, "https://app.test/auth/callback"),
    /código/,
  );
  assert.equal(calls, 0);
});
test("código vencido o sesión ausente no se interpreta como login exitoso", async () => {
  await assert.rejects(
    completeGoogleCallback(
      fakeAuth(async () => ({
        data: { session: null },
        error: { message: "expired" },
      })),
      "https://app.test/auth/callback?code=old",
    ),
    /volvé a ingresar/,
  );
  await assert.rejects(
    completeGoogleCallback(
      fakeAuth(async () => ({ data: { session: null }, error: null })),
      "https://app.test/auth/callback?code=empty",
    ),
    /volvé a ingresar/,
  );
});
