"use client";
/* Browser storage is hydrated after SSR; write failures are reflected in React state. */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useReducer, useState, type SetStateAction } from "react";
import {
  parseBackup,
  STORAGE_KEY,
  type Workout,
  type WorkoutTemplate,
} from "@/lib/training";

import { historyReducer } from "@/lib/history";
export function useTrainingStore() {
  const [history, dispatch] = useReducer(historyReducer, {
    current: [],
    past: [],
  });
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [error, setError] = useState("");
  const items = history.current;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = parseBackup(raw);
        dispatch({ type: "load", items: data.workouts });
        setTemplates(data.templates);
      }
      setCanSave(true);
    } catch {
      setError(
        "No se pudieron leer los datos locales. Exportá o recuperá tu respaldo antes de continuar; los datos guardados no se sobrescribirán.",
      );
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated || !canSave) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, workouts: items, templates }),
      );
      setError("");
    } catch {
      setError(
        "No se pudieron guardar los cambios. Exportá un respaldo JSON antes de cerrar la página.",
      );
    }
  }, [hydrated, canSave, items, templates]);
  return {
    workouts: history.current,
    setWorkouts: (update: SetStateAction<Workout[]>) =>
      dispatch({ type: "change", update }),
    templates,
    setTemplates,
    hydrated,
    error,
    canUndo: !!history.past.length,
    undo: () => dispatch({ type: "undo" }),
    allowSave: () => setCanSave(true),
  };
}
