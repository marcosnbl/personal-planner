"use client";

import { useEffect, useRef } from "react";

/** Keep keyboard navigation inside the active dialog and restore the trigger on close. */
export function useDialog(onClose: () => void, active = true) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const before = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialog?.setAttribute("tabindex", "-1");

    // Block sibling branches at every level, keeping the dialog's ancestors active.
    const background: HTMLElement[] = [];
    for (
      let branch: HTMLElement | null = dialog;
      branch && branch !== document.body;
      branch = branch.parentElement
    ) {
      for (const sibling of branch.parentElement?.children ?? []) {
        if (sibling instanceof HTMLElement && sibling !== branch)
          background.push(sibling);
      }
    }
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });

    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href],[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);

    (getFocusable()[0] ?? dialog)?.focus();

    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();

        return;
      }
      if (event.key !== "Tab") return;

      const list = getFocusable();
      const first = list[0],
        last = list[list.length - 1];

      if (!first) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

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
      background.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      dialog?.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);
}
