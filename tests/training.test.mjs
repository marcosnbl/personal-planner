import test from "node:test";
import assert from "node:assert/strict";
import {
  dateKey,
  mondayOf,
  plusDays,
  weekDays,
  weekNumber,
  emptyWorkout,
  relocate,
  copyWeek,
  plannedCopy,
  summarize,
  parseDuration,
  parseBackup,
} from "../lib/training.ts";
import { historyReducer } from "../lib/history.ts";
const workout = (date, type = "run") => ({
  ...emptyWorkout(date, type),
  title: "Sesión",
  plannedDistance: 10,
  actualDistance: 8,
  plannedDuration: 60,
  actualDuration: 50,
  plannedElevation: 100,
  actualElevation: 90,
  status: "completed",
  rpe: 6,
});
test("semana local lunes-domingo cruza mes y año sin perder días", () => {
  const monday = mondayOf(new Date("2027-01-03T12:00:00"));
  assert.equal(dateKey(monday), "2026-12-28");
  assert.equal(dateKey(plusDays(monday, 6)), "2027-01-03");
  assert.equal(weekNumber(monday), 53);
  assert.equal(new Set(weekDays(monday).map(dateKey)).size, 7);
});
test("duraciones en minutos y horas con segundos; rechaza valores inválidos", () => {
  assert.equal(parseDuration("90"), 90);
  assert.equal(parseDuration("1:30:00"), 90);
  assert.equal(parseDuration("0:01:30"), 1.5);
  assert.equal(parseDuration("1:60:00"), null);
  assert.equal(parseDuration("-2"), null);
});
test("mover permite varias sesiones y preserva todas las métricas", () => {
  const a = workout("2026-10-27"),
    b = workout("2026-10-28", "strength");
  const input = [a, b];
  const result = relocate(input, a.id, b.date);
  assert.equal(result.length, 2);
  assert.equal(result[0].date, b.date);
  assert.deepEqual(result[1], b);
  assert.deepEqual({ ...result[0], date: a.date }, a);
  assert.equal(input[0].date, "2026-10-27");
});
test("intercambiar afecta solo la sesión elegida entre varias", () => {
  const a = workout("2026-10-27"),
    b = workout("2026-10-28"),
    c = workout("2026-10-28", "bike");
  const result = relocate([a, b, c], a.id, b.date, b.id);
  assert.equal(result[0].date, b.date);
  assert.equal(result[1].date, a.date);
  assert.deepEqual(result[2], c);
  assert.throws(() => relocate([a, b], a.id, b.date, "missing"));
  assert.throws(() => relocate([a], a.id, "2026-02-30"));
});
test("duplicar y copiar semana crea IDs nuevos y reinicia registros reales", () => {
  const a = workout("2026-12-29"),
    b = workout("2026-12-29", "strength");
  const copy = plannedCopy(a, a.date);
  assert.notEqual(copy.id, a.id);
  assert.equal(copy.actualDistance, 0);
  assert.equal(copy.status, "planned");
  assert.equal(copy.rpe, undefined);
  const result = copyWeek(
    [a, b],
    new Date("2026-12-28T12:00:00"),
    new Date("2027-01-04T12:00:00"),
  );
  assert.equal(result.length, 4);
  assert.equal(result[2].date, "2027-01-05");
  assert.equal(result[3].date, "2027-01-05");
  assert.equal(result[2].plannedDistance, 10);
  assert.equal(new Set(result.map((w) => w.id)).size, 4);
  assert.throws(() =>
    copyWeek(
      [a],
      new Date("2026-12-28T12:00:00"),
      new Date("2026-12-29T12:00:00"),
    ),
  );
});
test("totales por disciplina excluyen planificados/saltados del realizado", () => {
  const run = workout("2026-10-27"),
    bike = { ...workout("2026-10-28", "bike"), actualDistance: 40 };
  const planned = {
    ...workout("2026-10-29"),
    status: "planned",
    rpe: undefined,
  };
  const skipped = { ...workout("2026-10-30"), status: "skipped" };
  const totals = summarize([run, bike, planned, skipped], "run");
  assert.equal(totals.km, 8);
  assert.equal(totals.minutes, 50);
  assert.equal(totals.elevation, 90);
  assert.equal(totals.plannedKm, 30);
  assert.equal(totals.completed, 1);
  assert.equal(totals.rpe, 6);
  assert.equal(summarize([planned]).rpe, null);
});
test("respaldo conserva sesiones del mismo día y plantillas; importa versión anterior", () => {
  const items = [workout("2026-10-27"), workout("2026-10-27", "strength")];
  const template = { id: "template", name: "Long Run", workout: items[0] };
  const restored = parseBackup(
    JSON.stringify({ version: 2, workouts: items, templates: [template] }),
  );
  assert.deepEqual(restored.workouts, items);
  assert.deepEqual(restored.templates, [template]);
  assert.deepEqual(
    parseBackup(JSON.stringify({ version: 1, workouts: items })).workouts,
    items,
  );
});
test("JSON inválido no puede reemplazar el historial", () => {
  const a = workout("2026-10-27");
  for (const data of [
    { workouts: [{ ...a, date: "2026-02-30" }] },
    { workouts: [{ ...a, actualDistance: -3 }] },
    { workouts: [{ ...a, type: "other" }] },
    { workouts: [a, a] },
    { version: 99, workouts: [a] },
    { workouts: [{ ...a, rpe: 11 }] },
  ])
    assert.throws(() => parseBackup(JSON.stringify(data)));
});
test("deshacer restaura movimientos, eliminación y estado con varias sesiones", () => {
  const a = workout("2026-10-27"),
    b = workout("2026-10-27", "strength");
  let state = { current: [a, b], past: [] };
  state = historyReducer(state, {
    type: "change",
    update: (items) => relocate(items, a.id, "2026-10-28"),
  });
  state = historyReducer(state, {
    type: "change",
    update: (items) => items.filter((w) => w.id !== b.id),
  });
  state = historyReducer(state, {
    type: "change",
    update: (items) => items.map((w) => ({ ...w, status: "planned" })),
  });
  state = historyReducer(state, { type: "undo" });
  assert.equal(state.current[0].status, "completed");
  state = historyReducer(state, { type: "undo" });
  assert.equal(state.current.length, 2);
  state = historyReducer(state, { type: "undo" });
  assert.deepEqual(state.current, [a, b]);
});

