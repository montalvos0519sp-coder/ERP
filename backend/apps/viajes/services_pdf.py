"""PDF profesional de la Carta de Traslado de un Viaje (reportlab)."""
from __future__ import annotations

from io import BytesIO


def carta_traslado_pdf(viaje) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    )

    INDIGO = colors.HexColor("#4F46E5")
    DARK = colors.HexColor("#1E293B")
    GREY = colors.HexColor("#64748B")
    LIGHT = colors.HexColor("#EEF0FB")

    emp = viaje.empresa
    nombre_emp = getattr(emp, "nombre_comercial", "") or getattr(emp, "razon_social", "") or ""
    cp = viaje.carta_porte

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm, title=f"Carta de Traslado {viaje.folio_carta}")
    styles = getSampleStyleSheet()
    h = ParagraphStyle("h", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=15, textColor=INDIGO)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=GREY)
    sec = ParagraphStyle("sec", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10.5, textColor=INDIGO, spaceBefore=8, spaceAfter=3)
    cell = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8.5, textColor=DARK)
    cellb = ParagraphStyle("cellb", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)

    el = []
    # Encabezado
    enc = Table([[
        Paragraph(f"<b>{nombre_emp}</b>", ParagraphStyle("e", fontSize=12, textColor=DARK)),
        Paragraph("CARTA DE TRASLADO", h),
    ], [
        Paragraph(f"Folio: <b>{viaje.folio_carta or viaje.numero}</b> &nbsp;·&nbsp; Carga: {viaje.folio_carga or '—'}", sub),
        Paragraph(f"Fecha: {viaje.fecha_viaje.strftime('%d/%m/%Y') if viaje.fecha_viaje else '—'} &nbsp;·&nbsp; Estado: {viaje.estado}", sub),
    ]], colWidths=[95 * mm, 80 * mm])
    enc.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    el.append(enc)
    if cp and cp.folio_fiscal and cp.estado == "TIMBRADO":
        el.append(Paragraph(f"UUID (Carta Porte): <b>{cp.folio_fiscal}</b>", sub))
    el.append(Spacer(1, 6))

    def tabla(title, headers, rows, widths):
        el.append(Paragraph(title, sec))
        data = [[Paragraph(x, cellb) for x in headers]]
        for r in rows:
            data.append([Paragraph(str(x), cell) for x in r])
        t = Table(data, colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ]))
        el.append(t)

    # Operador / Unidad
    op = viaje.operador
    un = viaje.unidad
    tabla("Operador y unidad", ["Operador", "RFC", "Licencia", "Unidad", "Placas", "Config."],
          [[op.nombre if op else "—", op.rfc if op else "—", (op.licencia if op else "—") or "—",
            un.numero if un else "—", (un.placas if un else "—") or "—", (un.config_vehicular if un else "—") or "—"]],
          [32 * mm, 26 * mm, 26 * mm, 24 * mm, 26 * mm, 22 * mm])

    # Itinerario
    paradas = list(viaje.paradas.select_related("ubicacion").all())
    total = len(paradas)
    rows = []
    for i, p in enumerate(paradas):
        tipo = "Origen" if i == 0 else ("Destino" if i == total - 1 else "Intermedia")
        rows.append([p.codigo_tramo(total), tipo, p.ubicacion.nombre,
                     f"CP {p.ubicacion.codigo_postal}" if p.ubicacion.codigo_postal else "",
                     p.fecha_hora.strftime("%d/%m/%Y %H:%M") if p.fecha_hora else "—",
                     f"{p.kms:.2f}"])
    tabla("Itinerario", ["ID", "Tipo", "Ubicación", "CP", "Fecha/Hora", "Kms"],
          rows or [["—", "—", "Sin paradas", "", "", "0.00"]],
          [22 * mm, 20 * mm, 56 * mm, 20 * mm, 34 * mm, 18 * mm])
    el.append(Paragraph(f"<b>Kilómetros totales:</b> {viaje.kms_totales:.2f} km", sub))

    # Mercancías
    mrows = []
    for m in viaje.mercancias.all():
        mrows.append([m.clave_producto or "—", m.descripcion + (" ⚠ PELIGROSA" if m.material_peligroso else ""),
                      f"{m.cantidad:.2f}", m.unidad_medida, f"{m.peso_kg:.3f}",
                      m.clave_material_peligroso or ""])
    tabla("Mercancías", ["ClaveProdServ", "Descripción", "Cant.", "UM", "Peso kg", "Mat. Pel."],
          mrows or [["—", "Sin mercancías", "0", "—", "0", ""]],
          [26 * mm, 64 * mm, 18 * mm, 16 * mm, 22 * mm, 24 * mm])

    el.append(Spacer(1, 16))
    firma = Table([["_______________________", "_______________________"],
                   ["Operador", "Responsable de tráfico"]],
                  colWidths=[85 * mm, 85 * mm])
    firma.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("FONTSIZE", (0, 0), (-1, -1), 8),
                               ("TEXTCOLOR", (0, 1), (-1, 1), GREY)]))
    el.append(firma)

    doc.build(el)
    buf.seek(0)
    return buf.read()
