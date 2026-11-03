"use client";
/* Hydration and persistence synchronize an external browser storage system. */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState, type SetStateAction } from "react";
import {
  parseBackup,
  STORAGE_KEY,
  type Workout,
  type WorkoutTemplate,
} from "@/lib/training";
import { historyReducer, type History, type Action } from "@/lib/history";
import {
  accountStorageKey,
  emptyDocument,
  SyncEngine,
  mergeLocalData,
  type TrainingDocument,
  type CachedSnapshot,
  type SyncState,
} from "@/lib/cloud-sync";
import { createRemoteStore } from "@/lib/supabase/remote-store";
import { useAccount } from "@/components/account-provider";
export function useTrainingStore() {
  const { client, user } = useAccount();
  const owner = user?.id;
  const [history, setHistory] = useState<History>({ current: [], past: [] });
  const historyRef = useRef(history);
  const [templates, setTemplateState] = useState<WorkoutTemplate[]>([]);
  const documentRef = useRef<TrainingDocument>(emptyDocument());
  const engineRef = useRef<SyncEngine | null>(null);
  const safeToSave = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [hasLocalData, setHasLocalData] = useState(false);
  const key = owner ? accountStorageKey(owner) : STORAGE_KEY;
  const dispatch = (action: Action) => {
    historyRef.current = historyReducer(historyRef.current, action);
    setHistory(historyRef.current);
  };
  function saveLocal(document: TrainingDocument, snapshot?: CachedSnapshot) {
    if (!safeToSave.current) return;
    if (owner && !snapshot) return;
    try {
      localStorage.setItem(key, JSON.stringify(owner ? snapshot : document));
      setError("");
    } catch {
      setError(
        "No se pudo guardar la copia local. Exportá un JSON antes de cerrar la página.",
      );
    }
  }
  function applyRemote(state: SyncState) {
    if (
      JSON.stringify(documentRef.current) !== JSON.stringify(state.document)
    ) {
      documentRef.current = state.document;
      dispatch({ type: "load", items: state.document.workouts });
      setTemplateState(state.document.templates);
    }
    saveLocal(state.document, state);
    setSyncState(state);
  }
  useEffect(() => {
    let engine: SyncEngine | null = null;
    try {
      const raw = localStorage.getItem(key);
      let cached: CachedSnapshot | undefined;
      if (raw) {
        const value = JSON.parse(raw);
        if (owner) {
          if (
            !Number.isSafeInteger(value.revision) ||
            value.revision < 0 ||
            typeof value.dirty !== "boolean"
          )
            throw Error("cache");
          cached = {
            document: parseBackup(JSON.stringify(value.document)),
            revision: value.revision,
            dirty: value.dirty,
          };
        } else documentRef.current = parseBackup(raw);
      }
      safeToSave.current = true;
      if (owner && client) {
        engine = new SyncEngine(
          createRemoteStore(client, owner),
          cached,
          applyRemote,
        );
        engineRef.current = engine;
        documentRef.current = engine.state.document;
        dispatch({ type: "load", items: engine.state.document.workouts });
        setTemplateState(engine.state.document.templates);
        setSyncState(engine.state);
        try {
          const guest = localStorage.getItem(STORAGE_KEY);
          if (guest) {
            const local = parseBackup(guest);
            setHasLocalData(
              !!(local.workouts.length || local.templates.length),
            );
          }
        } catch {
          /* A damaged guest backup must not block the account. */
        }
        void engine.sync();
      } else {
        dispatch({ type: "load", items: documentRef.current.workouts });
        setTemplateState(documentRef.current.templates);
      }
    } catch {
      safeToSave.current = false;
      setError(
        "No se pudo leer el almacenamiento local. El contenido original no se sobrescribirá. Exportá o recuperá un respaldo antes de continuar.",
      );
    }
    setHydrated(true);
    const sync = () => {
      if (!document.hidden) void engine?.sync();
    };
    const timer = window.setInterval(sync, 15000);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      engine?.dispose();
      engineRef.current = null;
      clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
    // The keyed account boundary remounts this store whenever the authenticated owner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function commit(document: TrainingDocument) {
    documentRef.current = document;
    if (engineRef.current) {
      engineRef.current.edit(document);
      void engineRef.current.sync();
    } else saveLocal(document);
  }
  const setWorkouts = (update: SetStateAction<Workout[]>) => {
    const items =
      typeof update === "function"
        ? update(documentRef.current.workouts)
        : update;
    dispatch({ type: "change", update: items });
    commit({ ...documentRef.current, workouts: items });
  };
  const setTemplates = (update: SetStateAction<WorkoutTemplate[]>) => {
    const next =
      typeof update === "function"
        ? update(documentRef.current.templates)
        : update;
    setTemplateState(next);
    commit({ ...documentRef.current, templates: next });
  };
  function undo() {
    dispatch({ type: "undo" });
    commit({ ...documentRef.current, workouts: historyRef.current.current });
  }
  function migrateLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const merged = mergeLocalData(documentRef.current, parseBackup(raw));
      dispatch({ type: "change", update: merged.workouts });
      setTemplateState(merged.templates);
      commit(merged);
      setHasLocalData(false);
    } catch {
      setError(
        "No se pudieron copiar los datos locales. Los originales se conservan.",
      );
    }
  }
  return {
    workouts: history.current,
    setWorkouts,
    templates,
    setTemplates,
    hydrated,
    error,
    canUndo: !!history.past.length,
    undo,
    allowSave: () => {
      safeToSave.current = true;
      if (owner && client && !engineRef.current) {
        engineRef.current = new SyncEngine(
          createRemoteStore(client, owner),
          { document: documentRef.current, revision: 0, dirty: true },
          applyRemote,
        );
      }
      commit(documentRef.current);
    },
    syncState,
    retrySync: () => engineRef.current?.sync(),
    loadRemote: () => engineRef.current?.useRemote(),
    hasLocalData,
    migrateLocal,
  };
}