test("historial conserva hasta 20 cambios y vuelve al estado guardado", () => {
  let state = { current: [], past: [] };
  for (let i = 0; i < 25; i++)
    state = historyReducer(state, {
      type: "change",
      update: [...state.current, workout("2026-10-27")],
    });
  assert.equal(state.past.length, 20);
  for (let i = 0; i < 20; i++) state = historyReducer(state, { type: "undo" });
  assert.equal(state.current.length, 5);
  const stored = JSON.stringify({ version: 2, workouts: state.current });
  assert.deepEqual(parseBackup(stored).workouts, state.current);
});

test("completar confirma 71 minutos planificados aunque hubiera 80 reales previos", async () => {
  const { toggleWorkoutStatus, fmtMinutes } =
    await import("../lib/training.ts");
  const planned = {
    ...workout("2026-10-29"),
    status: "planned",
    plannedDuration: 71,
    actualDuration: 80,
  };
  const done = toggleWorkoutStatus(planned);
  assert.equal(done.actualDuration, 71);
  assert.equal(fmtMinutes(done.actualDuration), "1h 11m");
  assert.equal(done.actualDistance, planned.plannedDistance);
  assert.equal(planned.actualDuration, 80);
  const zero = toggleWorkoutStatus({
    ...planned,
    plannedDuration: 0,
    plannedElevation: 0,
    plannedDistance: 0,
  });
  assert.equal(zero.actualDuration, 0);
  assert.equal(zero.actualElevation, 0);
  assert.equal(zero.actualDistance, 0);
  const history = historyReducer(
    { current: [planned], past: [] },
    { type: "change", update: [done] },
  );
  assert.deepEqual(historyReducer(history, { type: "undo" }).current, [
    planned,
  ]);
});
