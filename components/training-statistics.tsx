"use client";
import { useState } from "react";
import {
  DISCIPLINES,
  TYPE_INFO,
  dateKey,
  mondayOf,
  plusDays,
  weekDays,
  summarize,
  fmtMinutes,
  monthShort,
  type Discipline,
  type Workout,
} from "@/lib/training";
type Metric = "km" | "minutes" | "elevation" | "rpe";
const labels: Record<Metric, string> = {
  km: "Kilómetros",
  minutes: "Tiempo (min)",
  elevation: "Desnivel (m D+)",
  rpe: "Esfuerzo percibido (RPE)",
};
export function TrainingStatistics({
  workouts,
  onBack,
}: {
  workouts: Workout[];
  onBack: () => void;
}) {
  const [discipline, setDiscipline] = useState<Discipline>("run");
  const [metric, setMetric] = useState<Metric>("km");
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = plusDays(mondayOf(new Date()), -7 * (11 - i));
    const keys = new Set(weekDays(start).map(dateKey));
    return {
      start,
      totals: summarize(
        workouts.filter((w) => keys.has(w.date)),
        discipline,
      ),
    };
  });
  const max =
    metric === "rpe"
      ? 10
      : Math.max(1, ...weeks.map((w) => w.totals[metric] ?? 0));
  const recentKeys = new Set(weekDays(mondayOf(new Date())).map(dateKey));
  return (
    <section className="view-section">
      <div className="page-heading">
        <div>
          <div className="eyebrow">TU PROGRESO EN EL TIEMPO</div>
          <h1>Estadísticas</h1>
          <p>Volumen y esfuerzo por disciplina. Últimas 12 semanas.</p>
        </div>
      </div>
      <div className="stats-controls">
        <label className="field">
          Disciplina
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
          >
            {DISCIPLINES.filter((d) => d !== "rest").map((d) => (
              <option key={d} value={d}>
                {TYPE_INFO[d].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Métrica
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
          >
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <article className="chart-card">
        <h2>
          {labels[metric]} · {TYPE_INFO[discipline].label}
        </h2>
        <div
          className="discipline-chart"
          role="img"
          aria-label={`Gráfico de ${labels[metric]} de ${TYPE_INFO[discipline].label}. Los valores detallados están en la tabla inferior.`}
        >
          {weeks.map(({ start, totals }) => (
            <div className="discipline-bar-group" key={dateKey(start)}>
              <span>
                {totals[metric] === null ? "—" : totals[metric]!.toFixed(1)}
              </span>
              <div className="discipline-bar-track">
                <div
                  style={{ height: `${((totals[metric] ?? 0) / max) * 100}%` }}
                />
              </div>
              <small>
                {start.getDate()} {monthShort(start)}
              </small>
            </div>
          ))}
        </div>
        <p className="settings-note">
          {metric === "rpe"
            ? "Promedio de RPE informado en sesiones completadas; — indica que no hay registros."
            : "Solo sesiones completadas, de lunes a domingo."}
        </p>
      </article>
      <div className="table-scroll">
        <table className="training-table">
          <caption>Semana actual: comparación por disciplina</caption>
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Km reales / plan</th>
              <th>Tiempo</th>
              <th>D+</th>
              <th>Sesiones / plan</th>
              <th>Cumplimiento</th>
              <th>RPE</th>
            </tr>
          </thead>
          <tbody>
            {DISCIPLINES.filter((d) => d !== "rest").map((d) => {
              const t = summarize(
                workouts.filter((w) => recentKeys.has(w.date)),
                d,
              );
              return (
                <tr key={d}>
                  <th>{TYPE_INFO[d].label}</th>
                  <td>
                    {t.km.toFixed(1)} / {t.plannedKm.toFixed(1)}
                  </td>
                  <td>{fmtMinutes(t.minutes)}</td>
                  <td>{t.elevation} m</td>
                  <td>
                    {t.completed} / {t.planned}
                  </td>
                  <td>{t.adherence.toFixed(0)}%</td>
                  <td>{t.rpe?.toFixed(1) ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-scroll">
        <table className="training-table">
          <caption>{TYPE_INFO[discipline].label}: historial semanal</caption>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Km reales / plan</th>
              <th>Tiempo</th>
              <th>D+</th>
              <th>Cumplimiento de sesiones</th>
              <th>RPE</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(({ start, totals: t }) => (
              <tr key={dateKey(start)}>
                <th>{start.toLocaleDateString("es-AR")}</th>
                <td>
                  {t.km.toFixed(1)} / {t.plannedKm.toFixed(1)}
                </td>
                <td>{fmtMinutes(t.minutes)}</td>
                <td>{t.elevation} m</td>
                <td>
                  {t.completed} / {t.planned} · {t.adherence.toFixed(0)}%
                </td>
                <td>{t.rpe?.toFixed(1) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="back-link" onClick={onBack}>
        ← Volver a mi semana
      </button>
    </section>
  );
}
