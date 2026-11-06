import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./overrides.css";
import "./discipline-summary.css";
import "./theme.css";
import { THEME_KEY } from "@/lib/training";

const themeBootstrap = `(function(){var theme="light";try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")theme="dark";}catch(error){}document.documentElement.dataset.theme=theme;})();`;

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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          id="theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
