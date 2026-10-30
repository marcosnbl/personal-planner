"use client";
import { useState } from "react";
import {
  TYPE_INFO,
  emptyWorkout,
  dateKey,
  plusDays,
  type Workout,
  type WorkoutTemplate,
} from "@/lib/training";
const suggestions = [
  { name: "Rodaje suave", km: 8, min: 50 },
  { name: "Series", km: 10, min: 60 },
  { name: "Long Run", km: 20, min: 120 },
];
type Props = {
  weekStart: Date;
  count: number;
  templates: WorkoutTemplate[];
  source: Workout | null;
  onClearSource: () => void;
  onSaveTemplate: (t: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onUse: (w: Workout) => void;
  onCopyWeek: (date: string) => void;
};
export function PlanningTools({
  weekStart,
  count,
  templates,
  source,
  onClearSource,
  onSaveTemplate,
  onDeleteTemplate,
  onUse,
  onCopyWeek,
}: Props) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [library, setLibrary] = useState(false);
  const [destination, setDestination] = useState("");
  return (
    <div className="planning-tools">
      <button
        className="secondary-button"
        disabled={!count}
        onClick={() => {
          setDestination(dateKey(plusDays(weekStart, 7)));
          setCopyOpen(true);
        }}
      >
        Copiar semana
      </button>
      <button
        className="secondary-button"
        onClick={() => setLibrary(!library)}
        aria-expanded={library}
      >
        Plantillas
      </button>
      {library && (
        <section className="template-library">
          <h3>Tus plantillas</h3>
          {!templates.length && (
            <p>
              Todavía no guardaste plantillas. Podés guardar cualquier sesión
              desde su menú.
            </p>
          )}
          {templates.map((t) => (
            <div className="template-row" key={t.id}>
              <button onClick={() => onUse(t.workout)}>
                {t.name} · {TYPE_INFO[t.workout.type].label}
              </button>
              <button
                aria-label={`Eliminar plantilla ${t.name}`}
                onClick={() => onDeleteTemplate(t.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
          <h3>Para empezar</h3>
          <p>Estas sugerencias son editables antes de guardar.</p>
          {suggestions.map((s) => (
            <button
              key={s.name}
              className="secondary-button"
              onClick={() =>
                onUse({
                  ...emptyWorkout(dateKey(weekStart)),
                  title: s.name,
                  plannedDistance: s.km,
                  plannedDuration: s.min,
                })
              }
            >
              {s.name}
            </button>
          ))}
        </section>
      )}
      {copyOpen && (
        <div className="modal-backdrop open">
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-title"
          >
            <h2 id="copy-title">Copiar semana</h2>
            <p>
              Se agregarán {count} sesiones planificadas a la semana elegida.
              Las sesiones existentes se conservan. Los registros reales no se
              copian.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCopyWeek(destination);
                setCopyOpen(false);
              }}
            >
              <label className="field">
                Un día de la semana de destino
                <input
                  type="date"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </label>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCopyOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primary-button">
                  Copiar {count} sesiones
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {source && (
        <div className="modal-backdrop open">
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-title"
          >
            <h2 id="template-title">Guardar plantilla</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = new FormData(e.currentTarget)
                  .get("name")
                  ?.toString()
                  .trim();
                if (!name) return;
                onSaveTemplate({
                  id: crypto.randomUUID(),
                  name,
                  workout: { ...source, title: name },
                });
                onClearSource();
              }}
            >
              <label className="field">
                Nombre
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={source.title || TYPE_INFO[source.type].label}
                />
              </label>
              <p>
                Se guardan la planificación y el equipo. Al usarla, elegís la
                fecha y confirmás los datos.
              </p>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onClearSource}
                >
                  Cancelar
                </button>
                <button className="primary-button">Guardar plantilla</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
