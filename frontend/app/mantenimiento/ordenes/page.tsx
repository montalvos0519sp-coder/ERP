"use client";

import { Wrench } from "lucide-react";
import ModuleStub from "@/components/ModuleStub";
import { api } from "@/lib/api";

export default function OrdenesMantenimientoPage() {
  return (
    <ModuleStub
      icon={Wrench}
      title="Ordenes de Mantenimiento"
      subtitle="Ordenes preventivas y correctivas para la flota."
      gradient="linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08))"
      iconBgColor="linear-gradient(135deg,#F59E0B,#EF4444)"
      loader={() => api.getOrdenesMantenimiento()}
      columns={[
        { key: "folio", label: "Folio", format: (v) => <span className="font-mono">{v}</span> },
        { key: "tipo", label: "Tipo" },
        { key: "fecha_programada", label: "Programada", format: (v) => v ? new Date(v).toLocaleDateString("es-MX") : "-" },
        { key: "fecha_inicio", label: "Inicio", format: (v) => v ? new Date(v).toLocaleDateString("es-MX") : "-" },
        { key: "estado", label: "Estado" },
        { key: "costo", label: "Costo", align: "right", format: (v) => `$${Number(v || 0).toFixed(2)}` },
      ]}
    />
  );
}
