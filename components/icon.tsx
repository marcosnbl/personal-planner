import type { CSSProperties } from "react";
type Name =
  "sun" | "moon" | "settings" | "distance" | "time" | "elevation" | "sessions";
const paths: Record<Name, string> = {
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20 14a8 8 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z",
  settings:
    "m9 3-.5 3-2 .9L4 6l-2 3 2.5 2v2L2 15l2 3 2.5-.9 2 .9.5 3h6l.5-3 2-.9L20 18l2-3-2.5-2v-2L22 9l-2-3-2.5.9-2-.9L15 3H9Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  distance: "M5 19 19 5M8 5h11v11",
  time: "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  elevation: "m2 19 7-12 4 7 3-4 6 9H2Z",
  sessions:
    "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 10 3 3 5-5",
};
export function Icon({ name, style }: { name: Name; style?: CSSProperties }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
