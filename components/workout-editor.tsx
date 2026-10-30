"use client";
import { useDialog } from "@/hooks/use-dialog";
import { useState, type FormEvent } from "react";
import {
  Workout,
  Discipline,
  Status,
  TYPE_INFO,
  DISCIPLINES,
  emptyWorkout,
  makeId,
  parseDuration,
  parseBackup,
} from "@/lib/training";
export function WorkoutEditor({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Workout;
  onSave: (w: Workout) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useDialog(onClose);
  const editingId = initial.id;
  const [formDate, setFormDate] = useState(initial.date);
  const [type, setType] = useState<Discipline>(initial.type);
  const [workoutTitle, setWorkoutTitle] = useState(initial.title ?? "");
  const [mode, setMode] = useState<"plan" | "log">("plan");
  const [plannedDistance, setPlannedDistance] = useState(
    initial.plannedDistance ? String(initial.plannedDistance) : "",
  );
  const [actualDistance, setActualDistance] = useState(
    initial.actualDistance ? String(initial.actualDistance) : "",
  );
  const [plannedDuration, setPlannedDuration] = useState(
    initial.plannedDuration ? String(initial.plannedDuration) : "",
  );
  const [actualDuration, setActualDuration] = useState(
    initial.actualDuration ? String(initial.actualDuration) : "",
  );
  const [plannedElevation, setPlannedElevation] = useState(
    initial.plannedElevation ? String(initial.plannedElevation) : "",
  );
  const [actualElevation, setActualElevation] = useState(
    initial.actualElevation ? String(initial.actualElevation) : "",
  );
  const [gear, setGear] = useState(initial.gear ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [rpe, setRpe] = useState(initial.rpe ?? 5);
  const [includeRpe, setIncludeRpe] = useState(initial.rpe !== undefined);
  const [status, setStatus] = useState<Status>(initial.status);
  const [toast, setToast] = useState("");
  const notify = setToast;
  function saveWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plannedMinutes = parseDuration(plannedDuration),
      actualMinutes = parseDuration(actualDuration);
    if (plannedMinutes === null || actualMinutes === null) {
      notify("Usá minutos (90) o el formato HH:MM:SS (1:30:00)");
      return;
    }
    const previous = initial.id ? initial : undefined;
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
      rpe: includeRpe ? rpe : undefined,
      status: mode === "log" && status === "planned" ? "completed" : status,
    };
    try {
      parseBackup(JSON.stringify({ version: 2, workouts: [workout] }));
      onSave(workout);
    } catch {
      notify(
        "Revisá la fecha y las métricas: deben ser valores válidos y no negativos.",
      );
    }
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
  return (
    <>
      <div
        className="modal-backdrop open"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
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
              onClick={() => onClose()}
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
          <p role="alert" className="editor-error">
            {toast}
          </p>
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
                    <input
                      type="checkbox"
                      checked={includeRpe}
                      onChange={(e) => setIncludeRpe(e.target.checked)}
                      aria-label="Registrar esfuerzo percibido"
                    />
                    <div className="rpe-row">
                      <div className="rpe-emoji">{rpeFace}</div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        disabled={!includeRpe}
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
                  onClick={onDelete}
                >
                  Eliminar sesión
                </button>
              )}
              <div className="action-spacer" />
              <button
                type="button"
                className="secondary-button"
                onClick={() => onClose()}
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
    </>
  );
}
