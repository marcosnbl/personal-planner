export type Discipline =
  "run" | "strength" | "swim" | "rest" | "bike" | "mobility";
export type Status = "planned" | "completed" | "skipped";
export type ThemeMode = "light" | "dark";
export type Workout = {
  id: string;
  date: string;
  type: Discipline;
  title?: string;
  status: Status;
  plannedDistance: number;
  actualDistance: number;
  plannedDuration: number;
  actualDuration: number;
  plannedElevation: number;
  actualElevation: number;
  rpe?: number;
  gear?: string;
  notes?: string;
};
export type StoredData = {
  version: number;
  target?: number;
  workouts: Workout[];
};
export const STORAGE_KEY = "stride.training.v1";
export const THEME_KEY = "training-planner.theme.v1";
export const TYPE_INFO: Record<
  Discipline,
  { label: string; icon: string; badge: string }
> = {
  run: { label: "Running", icon: "↗", badge: "badge-run" },
  strength: { label: "Fuerza / Gimnasio", icon: "✳", badge: "badge-strength" },
  swim: { label: "Natación", icon: "≈", badge: "badge-swim" },
  rest: { label: "Descanso", icon: "☾", badge: "badge-rest" },
  bike: { label: "Ciclismo", icon: "⌁", badge: "badge-bike" },
  mobility: { label: "Movilidad", icon: "◎", badge: "badge-mobility" },
};
export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const SHORT_DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
export const DISCIPLINES = Object.keys(TYPE_INFO) as Discipline[];
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const mondayOf = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
export const plusDays = (date: Date, count: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
};

export const weekDays = (start: Date) =>
  WEEKDAYS.map((_, i) => plusDays(start, i));
export const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const fmtMinutes = (minutes: number) => {
  const rounded = Math.round(minutes),
    h = Math.floor(rounded / 60),
    m = rounded % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
};
export function parseDuration(value: string): number | null {
  const input = value.trim();
  if (!input) return 0;
  if (!input.includes(":")) {
    const minutes = Number(input);
    return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
  }
  const parts = input.split(":");
  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((part) => !/^\d+$/.test(part))
  )
    return null;
  const hours = Number(parts[0]),
    minutes = Number(parts[1]),
    seconds = parts.length === 3 ? Number(parts[2]) : 0;
  if (minutes > 59 || seconds > 59) return null;
  return hours * 60 + minutes + seconds / 60;
}
export const monthShort = (d: Date) =>
  d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
export function weekNumber(date: Date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}
export function emptyWorkout(date: string, type: Discipline = "run"): Workout {
  return {
    id: makeId(),
    date,
    type,
    status: "planned",
    plannedDistance: 0,
    actualDistance: 0,
    plannedDuration: 0,
    actualDuration: 0,
    plannedElevation: 0,
    actualElevation: 0,
    rpe: undefined,
  };
}

export type MoveChoice = "move" | "swap";

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T12:00:00");
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

export function relocate(
  items: Workout[],
  id: string,
  destination: string,
  swapId?: string,
): Workout[] {
  if (!validDate(destination)) throw new Error("Fecha inválida");
  const source = items.find((w) => w.id === id);
  if (!source) throw new Error("No se encontró la sesión");
  const target = swapId
    ? items.find(
        (w) => w.id === swapId && w.date === destination && w.id !== id,
      )
    : undefined;
  if (swapId && !target) throw new Error("Elegí la sesión a intercambiar");
  return items.map((w) =>
    w.id === id
      ? { ...w, date: destination }
      : w.id === target?.id
        ? { ...w, date: source.date }
        : w,
  );
}

export function plannedCopy(source: Workout, date: string): Workout {
  return {
    ...source,
    id: makeId(),
    date,
    status: "planned",
    actualDistance: 0,
    actualDuration: 0,
    actualElevation: 0,
    rpe: undefined,
    notes: "",
  };
}

