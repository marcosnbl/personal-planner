"use client";
import { useDialog } from "@/hooks/use-dialog";
import { useState } from "react";
import { TYPE_INFO, validDate, type Workout } from "@/lib/training";
export function MoveDialog({
  source,
  date,
  workouts,
  onConfirm,
  onClose,
}: {
  source: Workout;
  date?: string;
  workouts: Workout[];
  onConfirm: (date: string, swapId?: string) => void;
  onClose: () => void;
}) {
  useDialog(onClose);
  const [destination, setDestination] = useState(date ?? source.date);
  const [choice, setChoice] = useState("move");
  const [swapId, setSwapId] = useState("");
  const targets = workouts.filter(
    (w) => w.date === destination && w.id !== source.id,
  );
  return (
    <div className="modal-backdrop open">
      <section
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-title"
      >
        <div className="dialog-head">
          <h2 id="move-title">Mover entrenamiento</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p>{source.title || TYPE_INFO[source.type].label}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (validDate(destination))
              onConfirm(destination, choice === "swap" ? swapId : undefined);
          }}
        >
          <label className="field">
            Nueva fecha
            <input
              type="date"
              required
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setSwapId("");
                setChoice("move");
              }}
            />
          </label>
          {!!targets.length && (
            <fieldset className="move-choice">
              <legend>Este día ya tiene sesiones</legend>
              <label>
                <input
                  type="radio"
                  name="move-choice"
                  checked={choice === "move"}
                  onChange={() => setChoice("move")}
                />{" "}
                Mover y conservar las otras sesiones
              </label>
              <label>
                <input
                  type="radio"
                  name="move-choice"
                  checked={choice === "swap"}
                  onChange={() => setChoice("swap")}
                />{" "}
                Intercambiar fechas con una sesión
              </label>
              {choice === "swap" && (
                <label className="field">
                  Sesión a intercambiar
                  <select
                    required
                    value={swapId}
                    onChange={(e) => setSwapId(e.target.value)}
                  >
                    <option value="">Elegir sesión</option>
                    {targets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title || TYPE_INFO[w.type].label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                destination === source.date ||
                !validDate(destination) ||
                (choice === "swap" && !swapId)
              }
            >
              Confirmar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
