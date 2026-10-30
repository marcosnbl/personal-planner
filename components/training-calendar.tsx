"use client";
import { useEffect, useRef, useState } from "react";
import {
  dateKey,
  SHORT_DAYS,
  TYPE_INFO,
  fmtMinutes,
  type Workout,
} from "@/lib/training";

type Props = {
  dates: Date[];
  workouts: Workout[];
  filter: string;
  layout: string;
  onEdit: (w: Workout) => void;
  onAdd: (date: string) => void;
  onMove: (id: string, date?: string) => void;
  onToggle: (id: string) => void;
  onDuplicate: (w: Workout) => void;
  onTemplate: (w: Workout) => void;
};
export function TrainingCalendar({
  dates,
  workouts,
  filter,
  layout,
  onEdit,
  onAdd,
  onMove,
  onToggle,
  onDuplicate,
  onTemplate,
}: Props) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const pointer = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const hit = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-workout-date]")
      ?.dataset.workoutDate;
  const cancel = () => {
    pointer.current = null;
    setDragged(null);
    setTarget(null);
  };
  useEffect(() => {
    if (!dragged || !pointer.current) return;
    let frame: number;
    const tick = () => {
      const p = pointer.current;
      if (!p) return;
      if (p.y < 72) window.scrollBy(0, -12);
      else if (p.y > innerHeight - 72) window.scrollBy(0, 12);
      setTarget(hit(p.x, p.y) ?? null);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragged]);
  return (
    <div
      className={`days-grid multi-calendar ${layout === "list" ? "list-mode" : ""}`}
    >
      {dates.map((date, index) => {
        const key = dateKey(date);
        const all = workouts.filter((w) => w.date === key);
        const items = all.filter((w) => filter === "all" || w.type === filter);
        return (
          <section
            key={key}
            data-workout-date={key}
            aria-label={`${SHORT_DAYS[index]} ${date.getDate()}`}
            className={`calendar-day ${key === dateKey(new Date()) ? "today" : ""} ${target === key ? "drop-target" : ""}`}
            onDragOver={(e) => {
              if (!dragged) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setTarget(key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setTarget(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData(
                "application/x-training-planner",
              );
              if (id === dragged) onMove(id, key);
              cancel();
            }}
          >
            <div className="day-top">
              <span className="day-name">{SHORT_DAYS[index]}</span>
              <span className="day-number">{date.getDate()}</span>
            </div>
            {items.map((w) => (
              <article
                key={w.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-training-planner",
                    w.id,
                  );
                  e.dataTransfer.effectAllowed = "move";
                  setDragged(w.id);
                }}
                onDragEnd={cancel}
                className={`session-card ${w.status === "completed" ? "completed" : ""} ${dragged === w.id ? "dragging" : ""}`}
              >
                <div className="session-heading">
                  <button className="session-title" onClick={() => onEdit(w)}>
                    {w.title || TYPE_INFO[w.type].label}
                  </button>
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`Arrastrar ${w.title || TYPE_INFO[w.type].label}`}
                    title="Arrastrar a otro día"
                    onDragStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      if (!e.isPrimary || e.button !== 0) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      pointer.current = {
                        id: w.id,
                        pointerId: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                      };
                      setDragged(w.id);
                    }}
                    onPointerMove={(e) => {
                      if (pointer.current?.pointerId === e.pointerId) {
                        pointer.current.x = e.clientX;
                        pointer.current.y = e.clientY;
                      }
                    }}
                    onPointerUp={(e) => {
                      const p = pointer.current;
                      if (!p || p.pointerId !== e.pointerId) return;
                      const destination = hit(e.clientX, e.clientY);
                      cancel();
                      if (destination) onMove(p.id, destination);
                    }}
                    onPointerCancel={cancel}
                    onLostPointerCapture={cancel}
                  >
                    <span aria-hidden="true">⠿</span>
                  </button>
                </div>
                <span className={`discipline-badge ${TYPE_INFO[w.type].badge}`}>
                  {TYPE_INFO[w.type].label}
                </span>
                <div className="session-metrics">
                  <span>
                    {w.status === "completed"
                      ? w.actualDistance
                      : w.plannedDistance}{" "}
                    km
                  </span>
                  <span>
                    {fmtMinutes(
                      w.status === "completed"
                        ? w.actualDuration
                        : w.plannedDuration,
                    )}
                  </span>
                  <span>
                    {w.status === "completed"
                      ? w.actualElevation
                      : w.plannedElevation}{" "}
                    m D+
                  </span>
                </div>
                <div className="session-actions">
                  <button
                    className="status-action"
                    onClick={() => onToggle(w.id)}
                    aria-label={`Cambiar estado de ${w.title || TYPE_INFO[w.type].label}`}
                  >
                    {w.status === "completed"
                      ? "✓ Completado"
                      : w.status === "skipped"
                        ? "Saltado"
                        : "○ Planificado"}
                  </button>
                  <details>
                    <summary aria-label="Acciones de la sesión">•••</summary>
                    <div className="session-menu">
                      <button onClick={() => onEdit(w)}>Editar sesión</button>
                      <button onClick={() => onMove(w.id)}>
                        Mover a otra fecha
                      </button>
                      <button onClick={() => onDuplicate(w)}>Duplicar</button>
                      <button onClick={() => onTemplate(w)}>
                        Guardar plantilla
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            ))}
            {!items.length && (
              <p className="day-empty">
                {all.length
                  ? "Sin sesiones para este filtro"
                  : "Sin entrenamientos"}
              </p>
            )}
            <button className="add-session" onClick={() => onAdd(key)}>
              ＋ Agregar sesión
            </button>
          </section>
        );
      })}
    </div>
  );
}
