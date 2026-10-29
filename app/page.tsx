"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Discipline = "run" | "strength" | "swim" | "rest" | "bike" | "mobility";
type Status = "planned" | "completed" | "skipped";
type ThemeMode = "light" | "dark";
type Workout = {
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
type StoredData = { version: number; target?: number; workouts: Workout[] };
const STORAGE_KEY = "stride.training.v1";
const THEME_KEY = "training-planner.theme.v1";
const TYPE_INFO: Record<
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
const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const SHORT_DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DISCIPLINES = Object.keys(TYPE_INFO) as Discipline[];
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const mondayOf = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
const plusDays = (date: Date, count: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
};

const weekDays = (start: Date) => WEEKDAYS.map((_, i) => plusDays(start, i));
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const fmtMinutes = (minutes: number) => {
  const rounded = Math.round(minutes),
    h = Math.floor(rounded / 60),
    m = rounded % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
};
function parseDuration(value: string): number | null {
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
const monthShort = (d: Date) =>
  d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
function weekNumber(date: Date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}
function emptyWorkout(date: string, type: Discipline = "run"): Workout {
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
    rpe: 5,
  };
}

export default function HomePage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [view, setView] = useState<"week" | "stats">("week");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<"workout" | "settings" | null>(null);
  const [editingId, setEditingId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [type, setType] = useState<Discipline>("run");
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [mode, setMode] = useState<"plan" | "log">("plan");
  const [plannedDistance, setPlannedDistance] = useState("");
  const [actualDistance, setActualDistance] = useState("");
  const [plannedDuration, setPlannedDuration] = useState("");
  const [actualDuration, setActualDuration] = useState("");
  const [plannedElevation, setPlannedElevation] = useState("");
  const [actualElevation, setActualElevation] = useState("");
  const [gear, setGear] = useState("");
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState(5);
  const [status, setStatus] = useState<Status>("planned");
  const [toast, setToast] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const pointerDrag = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!draggedId || !pointerDrag.current) return;
    let frame: number;
    const update = () => {
      const drag = pointerDrag.current;
      if (!drag) return;
      // Keep distant calendar days reachable while holding a touch drag.
      const edge = 72;
      const scroll =
        drag.y < edge ? -12 : drag.y > window.innerHeight - edge ? 12 : 0;
      if (scroll) window.scrollBy(0, scroll);
      const target = document
        .elementFromPoint(drag.x, drag.y)
        ?.closest<HTMLElement>("[data-workout-date]");
      setDropDate(target?.dataset.workoutDate ?? null);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [draggedId]);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const initialTheme: ThemeMode = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Array.isArray(saved.workouts))
        setWorkouts(
          saved.workouts.map((workout: Workout) =>
            workout.status === "completed"
              ? {
                  ...workout,
                  actualDistance:
                    workout.actualDistance || workout.plannedDistance,
                  actualDuration:
                    workout.actualDuration || workout.plannedDuration,
                  actualElevation:
                    workout.actualElevation || workout.plannedElevation,
                }
              : workout,
          ),
        );
    } catch {
      /* Ignore malformed local data and start clean. */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [hydrated, theme]);
  useEffect(() => {
    if (hydrated)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, workouts } satisfies StoredData),
      );
  }, [hydrated, workouts]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);

  const dates = useMemo(() => weekDays(weekStart), [weekStart]);
  const todayKey = dateKey(new Date());
  const currentDateInWeek = dates.find((date) => dateKey(date) === todayKey);
  const firstFreeDate = dates.find(
    (date) => !workouts.some((workout) => workout.date === dateKey(date)),
  );
  const defaultNewWorkoutDate =
    currentDateInWeek && !workouts.some((workout) => workout.date === todayKey)
      ? todayKey
      : dateKey(firstFreeDate ?? currentDateInWeek ?? dates[0]);
  const weeklyWorkouts = useMemo(() => {
    const keys = new Set(dates.map(dateKey));
    return workouts.filter((w) => keys.has(w.date));
  }, [dates, workouts]);
  const completed = weeklyWorkouts.filter((w) => w.status === "completed");
  const plannedKm = weeklyWorkouts.reduce(
    (sum, w) => sum + (Number(w.plannedDistance) || 0),
    0,
  );
  const actualKm = completed.reduce(
    (sum, w) => sum + (Number(w.actualDistance) || 0),
    0,
  );
  const disciplineKm = (["run", "bike", "swim"] as const)
    .map((type) => ({
      type,
      label: TYPE_INFO[type].label,
      km: completed
        .filter((w) => w.type === type)
        .reduce((sum, w) => sum + (Number(w.actualDistance) || 0), 0),
    }))
    .filter((item) => item.km > 0);
  const totalMinutes = completed.reduce(
    (sum, w) => sum + (Number(w.actualDuration) || 0),
    0,
  );
  const elevation = completed.reduce(
    (sum, w) => sum + (Number(w.actualElevation) || 0),
    0,
  );
  const planProgress = plannedKm
    ? Math.min(100, (actualKm / plannedKm) * 100)
    : 0;
  const daysWithWorkouts = dates
    .map((date, index) => ({
      date,
      index,
      workout: workouts.find((w) => w.date === dateKey(date)),
    }))
    .filter(({ workout }) => filter === "all" || workout?.type === filter);

  function notify(message: string) {
    setToast(message);
  }
  function moveWorkout(id: string, destination: string) {
    const workout = workouts.find((session) => session.id === id);
    if (!workout || workout.date === destination) return;
    const occupied = workouts.some((session) => session.date === destination);
    setWorkouts((current) =>
      current.map((session) =>
        session.id === id
          ? { ...session, date: destination }
          : session.date === destination
            ? { ...session, date: workout.date }
            : session,
      ),
    );
    notify(
      occupied
        ? "Sesiones intercambiadas. Se conservaron todos sus datos."
        : "Entrenamiento movido. Se conservaron todos sus datos.",
    );
  }
  function openWorkout(date = dateKey(new Date()), createNew = false) {
    const workout = createNew
      ? undefined
      : workouts.find((w) => w.date === date);
    setEditingId(workout?.id ?? "");
    setFormDate(date);
    setType(workout?.type ?? "run");
    setWorkoutTitle(workout?.title ?? "");
    setMode("plan");
    setPlannedDistance(
      workout?.plannedDistance ? String(workout.plannedDistance) : "",
    );
    setActualDistance(
      workout?.actualDistance ? String(workout.actualDistance) : "",
    );
    setPlannedDuration(
      workout?.plannedDuration ? String(workout.plannedDuration) : "",
    );
    setActualDuration(
      workout?.actualDuration ? String(workout.actualDuration) : "",
    );
    setPlannedElevation(
      workout?.plannedElevation ? String(workout.plannedElevation) : "",
    );
    setActualElevation(
      workout?.actualElevation ? String(workout.actualElevation) : "",
    );
    setGear(workout?.gear ?? "");
    setNotes(workout?.notes ?? "");
    setRpe(workout?.rpe ?? 5);
    setStatus(workout?.status ?? "planned");
    setModal("workout");
  }
  function saveWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plannedMinutes = parseDuration(plannedDuration),
      actualMinutes = parseDuration(actualDuration);
    if (plannedMinutes === null || actualMinutes === null) {
      notify("Usá minutos (90) o el formato HH:MM:SS (1:30:00)");
      return;
    }
    const previous = workouts.find((w) => w.id === editingId);
    if (workouts.some((w) => w.date === formDate && w.id !== previous?.id)) {
      notify(
        "Ya existe una sesión para esa fecha. Elegí otro día o editá la existente.",
      );
      return;
    }
    const completedFromPlan = mode === "plan" && status === "completed";
    const workout: Workout = {
      ...(previous ?? emptyWorkout(formDate, type)),
      id: previous?.id ?? makeId(),
      date: formDate,
      type,
      title:
        workoutTitle.trim() ||
        (type === "run" ? "Trail / Running" : TYPE_INFO[type].label),
      plannedDistance: Number(plannedDistance) || 0,
      actualDistance:
        completedFromPlan && !actualDistance.trim()
          ? Number(plannedDistance) || 0
          : Number(actualDistance) || 0,
      plannedDuration: plannedMinutes,
      actualDuration:
        completedFromPlan && !actualDuration.trim()
          ? plannedMinutes
          : actualMinutes,
      plannedElevation: Number(plannedElevation) || 0,
      actualElevation:
        completedFromPlan && !actualElevation.trim()
          ? Number(plannedElevation) || 0
          : Number(actualElevation) || 0,
      gear,
      notes,
      rpe,
      status: mode === "log" && status === "planned" ? "completed" : status,
    };
    setWorkouts((current) =>
      previous
        ? current.map((w) => (w.id === previous.id ? workout : w))
        : [...current, workout],
    );
    setWeekStart(mondayOf(new Date(`${formDate}T12:00:00`)));
    setModal(null);
    notify(
      workout.status === "completed"
        ? "Entrenamiento registrado"
        : "Plan actualizado",
    );
  }
  function quickToggle(date: string) {
    setWorkouts((current) => {
      const found = current.find((w) => w.date === date);
      if (!found)
        return [...current, { ...emptyWorkout(date), status: "completed" }];
      return current.map((w) =>
        w.date === date
          ? {
              ...w,
              status: w.status === "completed" ? "planned" : "completed",
              actualDistance:
                w.status === "completed"
                  ? w.actualDistance
                  : w.actualDistance || w.plannedDistance,
              actualDuration:
                w.status === "completed"
                  ? w.actualDuration
                  : w.actualDuration || w.plannedDuration,
              actualElevation:
                w.status === "completed"
                  ? w.actualElevation
                  : w.actualElevation || w.plannedElevation,
            }
          : w,
      );
    });
    notify("Estado de la sesión actualizado");
  }
  function deleteWorkout() {
    if (!editingId || !window.confirm("¿Eliminar esta sesión?")) return;
    setWorkouts((current) => current.filter((w) => w.id !== editingId));
    setModal(null);
    notify("Sesión eliminada");
  }
  function exportFile(kind: "json" | "csv") {
    let content: string, mime: string, filename: string;
    if (kind === "json") {
      content = JSON.stringify({ version: 1, workouts }, null, 2);
      mime = "application/json";
      filename = "training-planner-entrenamientos.json";
    } else {
      const headers = [
        "fecha",
        "disciplina",
        "estado",
        "distancia_plan_km",
        "distancia_real_km",
        "tiempo_plan_min",
        "tiempo_real_min",
        "desnivel_plan_m",
        "desnivel_real_m",
        "ritmo_min_km",
        "rpe",
        "calzado_equipo",
        "notas",
      ];
      const rows = workouts.map((w) =>
        [
          w.date,
          TYPE_INFO[w.type].label,
          w.status,
          w.plannedDistance,
          w.actualDistance,
          w.plannedDuration,
          w.actualDuration,
          w.plannedElevation,
          w.actualElevation,
          w.actualDistance && w.actualDuration
            ? (w.actualDuration / w.actualDistance).toFixed(2)
            : "",
          w.rpe,
          w.gear,
          w.notes,
        ]
          .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
          .join(","),
      );
      content = [headers.join(","), ...rows].join("\r\n");
      mime = "text/csv;charset=utf-8";
      filename = "training-planner-entrenamientos.csv";
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`Respaldo ${kind.toUpperCase()} descargado`);
  }
  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.workouts)) throw new Error();
        setWorkouts(
          data.workouts.map((w: Workout) => ({ ...w, id: w.id || makeId() })),
        );
        notify("Datos importados correctamente");
      } catch {
        notify("No se pudo importar ese archivo");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }
  const rpeFace =
    rpe <= 2
      ? "😌"
      : rpe <= 4
        ? "🙂"
        : rpe <= 6
          ? "😅"
          : rpe <= 8
            ? "🥵"
            : "🔥";
  const statsWeeks = useMemo(() => {
    const end = mondayOf(new Date());
    return Array.from({ length: 12 }, (_, i) => {
      const start = plusDays(end, -7 * (11 - i));
      const keys = new Set(weekDays(start).map(dateKey));
      const items = workouts.filter(
        (w) => keys.has(w.date) && w.status === "completed",
      );
      return {
        start,
        km: items.reduce((sum, w) => sum + (Number(w.actualDistance) || 0), 0),
      };
    });
  }, [workouts]);
  const allCompleted = workouts.filter((w) => w.status === "completed");
  const maxKm = Math.max(15, ...statsWeeks.map((w) => w.km));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="15.8" cy="4.3" r="2.1" fill="currentColor" />
              <path
                d="m13.6 7.6-3.1 3.2 3.7 2.5 2.9-.8m-4.4-4.1-4.4.1-2 1.9m6.5-.3 3.2-2.1 3.2.6m-6.5 4.7-3 2.8-2.7 4.6m5.7-7.4 3.5 2.8 3.4 1"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.1"
              />
            </svg>
          </span>
          <span>Training planner</span>
        </a>
        <div className="side-label">ESPACIO DE ENTRENAMIENTO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          <button
            className={`nav-item ${view === "week" ? "active" : ""}`}
            onClick={() => setView("week")}
          >
            <span className="nav-icon">▦</span>Mi semana
          </button>
          <button
            className={`nav-item ${view === "stats" ? "active" : ""}`}
            onClick={() => setView("stats")}
          >
            <span className="nav-icon">◴</span>Estadísticas
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="coach-card">
            <div className="coach-orbit">✳</div>
            <div>
              <strong>Un paso a la vez</strong>
              <p>
                La constancia construye
                <br />
                grandes recorridos.
              </p>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">M</div>
            <div className="profile-copy">
              <strong>Mi entrenamiento</strong>
              <span>Plan personal</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setModal("settings")}
              aria-label="Configuración"
            >
              ⚙
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="15.8" cy="4.3" r="2.1" fill="currentColor" />
                <path
                  d="m13.6 7.6-3.1 3.2 3.7 2.5 2.9-.8m-4.4-4.1-4.4.1-2 1.9m6.5-.3 3.2-2.1 3.2.6m-6.5 4.7-3 2.8-2.7 4.6m5.7-7.4 3.5 2.8 3.4 1"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.1"
                />
              </svg>
            </span>{" "}
            Training planner
          </div>
          <div className="breadcrumb">
            <span>ENTRENAMIENTO</span>
            <i>/</i>
            <strong>{view === "week" ? "MI SEMANA" : "ESTADÍSTICAS"}</strong>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="icon-button header-theme-toggle"
              onClick={() =>
                setTheme((current) => (current === "light" ? "dark" : "light"))
              }
              aria-label={
                theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
              }
              aria-pressed={theme === "dark"}
              title={
                theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
              }
            >
              <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            </button>
            <button
              className="today-link"
              onClick={() => setWeekStart(mondayOf(new Date()))}
            >
              ◷ <span>Ir a hoy</span>
            </button>
            <button
              className="primary-button"
              onClick={() => openWorkout(defaultNewWorkoutDate, true)}
            >
              <span>＋</span> Nuevo entrenamiento
            </button>
            <button
              className="icon-button mobile-settings"
              onClick={() => setModal("settings")}
              aria-label="Configuración"
            >
              ⚙
            </button>
          </div>
        </header>
        {view === "week" ? (
          <section className="view-section">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" /> TU PLAN, A TU RITMO
                </div>
                <h1>
                  Mi semana<span className="heading-period">.</span>
                </h1>
                <p className="subheading">
                  Cada sesión cuenta. Vamos por una gran semana.
                </p>
              </div>
              <div className="week-controls">
                <button
                  className="round-control"
                  onClick={() => setWeekStart(plusDays(weekStart, -7))}
                  aria-label="Semana anterior"
                >
                  ‹
                </button>
                <label className="week-picker">
                  <span className="calendar-icon">▦</span>
                  <span>{`${dates[0].getDate()} ${monthShort(dates[0])} — ${dates[6].getDate()} ${monthShort(dates[6])} · ${dates[6].getFullYear()}`}</span>
                  <span className="chevron">⌄</span>
                  <input
                    aria-label="Elegir semana"
                    type="date"
                    value={dateKey(weekStart)}
                    onChange={(e) =>
                      e.target.value &&
                      setWeekStart(
                        mondayOf(new Date(`${e.target.value}T12:00:00`)),
                      )
                    }
                  />
                </label>
                <button
                  className="round-control"
                  onClick={() => setWeekStart(plusDays(weekStart, 7))}
                  aria-label="Próxima semana"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="progress-panel">
              <div className="progress-top">
                <div>
                  <span className="section-kicker">
                    KILÓMETROS ACUMULADOS ESTA SEMANA
                  </span>
                  <div className="progress-title">
                    <strong>{actualKm.toFixed(actualKm % 1 ? 1 : 0)}</strong>
                    <span>km realizados</span>
                  </div>
                  {disciplineKm.length > 0 && (
                    <div className="weekly-discipline-breakdown">
                      {disciplineKm.map((item, index) => (
                        <span key={item.type}>
                          {index > 0 && <i>·</i>}
                          {item.label}{" "}
                          <b>{item.km.toFixed(item.km % 1 ? 1 : 0)} km</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="progress-caption">
                  <span className="progress-dot" />
                  {plannedKm
                    ? `${actualKm.toFixed(1).replace(/\.0$/, "")} de ${plannedKm.toFixed(1).replace(/\.0$/, "")} km planificados`
                    : "Se acumula al registrar sesiones completadas"}
                </div>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${planProgress}%` }}
                />
              </div>
              <div className="progress-bottom">
                <span>Distancia realizada</span>
                <span>
                  {plannedKm
                    ? `${plannedKm.toFixed(plannedKm % 1 ? 1 : 0)} km planificados`
                    : "Marcá las sesiones como completadas para sumar kilómetros"}
                </span>
              </div>
            </div>
            <div className="kpi-grid">
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>KILÓMETROS</span>
                  <span className="kpi-icon orange">↗</span>
                </div>
                <div className="kpi-value">
                  <strong>{actualKm.toFixed(actualKm % 1 ? 1 : 0)}</strong>
                  <span>km</span>
                </div>
                <div className="kpi-foot">
                  <span className="tiny-line" />
                  de {plannedKm.toFixed(plannedKm % 1 ? 1 : 0)} km planificados
                </div>
              </article>
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>TIEMPO TOTAL</span>
                  <span className="kpi-icon blue">◷</span>
                </div>
                <div className="kpi-value">
                  <strong>
                    {Math.floor(Math.round(totalMinutes) / 60)}
                    <span className="value-unit">h</span>{" "}
                    {String(Math.round(totalMinutes) % 60).padStart(2, "0")}
                    <span className="value-unit">m</span>
                  </strong>
                </div>
                <div className="kpi-foot">
                  <span className="muted-note">Tiempo en movimiento</span>
                </div>
              </article>
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>DESNIVEL POSITIVO</span>
                  <span className="kpi-icon lime">⌁</span>
                </div>
                <div className="kpi-value">
                  <strong>{elevation.toLocaleString("es-AR")}</strong>
                  <span>
                    m <small>D+</small>
                  </span>
                </div>
                <div className="kpi-foot">
                  <span className="muted-note">Acumulado esta semana</span>
                </div>
              </article>
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>SESIONES</span>
                  <span className="kpi-icon violet">✳</span>
                </div>
                <div className="kpi-value">
                  <strong>{completed.length}</strong>
                  <span className="session-fraction">
                    / {weeklyWorkouts.filter((w) => w.type !== "rest").length}
                  </span>
                </div>
                <div className="kpi-foot">
                  <span className="tiny-line purple-line" />
                  {completed.length} completadas
                  {completed.some((w) => w.type === "strength")
                    ? ` · ${completed.filter((w) => w.type === "strength").length} de fuerza`
                    : ""}
                </div>
              </article>
            </div>
            <div className="section-header">
              <div>
                <div className="section-title-row">
                  <h2>Tu plan</h2>
                  <span className="week-chip">
                    SEMANA {String(weekNumber(weekStart)).padStart(2, "0")}
                  </span>
                </div>
                <p>
                  Arrastrá para mover una sesión. Si el día está ocupado, se
                  intercambian las fechas.
                </p>
              </div>
              <div className="filters">
                <label className="filter-select">
                  <span>◉</span>
                  <select
                    aria-label="Filtrar por disciplina"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Todas las disciplinas</option>
                    {DISCIPLINES.map((d) => (
                      <option key={d} value={d}>
                        {TYPE_INFO[d].label}
                      </option>
                    ))}
                  </select>
                  <b>⌄</b>
                </label>
                <button
                  className="view-toggle"
                  onClick={() => setLayout(layout === "grid" ? "list" : "grid")}
                  title="Cambiar vista"
                >
                  <span className={layout === "grid" ? "selected" : ""}>▦</span>
                  <span className={layout === "list" ? "selected" : ""}>
                    ☰
                  </span>
                </button>
              </div>
            </div>
            <div
              className={`days-grid ${layout === "list" ? "list-mode" : ""}`}
            >
              {daysWithWorkouts.length ? (
                daysWithWorkouts.map(({ date, index, workout }, i) => {
                  const today = dateKey(date) === dateKey(new Date());
                  const kind = workout?.type ?? "rest";
                  const info = TYPE_INFO[kind];
                  const done = workout?.status === "completed";
                  const skipped = workout?.status === "skipped";
                  const shownDistance = done
                    ? workout?.actualDistance
                    : workout?.plannedDistance;
                  return (
                    <article
                      key={dateKey(date)}
                      data-workout-date={dateKey(date)}
                      className={`day-card ${today ? "today" : ""} ${done ? "completed" : ""} ${draggedId === workout?.id ? "dragging" : ""} ${dropDate === dateKey(date) ? "drop-target" : ""}`}
                      draggable={Boolean(workout)}
                      onDragStart={(event) => {
                        if (!workout) return;
                        event.dataTransfer.setData(
                          "application/x-training-planner",
                          workout.id,
                        );
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedId(workout.id);
                      }}
                      onDragOver={(event) => {
                        if (!draggedId) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropDate(dateKey(date));
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node | null,
                          )
                        )
                          setDropDate(null);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const id = event.dataTransfer.getData(
                          "application/x-training-planner",
                        );
                        if (id && id === draggedId)
                          moveWorkout(id, dateKey(date));
                        setDraggedId(null);
                        setDropDate(null);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDropDate(null);
                      }}
                      style={{ animationDelay: `${i * 35}ms` }}
                      onClick={() => openWorkout(dateKey(date))}
                    >
                      <div className="day-top">
                        <span className="day-name">{SHORT_DAYS[index]}</span>
                        {workout && (
                          <button
                            type="button"
                            className="drag-handle"
                            aria-label={`Mover ${workout.title || info.label}. Arrastrá a otro día; también podés editar la fecha abriendo la sesión.`}
                            title="Arrastrar a otro día"
                            onClick={(event) => event.stopPropagation()}
                            onDragStart={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onPointerDown={(event) => {
                              if (!event.isPrimary || event.button !== 0)
                                return;
                              event.preventDefault();
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              pointerDrag.current = {
                                id: workout.id,
                                pointerId: event.pointerId,
                                x: event.clientX,
                                y: event.clientY,
                              };
                              setDraggedId(workout.id);
                            }}
                            onPointerMove={(event) => {
                              const drag = pointerDrag.current;
                              if (!drag || drag.pointerId !== event.pointerId)
                                return;
                              drag.x = event.clientX;
                              drag.y = event.clientY;
                            }}
                            onPointerUp={(event) => {
                              const drag = pointerDrag.current;
                              if (!drag || drag.pointerId !== event.pointerId)
                                return;
                              event.stopPropagation();
                              const target = document
                                .elementFromPoint(event.clientX, event.clientY)
                                ?.closest<HTMLElement>("[data-workout-date]");
                              pointerDrag.current = null;
                              setDraggedId(null);
                              setDropDate(null);
                              if (target?.dataset.workoutDate)
                                moveWorkout(
                                  drag.id,
                                  target.dataset.workoutDate,
                                );
                            }}
                            onPointerCancel={() => {
                              pointerDrag.current = null;
                              setDraggedId(null);
                              setDropDate(null);
                            }}
                            onLostPointerCapture={() => {
                              pointerDrag.current = null;
                              setDraggedId(null);
                              setDropDate(null);
                            }}
                          >
                            <span aria-hidden="true">⠿</span>
                          </button>
                        )}
                        <span className="day-number">{date.getDate()}</span>
                      </div>
                      {today && <span className="today-tag">HOY</span>}
                      <div className="workout-name">
                        {workout?.title || info.label}
                      </div>
                      <span className={`discipline-badge ${info.badge}`}>
                        {info.icon} &nbsp;{info.label}
                      </span>
                      <div className="day-metrics">
                        {workout ? (
                          <>
                            {shownDistance || workout.plannedDistance ? (
                              <span className={!done ? "planned" : ""}>
                                ↗ <b>{shownDistance || 0}</b> km
                              </span>
                            ) : null}
                            {done && workout.plannedDistance > 0 && (
                              <>
                                <span className="divider">·</span>
                                <span className="planned">
                                  {workout.plannedDistance} km plan.
                                </span>
                              </>
                            )}
                            {(done
                              ? workout.actualDuration
                              : workout.plannedDuration) > 0 && (
                              <span>
                                ◷{" "}
                                <b>
                                  {fmtMinutes(
                                    done
                                      ? workout.actualDuration
                                      : workout.plannedDuration,
                                  )}
                                </b>
                              </span>
                            )}
                            {(done
                              ? workout.actualElevation
                              : workout.plannedElevation) > 0 && (
                              <span>
                                ⌁{" "}
                                <b>
                                  {done
                                    ? workout.actualElevation
                                    : workout.plannedElevation}
                                </b>{" "}
                                m
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="planned">Un día para recuperar</span>
                        )}
                      </div>
                      <div className="day-bottom">
                        <span
                          className={`status-pill ${done ? "done" : skipped ? "skipped" : ""}`}
                        >
                          <i className="status-dot" />
                          {done
                            ? "Completado"
                            : skipped
                              ? "Saltado"
                              : "Planificado"}
                        </span>
                        <button
                          className="quick-complete"
                          title="Cambiar estado"
                          aria-label="Cambiar estado"
                          onClick={(e) => {
                            e.stopPropagation();
                            quickToggle(dateKey(date));
                          }}
                        >
                          {done ? "✓" : "↗"}
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-plan">
                  <div style={{ fontSize: 22, color: "var(--lime)" }}>◌</div>
                  <strong>No hay sesiones para este filtro</strong>
                  <p>Agregá un entrenamiento o probá otra disciplina.</p>
                  <button
                    className="primary-button"
                    onClick={() => openWorkout()}
                  >
                    ＋ Agregar sesión
                  </button>
                </div>
              )}
            </div>
            <footer className="page-footer">
              <span>
                <span className="footer-pulse">✳</span>Los días de descanso
                también son parte del plan.
              </span>
            </footer>
          </section>
        ) : (
          <section className="view-section">
            <div className="page-heading stats-heading">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" /> TU PROGRESO EN EL TIEMPO
                </div>
                <h1>
                  Estadísticas<span className="heading-period">.</span>
                </h1>
                <p className="subheading">
                  Una mirada a todo lo que venís construyendo.
                </p>
              </div>
              <span className="week-picker stats-range">
                Últimas 12 semanas <span className="chevron">⌄</span>
              </span>
            </div>
            <div className="stats-summary">
              <article className="summary-card">
                <span>KM REGISTRADOS</span>
                <strong>
                  {allCompleted
                    .reduce((s, w) => s + w.actualDistance, 0)
                    .toFixed(1)}{" "}
                  km
                </strong>
                <small>
                  {allCompleted.length} sesiones completadas en total
                </small>
              </article>
              <article className="summary-card">
                <span>DESNIVEL ACUMULADO</span>
                <strong>
                  {allCompleted
                    .reduce((s, w) => s + w.actualElevation, 0)
                    .toLocaleString("es-AR")}{" "}
                  m
                </strong>
                <small>D+ de todas tus sesiones</small>
              </article>
              <article className="summary-card">
                <span>PROMEDIO SEMANAL</span>
                <strong>
                  {(statsWeeks.reduce((s, w) => s + w.km, 0) / 12).toFixed(1)}{" "}
                  km
                </strong>
                <small>Últimas 12 semanas</small>
              </article>
            </div>
            <article className="chart-card">
              <div className="chart-header">
                <div>
                  <span className="section-kicker">VOLUMEN SEMANAL</span>
                  <h2>Kilómetros por semana</h2>
                </div>
                <div className="chart-legend">
                  <span />
                  Realizado
                </div>
              </div>
              <div className="chart-wrap">
                <div className="chart-y-labels">
                  <span>60</span>
                  <span>45</span>
                  <span>30</span>
                  <span>15</span>
                  <span>0</span>
                </div>
                <div className="chart-area">
                  <div className="chart-gridlines">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="bars">
                    {statsWeeks.map(({ start, km }) => (
                      <div className="bar-group" key={dateKey(start)}>
                        <div className="bar-track">
                          <div
                            className="bar"
                            style={{
                              height: `${Math.max(km ? 3 : 0, (km / maxKm) * 100)}%`,
                            }}
                          >
                            {km > 0 && (
                              <span className="bar-value">
                                {km.toFixed(km % 1 ? 1 : 0)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="bar-label">{`${String(start.getDate()).padStart(2, "0")} ${monthShort(start)}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-foot">
                <span>Las semanas se agrupan de lunes a domingo.</span>
                <span>km</span>
              </div>
            </article>
            <button className="back-link" onClick={() => setView("week")}>
              ← Volver a mi semana
            </button>
          </section>
        )}
      </main>

      {modal === "workout" && (
        <div
          className="modal-backdrop open"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="workout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
          >
            <div className="dialog-head">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" /> SESIÓN DE ENTRENAMIENTO
                </div>
                <h2 id="modalTitle">
                  {editingId ? "Editar sesión" : "Nueva sesión"}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="mode-switch">
              <button
                className={`mode-option ${mode === "plan" ? "active" : ""}`}
                onClick={() => setMode("plan")}
              >
                ◷ <span>Planificación</span>
              </button>
              <button
                className={`mode-option ${mode === "log" ? "active" : ""}`}
                onClick={() => {
                  setMode("log");
                  if (status === "planned") setStatus("completed");
                }}
              >
                ✓ <span>Registro real</span>
              </button>
            </div>
            <form onSubmit={saveWorkout}>
              <div className="form-grid">
                <label className="field full-field">
                  DÍA DE ENTRENAMIENTO
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </label>
                <label className="field full-field">
                  TÍTULO DEL ENTRENAMIENTO
                  <input
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    placeholder="Ej. Long Run, Cuestas, Fuerza..."
                  />
                </label>
                <div className="field full-field">
                  DISCIPLINA
                  <div className="discipline-options">
                    {DISCIPLINES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`discipline-choice ${type === d ? "active" : ""}`}
                        onClick={() => setType(d)}
                      >
                        {TYPE_INFO[d].icon} {TYPE_INFO[d].label.split(" / ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-divider full-field">
                  <span>
                    {mode === "plan"
                      ? "OBJETIVOS PLANIFICADOS"
                      : "DATOS DE LA SESIÓN REALIZADA"}
                  </span>
                  <i />
                </div>
                {mode === "plan" ? (
                  <>
                    <label className="field">
                      DISTANCIA <span>(km)</span>
                      <div className="input-wrap">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0.0"
                          value={plannedDistance}
                          onChange={(e) => setPlannedDistance(e.target.value)}
                        />
                        <span>km</span>
                      </div>
                    </label>
                    <label className="field">
                      TIEMPO <span>(min o HH:MM:SS)</span>
                      <div className="input-wrap">
                        <input
                          type="text"
                          inputMode="text"
                          placeholder="90 o 1:30:00"
                          value={plannedDuration}
                          onChange={(e) => setPlannedDuration(e.target.value)}
                          aria-label="Tiempo planificado en minutos o HH:MM:SS"
                        />
                        <span>min / HH:MM:SS</span>
                      </div>
                    </label>
                    <label className="field">
                      DESNIVEL POSITIVO <span>(m)</span>
                      <div className="input-wrap">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="0"
                          value={plannedElevation}
                          onChange={(e) => setPlannedElevation(e.target.value)}
                        />
                        <span>m D+</span>
                      </div>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field">
                      DISTANCIA <span>(km)</span>
                      <div className="input-wrap">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0.0"
                          value={actualDistance}
                          onChange={(e) => setActualDistance(e.target.value)}
                        />
                        <span>km</span>
                      </div>
                    </label>
                    <label className="field">
                      TIEMPO <span>(min o HH:MM:SS)</span>
                      <div className="input-wrap">
                        <input
                          type="text"
                          inputMode="text"
                          placeholder="90 o 1:30:00"
                          value={actualDuration}
                          onChange={(e) => setActualDuration(e.target.value)}
                          aria-label="Tiempo realizado en minutos o HH:MM:SS"
                        />
                        <span>min / HH:MM:SS</span>
                      </div>
                    </label>
                    <label className="field">
                      DESNIVEL POSITIVO <span>(m)</span>
                      <div className="input-wrap">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="0"
                          value={actualElevation}
                          onChange={(e) => setActualElevation(e.target.value)}
                        />
                        <span>m D+</span>
                      </div>
                    </label>
                    <label className="field">
                      CALZADO / EQUIPO <span>(opcional)</span>
                      <input
                        value={gear}
                        onChange={(e) => setGear(e.target.value)}
                        placeholder="Ej. Zapatillas de trail"
                      />
                    </label>
                    <label className="field full-field">
                      ESFUERZO PERCIBIDO (RPE)
                      <div className="rpe-row">
                        <div className="rpe-emoji">{rpeFace}</div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={rpe}
                          onChange={(e) => setRpe(Number(e.target.value))}
                        />
                        <div className="rpe-number">
                          <strong>{rpe}</strong>
                          <span> / 10</span>
                        </div>
                      </div>
                      <div className="range-labels">
                        <span>Suave</span>
                        <span>Máximo esfuerzo</span>
                      </div>
                    </label>
                    <label className="field full-field">
                      NOTAS Y SENSACIONES
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="¿Cómo te sentiste? Clima, nutrición, sensaciones..."
                      />
                    </label>
                  </>
                )}
                <label className="field full-field">
                  ESTADO DE LA SESIÓN
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                  >
                    <option value="planned">Planificado</option>
                    <option value="completed">Completado</option>
                    <option value="skipped">Saltado</option>
                  </select>
                </label>
              </div>
              <div className="dialog-actions">
                {editingId && (
                  <button
                    type="button"
                    className="delete-button"
                    onClick={deleteWorkout}
                  >
                    Eliminar sesión
                  </button>
                )}
                <div className="action-spacer" />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  Guardar sesión <span>↗</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {modal === "settings" && (
        <div
          className="modal-backdrop open"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settingsTitle"
          >
            <div className="dialog-head">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" /> TUS DATOS, BAJO TU CONTROL
                </div>
                <h2 id="settingsTitle">Configuración</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="settings-body">
              <div className="theme-setting">
                <span className="section-kicker">APARIENCIA</span>
                <div
                  className="theme-switch"
                  role="group"
                  aria-label="Elegir tema"
                >
                  <button
                    type="button"
                    className={theme === "light" ? "active" : ""}
                    aria-pressed={theme === "light"}
                    onClick={() => setTheme("light")}
                  >
                    ☼ Claro
                  </button>
                  <button
                    type="button"
                    className={theme === "dark" ? "active" : ""}
                    aria-pressed={theme === "dark"}
                    onClick={() => setTheme("dark")}
                  >
                    ☾ Oscuro
                  </button>
                </div>
              </div>
              <div className="settings-actions">
                <button
                  className="secondary-button"
                  onClick={() => exportFile("json")}
                >
                  ↓ Exportar JSON
                </button>
                <button
                  className="secondary-button"
                  onClick={() => exportFile("csv")}
                >
                  ↓ Exportar CSV
                </button>
                <label className="secondary-button import-button">
                  ↑ Cargar JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={importFile}
                  />
                </label>
              </div>
              <p className="settings-note">
                Tus entrenamientos se guardan en este dispositivo. Exportá un
                respaldo cuando quieras cambiar de navegador.
              </p>
              <button
                className="danger-action"
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Borrar todos los entrenamientos guardados en este dispositivo?",
                    )
                  ) {
                    setWorkouts([]);
                    setModal(null);
                    notify("Entrenamientos eliminados");
                  }
                }}
              >
                Borrar todos los entrenamientos
              </button>
            </div>
          </section>
        </div>
      )}
      <div className={`toast ${toast ? "show" : ""}`}>
        <span>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}
