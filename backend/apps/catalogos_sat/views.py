"""Vistas de los catalogos SAT.

Todos son ReadOnlyModelViewSet (los catalogos no se editan via API, se cargan desde Excel).
Adicionalmente, expone endpoint /upload/ para que el staff cargue nuevos catalogos
desde la UI del sistema (subiendo el .xlsx).
"""
from __future__ import annotations

import io
from pathlib import Path

import pandas as pd
from django.conf import settings
from django.core.management import call_command
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import EsStaffEmpresa

from .models import (
    SatClaveProdServ,
    SatClaveProdServCP,
    SatClaveUnidad,
    SatCodigoPostal,
    SatColonia,
    SatConfigVehicular,
    SatEstado,
    SatFormaPago,
    SatMetodoPago,
    SatMoneda,
    SatMunicipio,
    SatRegimenFiscal,
    SatSubTipoRem,
    SatTipoFigura,
    SatTipoPermiso,
    SatUsoCFDI,
)
from .serializers import (
    SatClaveProdServCPSerializer,
    SatClaveProdServSerializer,
    SatClaveUnidadSerializer,
    SatCodigoPostalSerializer,
    SatColoniaSerializer,
    SatConfigVehicularSerializer,
    SatEstadoSerializer,
    SatFormaPagoSerializer,
    SatMetodoPagoSerializer,
    SatMonedaSerializer,
    SatMunicipioSerializer,
    SatRegimenFiscalSerializer,
    SatSubTipoRemSerializer,
    SatTipoFiguraSerializer,
    SatTipoPermisoSerializer,
    SatUsoCFDISerializer,
)


class SatClaveProdServViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatClaveProdServ.objects.all()
    serializer_class = SatClaveProdServSerializer
    search_fields = ["clave", "descripcion"]


class SatClaveProdServCPViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatClaveProdServCP.objects.all()
    serializer_class = SatClaveProdServCPSerializer
    search_fields = ["clave", "descripcion"]


class SatClaveUnidadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatClaveUnidad.objects.all()
    serializer_class = SatClaveUnidadSerializer
    search_fields = ["clave", "nombre", "simbolo"]


class SatEstadoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatEstado.objects.all()
    serializer_class = SatEstadoSerializer
    search_fields = ["clave", "nombre"]


class SatMunicipioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatMunicipio.objects.all()
    serializer_class = SatMunicipioSerializer
    filterset_fields = ["estado"]
    search_fields = ["nombre", "clave"]


class SatCodigoPostalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatCodigoPostal.objects.all()
    serializer_class = SatCodigoPostalSerializer
    search_fields = ["codigo_postal"]

    # Fallback de nombres de estado por si el catalogo SatEstado se cargo sin
    # los nombres legibles (p.ej. NLE -> "NLE" en lugar de "Nuevo Leon").
    _ESTADOS_MX = {
        "AGU": "Aguascalientes", "BCN": "Baja California", "BCS": "Baja California Sur",
        "CAM": "Campeche", "CHP": "Chiapas", "CHH": "Chihuahua", "COA": "Coahuila",
        "COL": "Colima", "CMX": "Ciudad de Mexico", "DIF": "Ciudad de Mexico",
        "DUR": "Durango", "GUA": "Guanajuato", "GRO": "Guerrero", "HID": "Hidalgo",
        "JAL": "Jalisco", "MEX": "Mexico", "MIC": "Michoacan", "MOR": "Morelos",
        "NAY": "Nayarit", "NLE": "Nuevo Leon", "OAX": "Oaxaca", "PUE": "Puebla",
        "QUE": "Queretaro", "ROO": "Quintana Roo", "SLP": "San Luis Potosi",
        "SIN": "Sinaloa", "SON": "Sonora", "TAB": "Tabasco", "TAM": "Tamaulipas",
        "TLA": "Tlaxcala", "VER": "Veracruz", "YUC": "Yucatan", "ZAC": "Zacatecas",
    }

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        """Dado ?cp=XXXXX devuelve estado+municipio (nombres legibles) y la
        lista de colonias para autocompletar formularios."""
        cp = (request.query_params.get("cp") or "").strip()
        if len(cp) != 5 or not cp.isdigit():
            return Response({"found": False, "detail": "CP debe ser 5 digitos."})
        try:
            row = SatCodigoPostal.objects.get(codigo_postal=cp)
        except SatCodigoPostal.DoesNotExist:
            return Response({"found": False, "codigo_postal": cp})

        estado_nombre = ""
        if row.estado:
            db_nombre = (
                SatEstado.objects.filter(clave=row.estado)
                .values_list("nombre", flat=True).first() or ""
            )
            # Si el catalogo se cargo sin nombres (nombre == clave), usar fallback.
            if db_nombre and db_nombre != row.estado:
                estado_nombre = db_nombre
            else:
                estado_nombre = self._ESTADOS_MX.get(row.estado, db_nombre or row.estado)
        municipio_nombre = ""
        if row.estado and row.municipio:
            municipio_nombre = (
                SatMunicipio.objects.filter(estado=row.estado, clave=row.municipio)
                .values_list("nombre", flat=True).first() or ""
            )
        colonias = list(
            SatColonia.objects.filter(codigo_postal=cp)
            .order_by("nombre").values_list("nombre", flat=True)
        )
        return Response({
            "found": True,
            "codigo_postal": cp,
            "estado_clave": row.estado,
            "estado": estado_nombre,
            "municipio_clave": row.municipio,
            "municipio": municipio_nombre,
            "localidad_clave": row.localidad,
            "pais": "México",
            "colonias": colonias,
        })


class SatColoniaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatColonia.objects.all()
    serializer_class = SatColoniaSerializer
    filterset_fields = ["codigo_postal"]
    search_fields = ["nombre"]


class SatRegimenFiscalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatRegimenFiscal.objects.all()
    serializer_class = SatRegimenFiscalSerializer


class SatUsoCFDIViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatUsoCFDI.objects.all()
    serializer_class = SatUsoCFDISerializer


class SatFormaPagoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatFormaPago.objects.all()
    serializer_class = SatFormaPagoSerializer


class SatMetodoPagoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatMetodoPago.objects.all()
    serializer_class = SatMetodoPagoSerializer


class SatMonedaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatMoneda.objects.all()
    serializer_class = SatMonedaSerializer


class SatConfigVehicularViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatConfigVehicular.objects.all()
    serializer_class = SatConfigVehicularSerializer
    search_fields = ["clave", "descripcion"]


class SatSubTipoRemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatSubTipoRem.objects.all()
    serializer_class = SatSubTipoRemSerializer
    search_fields = ["clave", "descripcion"]


class SatTipoFiguraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatTipoFigura.objects.all()
    serializer_class = SatTipoFiguraSerializer


class SatTipoPermisoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SatTipoPermiso.objects.all()
    serializer_class = SatTipoPermisoSerializer


class UploadCatalogoSAT(APIView):
    """Endpoint para que el staff suba un Excel y lo cargue en el catalogo correspondiente."""

    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    parser_classes = [MultiPartParser]

    def post(self, request):
        archivo = request.FILES.get("archivo")
        tipo = request.data.get("tipo", "")  # cp | prod | unidad | cp_postal | estado | municipio | colonia
        if not archivo or not tipo:
            return Response({"detail": "Faltan 'archivo' y 'tipo'."}, status=400)
        destino = Path(settings.CATALOGOS_SAT_DIR)
        destino.mkdir(parents=True, exist_ok=True)
        nombre_final = {
            "cp": "CatalogosCartaPorte31.xlsx",
            "prod": "PRODUCTOS.xlsx",
            "unidad": "CLAVE_UNIDAD.xlsx",
            "cp_postal": "c_CodigoPostal_Parte_1.xlsx",
            "estado": "Catálogo de estados..xlsx",
            "municipio": "Catálogo de municipios..xlsx",
            "colonia": "Catálogo de colonias..xlsx",
        }.get(tipo)
        if not nombre_final:
            return Response({"detail": "Tipo de catalogo desconocido."}, status=400)
        with open(destino / nombre_final, "wb") as f:
            for chunk in archivo.chunks():
                f.write(chunk)
        # Dispara la carga.
        buf = io.StringIO()
        call_command("cargar_catalogos_sat", solo=tipo, stdout=buf)
        return Response({"ok": True, "log": buf.getvalue()})


class EstadisticasCatalogosSAT(APIView):
    def get(self, request):
        return Response({
            "ClaveProdServ": SatClaveProdServ.objects.count(),
            "ClaveProdServCP": SatClaveProdServCP.objects.count(),
            "ClaveUnidad": SatClaveUnidad.objects.count(),
            "CodigoPostal": SatCodigoPostal.objects.count(),
            "Colonia": SatColonia.objects.count(),
            "Estado": SatEstado.objects.count(),
            "Municipio": SatMunicipio.objects.count(),
            "RegimenFiscal": SatRegimenFiscal.objects.count(),
            "UsoCFDI": SatUsoCFDI.objects.count(),
            "FormaPago": SatFormaPago.objects.count(),
            "MetodoPago": SatMetodoPago.objects.count(),
            "Moneda": SatMoneda.objects.count(),
            "TipoFigura": SatTipoFigura.objects.count(),
            "TipoPermiso": SatTipoPermiso.objects.count(),
        })
