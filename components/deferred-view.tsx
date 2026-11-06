"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useDialog } from "@/hooks/use-dialog";

function DeferredFallback({
  failed,
  modal,
  onClose,
  onRetry,
}: {
  failed: boolean;
  modal: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  useDialog(onClose, modal);

  const content = (
    <>
      <p role={failed ? "alert" : "status"}>
        {failed
          ? "No se pudo cargar esta vista. Revisá la conexión y reintentá."
          : "Cargando vista…"}
      </p>
      <div className="dialog-actions">
        {failed && (
          <button className="primary-button" onClick={onRetry}>
            Reintentar
          </button>
        )}
        <button className="secondary-button" onClick={onClose}>
          {modal ? "Cerrar" : "Volver"}
        </button>
      </div>
    </>
  );

  return modal ? (
    <div className="modal-backdrop open">
      <section
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={
          failed ? "Error al cargar formulario" : "Cargando formulario"
        }
      >
        {content}
      </section>
    </div>
  ) : (
    <section className="view-section">{content}</section>
  );
}

/** Keep import failures local and start a fresh attempt when the user retries. */
export function createDeferredView<Props extends object>(
  load: () => Promise<ComponentType<Props>>,
  close: (props: Props) => () => void,
  modal = false,
) {
  return function DeferredView(props: Props) {
    const [Component, setComponent] = useState<ComponentType<Props> | null>(
      null,
    );
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      let active = true;
      void load().then(
        (component) => {
          if (active) setComponent(() => component);
        },
        () => {
          if (active) setFailed(true);
        },
      );
      return () => {
        active = false;
      };
    }, [attempt]);

    if (Component) return <Component {...props} />;
    return (
      <DeferredFallback
        modal={modal}
        failed={failed}
        onClose={close(props)}
        onRetry={() => {
          setFailed(false);
          setAttempt((value) => value + 1);
        }}
      />
    );
  };
}
