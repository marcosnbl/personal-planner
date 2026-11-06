import type { Workout, WorkoutTemplate } from "./training";

export type TrainingDocument = {
  version: number;
  workouts: Workout[];
  templates: WorkoutTemplate[];
};

export type Snapshot = { revision: number; document: TrainingDocument };

export type CachedSnapshot = Snapshot & { dirty: boolean };

export type SyncState = CachedSnapshot & {
  status: "idle" | "syncing" | "synced" | "error" | "conflict";
  message: string;
};

export type RemoteStore = {
  load: (knownRevision?: number) => Promise<Snapshot | null>;
  save: (document: TrainingDocument, revision: number) => Promise<Snapshot>;
};

/** Persist data changes, while keeping transient sync status out of storage. */
export function createSnapshotWriter(
  write: (snapshot: CachedSnapshot) => void,
) {
  let previous: CachedSnapshot | undefined;

  return (snapshot: CachedSnapshot) => {
    if (
      previous?.document === snapshot.document &&
      previous.revision === snapshot.revision &&
      previous.dirty === snapshot.dirty
    )
      return;

    const saved = {
      document: snapshot.document,
      revision: snapshot.revision,
      dirty: snapshot.dirty,
    };

    write(saved);
    previous = saved;
  };
}

export const accountStorageKey = (userId: string) =>
  `training-planner.account.${encodeURIComponent(userId)}.v1`;

export const emptyDocument = (): TrainingDocument => ({
  version: 2,
  workouts: [],
  templates: [],
});

export function mergeLocalData(
  remote: TrainingDocument,
  local: TrainingDocument,
): TrainingDocument {
  function merge<T extends { id: string }>(left: T[], right: T[]): T[] {
    const result = [...left];

    for (const item of right) {
      const existing = result.find((w) => w.id === item.id);

      if (!existing) {
        result.push(item);
        continue;
      }
      if (JSON.stringify(existing) === JSON.stringify(item)) continue;

      const id = `local:${item.id}`;

      if (!result.some((w) => w.id === id)) result.push({ ...item, id });
    }

    return result;
  }

  return {
    version: 2,
    workouts: merge(remote.workouts, local.workouts),
    templates: merge(remote.templates, local.templates),
  };
}

/** A serial queue with revision checks. Failed or conflicting edits stay local. */
export class SyncEngine {
  state: SyncState;
  private remote: RemoteStore;
  private emit: (state: SyncState) => void;
  private ready = false;
  private hasSnapshot: boolean;
  private disposed = false;
  private running: Promise<void> | null = null;

  constructor(
    remote: RemoteStore,
    cached?: CachedSnapshot,
    onChange: (state: SyncState) => void = () => {},
  ) {
    this.remote = remote;
    this.hasSnapshot = cached !== undefined;
    this.emit = onChange;
    this.state = {
      document: cached?.document ?? emptyDocument(),
      revision: cached?.revision ?? 0,
      dirty: cached?.dirty ?? false,
      status: "idle",
      message: "",
    };
  }

  private update(patch: Partial<SyncState>) {
    if (this.disposed) return;
    if (
      Object.keys(patch).every((key) =>
        Object.is(
          this.state[key as keyof SyncState],
          patch[key as keyof SyncState],
        ),
      )
    )
      return;
    this.state = { ...this.state, ...patch };
    this.emit(this.state);
  }

  edit(document: TrainingDocument) {
    this.update({ document, dirty: true });
  }

  dispose() {
    this.disposed = true;
  }

  sync(): Promise<void> {
    if (this.disposed || this.state.status === "conflict")
      return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.perform().finally(() => {
      this.running = null;
    });

    return this.running;
  }

  private async perform() {
    if (!this.ready || this.state.dirty || this.state.status === "error") {
      this.update({ status: "syncing", message: "" });
    }

    try {
      if (!this.ready || !this.state.dirty) {
        const remote = await this.remote.load(
          this.hasSnapshot ? this.state.revision : undefined,
        );

        if (this.disposed) return;
        if (
          remote &&
          this.state.dirty &&
          remote.revision !== this.state.revision
        ) {
          this.update({
            status: "conflict",
            message:
              "Hay cambios en otro dispositivo. Exportá tu copia antes de cargar la versión de la nube.",
          });

          return;
        }
        if (
          remote &&
          !this.state.dirty &&
          (!this.hasSnapshot || remote.revision !== this.state.revision)
        ) {
          this.update({ ...remote, dirty: false });
        }
        this.hasSnapshot = true;
        this.ready = true;
      }
      while (this.state.dirty && !this.disposed) {
        const document = this.state.document;
        const saved = await this.remote.save(document, this.state.revision);

        if (this.disposed) return;
        this.update({
          revision: saved.revision,
          dirty: this.state.document !== document,
        });
      }
      this.update({ status: "synced", message: "" });
    } catch (error) {
      this.update({
        status:
          error instanceof Error && error.message.includes("SYNC_CONFLICT")
            ? "conflict"
            : "error",
        message:
          error instanceof Error && error.message.includes("SYNC_CONFLICT")
            ? "Hay cambios en otro dispositivo. Exportá tu copia antes de cargar la versión de la nube."
            : "No se pudo sincronizar. Tus cambios siguen en este navegador; reintentaremos al recuperar la conexión.",
      });
    }
  }

  async useRemote() {
    try {
      if (this.running) await this.running;
      if (this.disposed) return;

      const before = this.state.document;
      const remote = await this.remote.load();

      if (this.disposed) return;
      if (!remote) throw new Error("Missing remote snapshot");
      if (this.state.document !== before) {
        this.update({
          status: "conflict",
          message:
            "Hubo cambios locales mientras se descargaba la nube. Exportalos o volvé a confirmar la descarga.",
        });

        return;
      }
      this.ready = true;
      this.hasSnapshot = true;
      this.update({ ...remote, dirty: false, status: "synced", message: "" });
    } catch {
      this.update({
        status: "error",
        message: "No se pudo cargar la nube. Tus cambios locales se conservan.",
      });
    }
  }
}
