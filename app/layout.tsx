import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

export const metadata: Metadata = {
  title: "Synergy CG · ERP a la medida + ISO 9001",
  description:
    "ERP inteligente hecho a tu medida. Flujos y herramientas configurables que se adaptan a cualquier empresa, con módulo y acompañamiento para certificación ISO 9001.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('synergy.theme.dark');document.documentElement.setAttribute('data-theme',(d==='false')?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body className="antialiased h-full m-0 p-0 overflow-hidden" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
