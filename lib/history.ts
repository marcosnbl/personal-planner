import type { SetStateAction } from "react";
import type { Workout } from "./training";
export type History = { current: Workout[]; past: Workout[][] };
export type Action =
  | { type: "change"; update: SetStateAction<Workout[]> }
  | { type: "load"; items: Workout[] }
  | { type: "undo" };
export function historyReducer(state: History, action: Action): History {
  if (action.type === "load") return { current: action.items, past: [] };
  if (action.type === "undo")
    return state.past.length
      ? {
          current: state.past[state.past.length - 1],
          past: state.past.slice(0, -1),
        }
      : state;
  const current =
    typeof action.update === "function"
      ? action.update(state.current)
      : action.update;
  return { current, past: [...state.past.slice(-19), state.current] };
}
