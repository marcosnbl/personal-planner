import type { Metadata } from "next";
import "./globals.css";
import "./overrides.css";
import "./discipline-summary.css";

export const metadata: Metadata = {
  title: "Training planner — Entrenamiento semanal",
  description: "Planifica y registra tus entrenamientos semanales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
