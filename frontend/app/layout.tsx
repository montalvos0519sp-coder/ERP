import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "ERP Profesional",
  description: "Sistema ERP multi-empresa configurable, con facturacion CFDI 4.0 y Carta Porte 3.1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('erp.theme.dark');document.documentElement.setAttribute('data-theme',(d===null||d==='true')?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body className="antialiased h-full m-0 p-0 overflow-hidden" suppressHydrationWarning>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
