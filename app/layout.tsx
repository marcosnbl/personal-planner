import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./overrides.css";
import "./discipline-summary.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Training planner — Entrenamiento semanal",
  description: "Planifica y registra tus entrenamientos semanales.",
  appleWebApp: {
    capable: true,
    title: "Training planner",
    statusBarStyle: "default",
  },
  icons: { apple: "/icon-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#21211f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
