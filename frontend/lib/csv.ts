// Exporta filas a un archivo CSV (con BOM para acentos en Excel).
export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
