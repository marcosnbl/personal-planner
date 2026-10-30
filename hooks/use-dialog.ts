"use client";
import { useEffect } from "react";
/** Keep keyboard navigation inside the active dialog and restore the trigger on close. */
export function useDialog(onClose: () => void) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href],[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    getFocusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = getFocusable();
      const first = list[0],
        last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog?.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = before;
      dialog?.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
    // The dialog lifetime owns focus; callbacks are recreated by its coordinator on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
