"""Generador de codigos de barras y QR para productos.

Centralizado para que ViewSets, exports PDF y la pagina de etiquetas usen la
misma logica de eleccion de simbologia.

Simbologias soportadas:
    QR       -> python-qrcode (acepta cualquier string)
    CODE128  -> python-barcode (alfanumerico de longitud variable)
    CODE39   -> python-barcode (alfanumerico, set limitado)
    EAN13    -> python-barcode (exactamente 12 digitos, calcula checksum)
    EAN8     -> python-barcode (exactamente 7 digitos, calcula checksum)
    UPCA     -> python-barcode (exactamente 11 digitos, calcula checksum)
    ITF      -> python-barcode (digitos, longitud par)

Devolvemos PNG en BytesIO. La salida es directa para FileResponse o usar en PDF.
"""
from __future__ import annotations

import io
import re
from typing import Optional

import qrcode
from barcode import (
    Code39, Code128, EAN8, EAN13, UPCA, ITF,
)
from barcode.writer import ImageWriter


# ── Excepciones controladas ────────────────────────────────────────────────
class BarcodeError(ValueError):
    """El payload no es valido para la simbologia solicitada."""


# Mapa simbologia -> (clase, validador, longitud esperada).
# El validador devuelve el payload normalizado (sin checksum, lo agrega la
# biblioteca) o lanza BarcodeError.
_DIGITS_RE = re.compile(r"\D+")


def _solo_digitos(s: str, n_exigidos: int, simbologia: str) -> str:
    s = _DIGITS_RE.sub("", s or "")
    if len(s) != n_exigidos:
        raise BarcodeError(
            f"{simbologia} exige exactamente {n_exigidos} digitos; recibimos {len(s)}."
        )
    return s


def _solo_digitos_par(s: str, simbologia: str) -> str:
    s = _DIGITS_RE.sub("", s or "")
    if len(s) == 0 or len(s) % 2 != 0:
        raise BarcodeError(f"{simbologia} exige una cantidad par de digitos (>=2).")
    return s


def _code128_valido(s: str) -> str:
    if not s:
        raise BarcodeError("CODE128 requiere texto no vacio.")
    return s


def _code39_valido(s: str) -> str:
    if not s:
        raise BarcodeError("CODE39 requiere texto no vacio.")
    # python-barcode mete el simbolo en uppercase. Solo dejamos chars del subset.
    valido = set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%")
    sup = s.upper()
    for c in sup:
        if c not in valido:
            raise BarcodeError(
                f"CODE39 no acepta el caracter '{c}'. Usa A-Z, 0-9, '-. $/+%'."
            )
    return sup


# ── Generadores ────────────────────────────────────────────────────────────
def _barcode_to_png(barcode_obj, *, dpi: int = 200, module_width: float = 0.3,
                    module_height: float = 12.0, font_size: int = 10,
                    text_distance: float = 4.0, write_text: bool = True) -> bytes:
    """Renderiza el barcode lineal a PNG en memoria."""
    buf = io.BytesIO()
    options = {
        "dpi": dpi,
        "module_width": module_width,
        "module_height": module_height,
        "font_size": font_size,
        "text_distance": text_distance,
        "quiet_zone": 2.0,
        "write_text": write_text,
        "background": "white",
        "foreground": "black",
    }
    barcode_obj.write(buf, options=options)
    return buf.getvalue()


def _qr_to_png(payload: str, *, box_size: int = 10, border: int = 2,
               error_correction: str = "M") -> bytes:
    correction_map = {
        "L": qrcode.constants.ERROR_CORRECT_L,
        "M": qrcode.constants.ERROR_CORRECT_M,
        "Q": qrcode.constants.ERROR_CORRECT_Q,
        "H": qrcode.constants.ERROR_CORRECT_H,
    }
    qr = qrcode.QRCode(
        version=None,
        error_correction=correction_map.get(error_correction.upper(), qrcode.constants.ERROR_CORRECT_M),
        box_size=box_size,
        border=border,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── API publica ─────────────────────────────────────────────────────────────
def generar_codigo_png(
    simbologia: str,
    payload: str,
    *,
    incluir_texto: bool = True,
    escala: int = 1,
) -> bytes:
    """Devuelve bytes PNG con el codigo solicitado.

    Args:
        simbologia: una de QR / CODE128 / CODE39 / EAN13 / EAN8 / UPCA / ITF.
        payload: texto/numero a codificar.
        incluir_texto: si True (default), agrega el texto debajo del barcode
                       (no aplica a QR).
        escala: 1 (default) o 2/3 para etiquetas mas grandes.

    Raises:
        BarcodeError: si el payload no es valido para la simbologia.
    """
    if not simbologia:
        simbologia = "QR"
    simbologia = simbologia.upper()
    if not payload:
        raise BarcodeError("Payload vacio.")

    escala = max(1, min(escala, 6))

    if simbologia == "QR":
        return _qr_to_png(payload, box_size=8 * escala, border=2)

    if simbologia == "CODE128":
        return _barcode_to_png(
            Code128(_code128_valido(payload), writer=ImageWriter()),
            module_width=0.30 * escala, module_height=15.0 * escala,
            write_text=incluir_texto,
        )

    if simbologia == "CODE39":
        return _barcode_to_png(
            Code39(_code39_valido(payload), writer=ImageWriter(), add_checksum=False),
            module_width=0.30 * escala, module_height=15.0 * escala,
            write_text=incluir_texto,
        )

    if simbologia == "EAN13":
        return _barcode_to_png(
            EAN13(_solo_digitos(payload, 12, "EAN13"), writer=ImageWriter()),
            module_width=0.33 * escala, module_height=15.0 * escala,
            write_text=incluir_texto,
        )

    if simbologia == "EAN8":
        return _barcode_to_png(
            EAN8(_solo_digitos(payload, 7, "EAN8"), writer=ImageWriter()),
            module_width=0.33 * escala, module_height=15.0 * escala,
            write_text=incluir_texto,
        )

    if simbologia == "UPCA":
        return _barcode_to_png(
            UPCA(_solo_digitos(payload, 11, "UPCA"), writer=ImageWriter()),
            module_width=0.33 * escala, module_height=15.0 * escala,
            write_text=incluir_texto,
        )

    if simbologia == "ITF":
        return _barcode_to_png(
            ITF(_solo_digitos_par(payload, "ITF"), writer=ImageWriter()),
            module_width=0.30 * escala, module_height=15.0 * escala,
            write_text=incluir_texto,
        )

    raise BarcodeError(f"Simbologia no soportada: {simbologia}")


def payload_para_producto(producto) -> str:
    """Decide que valor codificar segun los datos del producto.

    Prioridad:
      1) producto.codigo_barras si esta poblado.
      2) producto.sku.
      3) producto.codigo_interno.
    """
    return (producto.codigo_barras or producto.sku or producto.codigo_interno).strip()
