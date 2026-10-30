"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

import {
  ThemeMode,
  Workout,
  THEME_KEY,
  TYPE_INFO,
  DISCIPLINES,
  dateKey,
  mondayOf,
  monthShort,
  plusDays,
  weekDays,
  weekNumber,
  emptyWorkout,
  toggleWorkoutStatus,
} from "@/lib/training";

import { Icon } from "@/components/icon";
import { InstallApp } from "@/components/install-app";
import { PlanningTools } from "@/components/planning-tools";
import { TrainingStatistics } from "@/components/training-statistics";
import { TrainingCalendar } from "@/components/training-calendar";
import { MoveDialog } from "@/components/move-dialog";
import { WorkoutEditor } from "@/components/workout-editor";
import { useTrainingStore } from "@/hooks/use-training-store";
import { copyWeek, plannedCopy, parseBackup, relocate } from "@/lib/training";
export default function HomePage() {
  const {
    workouts,
    setWorkouts,
    templates,
    setTemplates,
    hydrated,
    error: storageError,
    canUndo,
    undo,
    allowSave,
  } = useTrainingStore();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [view, setView] = useState<"week" | "stats">("week");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<"workout" | "settings" | null>(null);
  const [templateSource, setTemplateSource] = useState<Workout | null>(null);
  const [editor, setEditor] = useState<Workout | null>(null);
  const [toast, setToast] = useState("");
  const [pendingMove, setPendingMove] = useState<{
    id: string;
    date?: string;
  } | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const initialTheme: ThemeMode = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    // Hydrate the saved browser preference after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initialTheme);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [hydrated, theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.body.style.overflow =
      modal || editor || pendingMove || templateSource ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal, editor, pendingMove, templateSource]);

  const dates = useMemo(() => weekDays(weekStart), [weekStart]);
  const todayKey = dateKey(new Date());
  const currentDateInWeek = dates.find((date) => dateKey(date) === todayKey);
  const defaultNewWorkoutDate = dateKey(currentDateInWeek ?? dates[0]);
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
  function notify(message: string) {
    setToast(message);
  }
  function moveWorkout(id: string, destination?: string) {
    const source = workouts.find((w) => w.id === id);
    if (!source || destination === source.date) return;
    if (
      !destination ||
      workouts.some((w) => w.date === destination && w.id !== id)
    ) {
      setPendingMove({ id, date: destination });
      return;
    }
    setWorkouts((current) => relocate(current, id, destination));
    notify("Sesión movida");
  }
  function openWorkout(date = dateKey(new Date()), id?: string) {
    setEditor(
      id
        ? (workouts.find((w) => w.id === id) ?? null)
        : { ...emptyWorkout(date), id: "" },
    );
  }
  function saveWorkoutRecord(workout: Workout) {
    setWorkouts((current) =>
      current.some((w) => w.id === workout.id)
        ? current.map((w) => (w.id === workout.id ? workout : w))
        : [...current, workout],
    );
    setWeekStart(mondayOf(new Date(workout.date + "T12:00:00")));
    setEditor(null);
    notify("Sesión guardada");
  }
  function quickToggle(id: string) {
    setWorkouts((current) =>
      current.map((w) => (w.id === id ? toggleWorkoutStatus(w) : w)),
    );
    notify(
      "Estado actualizado. Al completar se confirman los valores planificados.",
    );
  }
  function deleteWorkout() {
    if (!editor?.id) return;
    setWorkouts((current) => current.filter((w) => w.id !== editor.id));
    setEditor(null);
    notify("Sesión eliminada");
  }
  function exportFile(kind: "json" | "csv") {
    let content: string, mime: string, filename: string;
    if (kind === "json") {
      content = JSON.stringify({ version: 2, workouts, templates }, null, 2);
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
        const data = parseBackup(String(reader.result));
        if (
          !window.confirm(
            "Se reemplazarán las sesiones actuales por las del respaldo. Podés deshacer los cambios de sesiones. ¿Continuar?",
          )
        )
          return;
        setWorkouts(data.workouts);
        setTemplates(data.templates);
        allowSave();
        notify("Datos importados correctamente");
      } catch {
        notify("No se pudo importar ese archivo");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }
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
              <Icon name="settings" />
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
            <InstallApp compact />
            <button
              className="secondary-button"
              disabled={!canUndo}
              onClick={() => {
                undo();
                notify("Último cambio deshecho");
              }}
            >
              Deshacer
            </button>
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
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
            <button
              className="today-link"
              onClick={() => setWeekStart(mondayOf(new Date()))}
            >
              ◷ <span>Ir a hoy</span>
            </button>
            <button
              className="primary-button"
              onClick={() => openWorkout(defaultNewWorkoutDate)}
            >
              <span>＋</span> Nuevo entrenamiento
            </button>
            <button
              className="icon-button mobile-settings"
              onClick={() => setModal("settings")}
              aria-label="Configuración"
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>
        {storageError && (
          <p className="storage-error" role="alert">
            {storageError}
          </p>
        )}
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
                  <span className="kpi-icon orange">
                    <Icon name="distance" />
                  </span>
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
                  <span className="kpi-icon blue">
                    <Icon name="time" />
                  </span>
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
                  <span className="kpi-icon lime">
                    <Icon name="elevation" />
                  </span>
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
                  <span className="kpi-icon violet">
                    <Icon name="sessions" />
                  </span>
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
                  Podés agregar varias sesiones por día y moverlas desde su menú
                  o arrastrándolas.
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
            <PlanningTools
              weekStart={weekStart}
              count={weeklyWorkouts.length}
              templates={templates}
              source={templateSource}
              onClearSource={() => setTemplateSource(null)}
              onSaveTemplate={(t) => {
                setTemplates((current) => [...current, t]);
                notify("Plantilla guardada");
              }}
              onDeleteTemplate={(id) =>
                setTemplates((current) => current.filter((t) => t.id !== id))
              }
              onUse={(w) =>
                setEditor({ ...plannedCopy(w, defaultNewWorkoutDate), id: "" })
              }
              onCopyWeek={(date) => {
                try {
                  const destination = mondayOf(new Date(date + "T12:00:00"));
                  setWorkouts(copyWeek(workouts, weekStart, destination));
                  setWeekStart(destination);
                  notify("Semana copiada como planificación");
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : "No se pudo copiar",
                  );
                }
              }}
            />
            <TrainingCalendar
              dates={dates}
              workouts={weeklyWorkouts}
              filter={filter}
              layout={layout}
              onAdd={(date) => openWorkout(date)}
              onEdit={(w) => openWorkout(w.date, w.id)}
              onMove={moveWorkout}
              onToggle={quickToggle}
              onDuplicate={(w) => {
                setEditor({ ...plannedCopy(w, w.date), id: "" });
              }}
              onTemplate={(w) => setTemplateSource(w)}
            />
            <footer className="page-footer">
              <span>
                <span className="footer-pulse">✳</span>Los días de descanso
                también son parte del plan.
              </span>
            </footer>
          </section>
        ) : (
          <TrainingStatistics
            workouts={workouts}
            onBack={() => setView("week")}
          />
        )}
      </main>

      {pendingMove && workouts.find((w) => w.id === pendingMove.id) && (
        <MoveDialog
          source={workouts.find((w) => w.id === pendingMove.id)!}
          date={pendingMove.date}
          workouts={workouts}
          onClose={() => setPendingMove(null)}
          onConfirm={(date, swapId) => {
            setWorkouts((current) =>
              relocate(current, pendingMove.id, date, swapId),
            );
            setWeekStart(mondayOf(new Date(date + "T12:00:00")));
            setPendingMove(null);
            notify(swapId ? "Fechas intercambiadas" : "Sesión movida");
          }}
        />
      )}
      {editor && (
        <WorkoutEditor
          initial={editor}
          onSave={saveWorkoutRecord}
          onDelete={deleteWorkout}
          onClose={() => setEditor(null)}
        />
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
              <p className="install-help">
                Para instalar en el celular: menú del navegador → Instalar
                aplicación. En iPhone: Safari → Compartir → Agregar a inicio.
                Disponible en producción con HTTPS.
              </p>
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
      <div role="status" className={`toast ${toast ? "show" : ""}`}>
        <span>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}
