"""Carga TODOS los catalogos SAT desde los archivos Excel en /data_catalogos/.

Uso:
    python manage.py cargar_catalogos_sat                  # carga todos
    python manage.py cargar_catalogos_sat --solo cp        # solo Carta Porte
    python manage.py cargar_catalogos_sat --solo cp,unidad,cp_cp
    python manage.py cargar_catalogos_sat --archivo ruta/al/archivo.xlsx

El comando es idempotente: usa update_or_create (no borra ni duplica).
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalogos_sat.models import (
    SatClaveProdServ,
    SatClaveProdServCP,
    SatClaveUnidad,
    SatCodigoPostal,
    SatColonia,
    SatConfigVehicular,
    SatEstado,
    SatMunicipio,
    SatSubTipoRem,
)


def _read(path: Path, sheet=None) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"No existe: {path}")
    df = pd.read_excel(path, sheet_name=sheet, dtype=str)
    if isinstance(df, dict):
        # Si el archivo tiene varias hojas y no se pasa sheet_name, regresa dict.
        # Devolvemos la primera por defecto.
        df = list(df.values())[0]
    df = df.fillna("")
    return df


class Command(BaseCommand):
    help = "Carga catalogos SAT desde Excel a la base de datos."

    def add_arguments(self, parser):
        parser.add_argument("--solo", type=str, default="", help="cp,prod,unidad,cp_postal,municipio,estado,colonia")
        parser.add_argument("--archivo", type=str, default="", help="Sobreescribe el path por defecto")

    def handle(self, *args, **opts):
        base = Path(settings.CATALOGOS_SAT_DIR)
        solo = {s.strip() for s in opts["solo"].split(",") if s.strip()}

        def deberia(tag: str) -> bool:
            return not solo or tag in solo

        # ── Carta Porte 3.1 (catalogo principal) ────────────────────────────
        if deberia("cp"):
            self.stdout.write(self.style.NOTICE("Cargando ClaveProdServCP (Carta Porte 3.1)..."))
            path = Path(opts["archivo"]) if opts["archivo"] else base / "CatalogosCartaPorte31.xlsx"
            try:
                df = _read(path, sheet="c_ClaveProdServCP")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  no encontre hoja 'c_ClaveProdServCP': {e}"))
                df = pd.DataFrame()
            n = 0
            with transaction.atomic():
                for _, row in df.iterrows():
                    clave = str(row.get("c_ClaveProdServCP", "")).strip()
                    if not clave:
                        continue
                    SatClaveProdServCP.objects.update_or_create(
                        clave=clave,
                        defaults={
                            "descripcion": str(row.get("Descripcion", row.get("Descripción", "")))[:600],
                            "material_peligroso": str(row.get("Material Peligroso", row.get("MaterialPeligroso", "")))[:10],
                        },
                    )
                    n += 1
            self.stdout.write(self.style.SUCCESS(f"  -> ClaveProdServCP: {n}"))

        # ── ClaveProdServ (catalogo CFDI general) ───────────────────────────
        if deberia("prod"):
            self.stdout.write(self.style.NOTICE("Cargando ClaveProdServ (PRODUCTOS.xlsx)..."))
            path = base / "PRODUCTOS.xlsx"
            if path.exists():
                df = _read(path)
                col_clave = next((c for c in df.columns if "clave" in c.lower()), df.columns[0])
                col_desc = next((c for c in df.columns if "desc" in c.lower()), df.columns[1])
                n = 0
                with transaction.atomic():
                    for _, row in df.iterrows():
                        clave = str(row[col_clave]).strip()
                        if not clave or clave.lower() == "nan":
                            continue
                        SatClaveProdServ.objects.update_or_create(
                            clave=clave,
                            defaults={"descripcion": str(row[col_desc])[:600]},
                        )
                        n += 1
                self.stdout.write(self.style.SUCCESS(f"  -> ClaveProdServ: {n}"))
            else:
                self.stdout.write(self.style.WARNING(f"  no existe {path}, salto."))

        # ── ClaveUnidad ─────────────────────────────────────────────────────
        if deberia("unidad"):
            self.stdout.write(self.style.NOTICE("Cargando ClaveUnidad..."))
            path = base / "CLAVE_UNIDAD.xlsx"
            if path.exists():
                df = _read(path)
                col_clave = next((c for c in df.columns if "clave" in c.lower()), df.columns[0])
                col_nombre = next((c for c in df.columns if "nombre" in c.lower()), df.columns[1])
                col_simb = next((c for c in df.columns if "simb" in c.lower()), None)
                n = 0
                with transaction.atomic():
                    for _, row in df.iterrows():
                        clave = str(row[col_clave]).strip()
                        if not clave or clave.lower() == "nan":
                            continue
                        SatClaveUnidad.objects.update_or_create(
                            clave=clave,
                            defaults={
                                "nombre": str(row[col_nombre])[:200],
                                "simbolo": str(row[col_simb])[:30] if col_simb else "",
                            },
                        )
                        n += 1
                self.stdout.write(self.style.SUCCESS(f"  -> ClaveUnidad: {n}"))
            else:
                self.stdout.write(self.style.WARNING(f"  no existe {path}, salto."))

        # ── CodigoPostal ────────────────────────────────────────────────────
        if deberia("cp_postal"):
            self.stdout.write(self.style.NOTICE("Cargando CodigoPostal..."))
            for nombre in ("c_CodigoPostal_Parte_1.xlsx", "c_CodigoPostal_Parte_2.xlsx"):
                path = base / nombre
                if not path.exists():
                    self.stdout.write(self.style.WARNING(f"  no existe {path}, salto."))
                    continue
                df = _read(path)
                col_cp = next((c for c in df.columns if "postal" in c.lower() or c.lower().startswith("c_codigo")), df.columns[0])
                col_estado = next((c for c in df.columns if "estado" in c.lower()), None)
                col_mun = next((c for c in df.columns if "munic" in c.lower()), None)
                col_loc = next((c for c in df.columns if "localidad" in c.lower()), None)
                n = 0
                with transaction.atomic():
                    for _, row in df.iterrows():
                        cp = str(row[col_cp]).strip()
                        if not cp or cp.lower() == "nan":
                            continue
                        SatCodigoPostal.objects.update_or_create(
                            codigo_postal=cp.zfill(5),
                            defaults={
                                "estado": str(row[col_estado])[:4] if col_estado else "",
                                "municipio": str(row[col_mun])[:6] if col_mun else "",
                                "localidad": str(row[col_loc])[:4] if col_loc else "",
                            },
                        )
                        n += 1
                self.stdout.write(self.style.SUCCESS(f"  -> CP {nombre}: {n}"))

        # ── Estados ─────────────────────────────────────────────────────────
        if deberia("estado"):
            self.stdout.write(self.style.NOTICE("Cargando Estados..."))
            path = base / "Catálogo de estados..xlsx"
            if path.exists():
                df = _read(path)
                col_clave = next((c for c in df.columns if "clave" in c.lower()), df.columns[0])
                col_nombre = next((c for c in df.columns if "nombre" in c.lower() or "estado" in c.lower()), df.columns[1])
                n = 0
                with transaction.atomic():
                    for _, row in df.iterrows():
                        clave = str(row[col_clave]).strip()
                        if not clave or clave.lower() == "nan":
                            continue
                        SatEstado.objects.update_or_create(
                            clave=clave,
                            defaults={"nombre": str(row[col_nombre])[:100]},
                        )
                        n += 1
                self.stdout.write(self.style.SUCCESS(f"  -> Estados: {n}"))

        # ── Municipios ──────────────────────────────────────────────────────
        if deberia("municipio"):
            self.stdout.write(self.style.NOTICE("Cargando Municipios..."))
            path = base / "Catálogo de municipios..xlsx"
            if path.exists():
                df = _read(path)
                cols = {c.lower(): c for c in df.columns}
                col_estado = cols.get("c_estado") or next((c for c in df.columns if "estado" in c.lower()), df.columns[0])
                col_clave = cols.get("c_municipio") or next((c for c in df.columns if "munic" in c.lower() and "clave" in c.lower()), None) or df.columns[1]
                col_nombre = next((c for c in df.columns if "nombre" in c.lower() or "descripcion" in c.lower()), df.columns[2])
                n = 0
                # Asegura estados existentes (si el comando se corre suelto).
                for _, row in df.iterrows():
                    estado_clave = str(row[col_estado]).strip()
                    clave = str(row[col_clave]).strip()
                    if not estado_clave or not clave:
                        continue
                    SatEstado.objects.get_or_create(clave=estado_clave, defaults={"nombre": estado_clave})
                    SatMunicipio.objects.update_or_create(
                        estado_id=estado_clave, clave=clave,
                        defaults={"nombre": str(row[col_nombre])[:200]},
                    )
                    n += 1
                self.stdout.write(self.style.SUCCESS(f"  -> Municipios: {n}"))

        # ── Colonias ────────────────────────────────────────────────────────
        # El catalogo oficial del SAT viene partido en 3 archivos
        # ("Catalogo de colonias.xlsx", "...2.xlsx", "...3.xlsx") con un total
        # de ~145k registros que cubren la mayoria de CPs del pais.
        if deberia("colonia"):
            self.stdout.write(self.style.NOTICE("Cargando Colonias..."))
            archivos = [
                "Catálogo de colonias..xlsx",
                "Catálogo de colonias 2..xlsx",
                "Catálogo de colonias 3..xlsx",
            ]
            total = 0
            for nombre_archivo in archivos:
                path = base / nombre_archivo
                if not path.exists():
                    self.stdout.write(self.style.WARNING(f"  no existe {path.name}, salto."))
                    continue
                df = _read(path)
                # Detectar columnas exactas del catalogo SAT:
                #   c_Colonia  -> clave del asentamiento (4-6 digitos)
                #   c_CodigoPostal -> CP de 5 digitos
                #   Nombre del asentamiento -> nombre
                col_cp = next((c for c in df.columns if "codigopostal" in c.lower().replace(" ", "") or "postal" in c.lower()), df.columns[1])
                col_clave = next(
                    (c for c in df.columns if c.lower().strip() in ("c_colonia", "colonia") or ("clave" in c.lower() and "colonia" in c.lower())),
                    df.columns[0],
                )
                col_nombre = next((c for c in df.columns if "nombre" in c.lower() or "asenta" in c.lower()), df.columns[2])
                n_arch = 0
                with transaction.atomic():
                    for _, row in df.iterrows():
                        cp = str(row[col_cp]).strip().zfill(5)
                        clave = str(row[col_clave]).strip()
                        if not cp or not clave:
                            continue
                        SatColonia.objects.update_or_create(
                            codigo_postal=cp, clave=clave,
                            defaults={"nombre": str(row[col_nombre])[:300]},
                        )
                        n_arch += 1
                        total += 1
                        if total % 5000 == 0:
                            self.stdout.write(f"    procesadas {total} colonias...")
                self.stdout.write(self.style.SUCCESS(f"  -> {nombre_archivo}: {n_arch}"))
            self.stdout.write(self.style.SUCCESS(f"  -> Colonias total: {total}"))

        # ── ConfigAutotransporte / SubTipoRem (Carta Porte) ────────────────
        # Lee desde el Excel oficial del usuario (CatalogosCartaPorte31.xlsx)
        # cualquier hoja que coincida con el patron del nombre.
        def _load_generic(tag, model, sheet_match, key_col_match, desc_col_match):
            if not deberia(tag):
                return
            self.stdout.write(self.style.NOTICE(f"Cargando {tag} ..."))
            path = base / "CatalogosCartaPorte31.xlsx"
            if not path.exists():
                self.stdout.write(self.style.WARNING(f"  no existe {path}, salto."))
                return
            try:
                xls = pd.ExcelFile(path)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  no pude abrir {path}: {e}"))
                return
            sheet = next((s for s in xls.sheet_names if sheet_match.lower() in s.lower()), None)
            if not sheet:
                self.stdout.write(self.style.WARNING(f"  no encontre hoja para '{sheet_match}' en {path.name}, salto."))
                return
            df = _read(path, sheet=sheet)
            col_clave = next((c for c in df.columns if key_col_match.lower() in c.lower()), df.columns[0])
            col_desc = next((c for c in df.columns if desc_col_match.lower() in c.lower()), None)
            if not col_desc and len(df.columns) > 1:
                col_desc = df.columns[1]
            n = 0
            with transaction.atomic():
                for _, row in df.iterrows():
                    clave = str(row[col_clave]).strip()
                    if not clave or clave.lower() == "nan":
                        continue
                    desc = str(row[col_desc])[:300] if col_desc else ""
                    model.objects.update_or_create(clave=clave, defaults={"descripcion": desc})
                    n += 1
            self.stdout.write(self.style.SUCCESS(f"  -> {tag}: {n} (hoja '{sheet}')"))

        _load_generic("config_vehicular", SatConfigVehicular, "ConfigAutotransporte", "clave", "desc")
        _load_generic("subtipo_rem", SatSubTipoRem, "SubTipoRem", "clave", "desc")

        self.stdout.write(self.style.SUCCESS("Catalogos SAT cargados."))