export function copyWeek(
  items: Workout[],
  sourceStart: Date,
  destinationStart: Date,
): Workout[] {
  const sourceKeys = weekDays(mondayOf(sourceStart)).map(dateKey);
  const target = mondayOf(destinationStart);
  if (dateKey(mondayOf(sourceStart)) === dateKey(target))
    throw new Error("Elegí una semana diferente");
  return [
    ...items,
    ...items
      .filter((w) => sourceKeys.includes(w.date))
      .map((w) =>
        plannedCopy(w, dateKey(plusDays(target, sourceKeys.indexOf(w.date)))),
      ),
  ];
}

export function summarize(items: Workout[], type?: Discipline) {
  const selected = items.filter((w) => !type || w.type === type);
  const done = selected.filter(
    (w) => w.status === "completed" && w.type !== "rest",
  );
  const plan = selected.filter((w) => w.type !== "rest");
  const rpes = done.filter((w) => typeof w.rpe === "number");
  return {
    km: done.reduce((s, w) => s + w.actualDistance, 0),
    minutes: done.reduce((s, w) => s + w.actualDuration, 0),
    elevation: done.reduce((s, w) => s + w.actualElevation, 0),
    plannedKm: plan.reduce((s, w) => s + w.plannedDistance, 0),
    completed: done.length,
    planned: plan.length,
    adherence: plan.length ? (done.length / plan.length) * 100 : 0,
    rpe: rpes.length
      ? rpes.reduce((s, w) => s + w.rpe!, 0) / rpes.length
      : null,
  };
}

export type WorkoutTemplate = { id: string; name: string; workout: Workout };
export function parseBackup(raw: string): {
  version: number;
  workouts: Workout[];
  templates: WorkoutTemplate[];
} {
  const data = JSON.parse(raw);
  if (
    !data ||
    !Array.isArray(data.workouts) ||
    (data.version !== undefined && ![1, 2].includes(data.version))
  )
    throw new Error("Formato de respaldo no compatible");
  const ids = new Set<string>();
  function validate(value: unknown): Workout {
    if (!value || typeof value !== "object") throw new Error("Sesión inválida");
    const w = value as Record<string, unknown>;
    if (
      !validDate(w.date) ||
      !DISCIPLINES.includes(w.type as Discipline) ||
      !["planned", "completed", "skipped"].includes(String(w.status))
    )
      throw new Error("Fecha, disciplina o estado inválido");
    for (const key of [
      "plannedDistance",
      "actualDistance",
      "plannedDuration",
      "actualDuration",
      "plannedElevation",
      "actualElevation",
    ]) {
      if (
        typeof w[key] !== "number" ||
        !Number.isFinite(w[key]) ||
        (w[key] as number) < 0
      )
        throw new Error("Las métricas deben ser números positivos");
    }
    if (
      w.rpe != null &&
      (typeof w.rpe !== "number" ||
        !Number.isFinite(w.rpe) ||
        w.rpe < 1 ||
        w.rpe > 10)
    )
      throw new Error("RPE inválido");
    for (const key of ["title", "gear", "notes"])
      if (w[key] != null && typeof w[key] !== "string")
        throw new Error("Texto de sesión inválido");
    return {
      ...w,
      id: typeof w.id === "string" && w.id ? w.id : makeId(),
    } as Workout;
  }
  const workouts = data.workouts.map((value: unknown) => {
    const w = validate(value);
    if (ids.has(w.id))
      throw new Error("El respaldo tiene identificadores duplicados");
    ids.add(w.id);
    return w;
  });
  if (data.templates !== undefined && !Array.isArray(data.templates))
    throw new Error("Plantillas inválidas");
  const templateIds = new Set<string>();
  const templates = (data.templates ?? []).map((t: WorkoutTemplate) => {
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      templateIds.has(t.id) ||
      typeof t.name !== "string" ||
      !t.name.trim()
    )
      throw new Error("Plantilla inválida");
    templateIds.add(t.id);
    return { id: t.id, name: t.name, workout: validate(t.workout) };
  });
  return { version: 2, workouts, templates };
}

/** Completing from the calendar confirms the plan, including intentional zero values. */
export function toggleWorkoutStatus(workout: Workout): Workout {
  if (workout.status === "completed") return { ...workout, status: "planned" };
  return {
    ...workout,
    status: "completed",
    actualDistance: workout.plannedDistance,
    actualDuration: workout.plannedDuration,
    actualElevation: workout.plannedElevation,
  };
}
