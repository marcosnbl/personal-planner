import test from "node:test";
import assert from "node:assert/strict";
import {
  accountStorageKey,
  SyncEngine,
  mergeLocalData,
} from "../lib/cloud-sync.ts";
const empty = () => ({ version: 2, workouts: [], templates: [] });
const doc = (title) => ({
  ...empty(),
  workouts: [
    {
      id: title,
      date: "2026-11-03",
      title,
      type: "run",
      status: "planned",
      plannedDistance: 10,
      actualDistance: 0,
      plannedDuration: 71,
      actualDuration: 0,
      plannedElevation: 0,
      actualElevation: 0,
    },
  ],
});
function server(initial = { revision: 0, document: empty() }) {
  let state = structuredClone(initial);
  let writes = 0;
  return {
    read: () => structuredClone(state),
    writes: () => writes,
    remote: {
      load: async () => structuredClone(state),
      save: async (document, revision) => {
        if (revision !== state.revision) throw new Error("SYNC_CONFLICT");
        writes++;
        state = { revision: revision + 1, document: structuredClone(document) };
        return structuredClone(state);
      },
    },
  };
}
test("cachés separadas por cuenta, distintas del modo local", () => {
  assert.notEqual(accountStorageKey("A"), accountStorageKey("B"));
  assert.notEqual(accountStorageKey("A"), "stride.training.v1");
});
test("carga inicial remota no se sobrescribe con el documento vacío", async () => {
  const db = server({ revision: 4, document: doc("remoto") });
  const engine = new SyncEngine(db.remote);
  await engine.sync();
  assert.equal(engine.state.document.workouts[0].title, "remoto");
  assert.equal(db.writes(), 0);
});
test("edición guarda y otro dispositivo la recupera", async () => {
  const db = server();
  const a = new SyncEngine(db.remote),
    b = new SyncEngine(db.remote);
  await a.sync();
  a.edit(doc("A"));
  await a.sync();
  await b.sync();
  assert.deepEqual(b.state.document, doc("A"));
  assert.equal(a.state.dirty, false);
});
test("conflicto entre dispositivos conserva la copia local y no pisa la remota", async () => {
  const db = server();
  const a = new SyncEngine(db.remote),
    b = new SyncEngine(db.remote);
  await a.sync();
  await b.sync();
  a.edit(doc("A"));
  b.edit(doc("B"));
  await a.sync();
  await b.sync();
  assert.equal(b.state.status, "conflict");
  assert.deepEqual(b.state.document, doc("B"));
  assert.deepEqual(db.read().document, doc("A"));
  await b.useRemote();
  assert.deepEqual(b.state.document, doc("A"));
});
test("sin conexión conserva pendientes y reintenta al reconectar", async () => {
  const db = server();
  let offline = true;
  const engine = new SyncEngine({
    ...db.remote,
    load: async () => {
      if (offline) throw Error("offline");
      return db.remote.load();
    },
  });
  engine.edit(doc("pendiente"));
  await engine.sync();
  assert.equal(engine.state.dirty, true);
  assert.equal(engine.state.status, "error");
  offline = false;
  await engine.sync();
  assert.equal(engine.state.dirty, false);
  assert.deepEqual(db.read().document, doc("pendiente"));
});
test("caché pendiente recargada detecta que otro dispositivo cambió la revisión", async () => {
  const db = server({ revision: 3, document: doc("remoto") });
  const engine = new SyncEngine(db.remote, {
    document: doc("local"),
    revision: 2,
    dirty: true,
  });
  await engine.sync();
  assert.equal(engine.state.status, "conflict");
  assert.equal(db.writes(), 0);
  assert.deepEqual(engine.state.document, doc("local"));
});
test("una edición durante un envío no se pierde", async () => {
  const db = server();
  let release;
  let entered;
  const gate = new Promise((r) => (release = r));
  const started = new Promise((r) => (entered = r));
  const engine = new SyncEngine({
    ...db.remote,
    save: async (d, r) => {
      entered();
      await gate;
      return db.remote.save(d, r);
    },
  });
  await engine.sync();
  engine.edit(doc("primero"));
  const running = engine.sync();
  await started;
  engine.edit(doc("segundo"));
  release();
  await running;
  assert.deepEqual(db.read().document, doc("segundo"));
  assert.equal(engine.state.dirty, false);
});
test("migración local combina IDs sin borrar datos remotos y es repetible", () => {
  const merged = mergeLocalData(doc("nube"), doc("local"));
  assert.equal(merged.workouts.length, 2);
  assert.equal(mergeLocalData(merged, doc("local")).workouts.length, 2);
});

test("cambiar de cuenta descarta notificaciones de una respuesta anterior", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  let emissions = 0;
  const engine = new SyncEngine(
    {
      load: async () => {
        await gate;
        return { revision: 5, document: doc("cuenta A") };
      },
      save: async () => {
        throw Error("no debe escribir");
      },
    },
    undefined,
    () => emissions++,
  );
  const loading = engine.sync();
  engine.dispose();
  const count = emissions;
  release();
  await loading;
  assert.equal(emissions, count);
  assert.deepEqual(engine.state.document, empty());
});
test("migración con un ID coincidente conserva ambas sesiones diferentes", () => {
  const remote = doc("mismo");
  const local = doc("mismo");
  local.workouts[0].plannedDuration = 99;
  const merged = mergeLocalData(remote, local);
  assert.equal(merged.workouts.length, 2);
  assert.equal(merged.workouts[0].plannedDuration, 71);
  assert.equal(merged.workouts[1].plannedDuration, 99);
  assert.equal(mergeLocalData(merged, local).workouts.length, 2);
});
