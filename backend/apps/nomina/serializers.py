from rest_framework import serializers

from .models import (
    BitacoraFiscalNomina, CFDINomina, ConceptoNomina, ConfigNominaEmpresa,
    IncidenciaNomina, NominaEmpleado, PeriodoNomina,
)


class ConfigNominaEmpresaSerializer(serializers.ModelSerializer):
    pac_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)
    pac_secret_key = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tiene_credenciales = serializers.SerializerMethodField()

    class Meta:
        model = ConfigNominaEmpresa
        fields = "__all__"
        read_only_fields = ["creado", "actualizado", "folio_actual"]

    def get_tiene_credenciales(self, obj) -> bool:
        return bool(obj.pac_api_key and obj.pac_secret_key)


class ConceptoNominaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptoNomina
        fields = "__all__"


class IncidenciaNominaSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidenciaNomina
        fields = "__all__"


class NominaEmpleadoSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source="empleado.nombre", read_only=True)
    empleado_numero = serializers.CharField(source="empleado.numero_empleado", read_only=True)
    empleado_rfc = serializers.CharField(source="empleado.rfc", read_only=True)
    empleado_curp = serializers.CharField(source="empleado.curp", read_only=True)
    empleado_puesto = serializers.CharField(source="empleado.puesto.nombre", read_only=True)
    periodo_nombre = serializers.CharField(source="periodo.nombre", read_only=True)
    estatus_cfdi = serializers.SerializerMethodField()
    conceptos = ConceptoNominaSerializer(many=True, read_only=True)
    incidencias = IncidenciaNominaSerializer(many=True, read_only=True)
    cfdi_uuid = serializers.SerializerMethodField()

    class Meta:
        model = NominaEmpleado
        fields = "__all__"
        read_only_fields = [
            "total_percepciones", "total_deducciones", "total_otros_pagos",
            "total_neto", "total_gravado", "total_exento", "creado", "actualizado",
        ]

    def get_estatus_cfdi(self, obj):
        try:
            return obj.cfdi_obj.estatus
        except CFDINomina.DoesNotExist:
            return "BORRADOR"

    def get_cfdi_uuid(self, obj):
        try:
            return obj.cfdi_obj.uuid
        except CFDINomina.DoesNotExist:
            return ""


class PeriodoNominaSerializer(serializers.ModelSerializer):
    num_recibos = serializers.SerializerMethodField()
    total_periodo = serializers.SerializerMethodField()
    timbrados = serializers.SerializerMethodField()

    class Meta:
        model = PeriodoNomina
        fields = "__all__"
        read_only_fields = ["creado", "creado_por", "cerrado_en"]

    def get_num_recibos(self, obj):
        return obj.recibos.count()

    def get_total_periodo(self, obj):
        return sum((float(r.total_neto) for r in obj.recibos.all()), 0)

    def get_timbrados(self, obj):
        return obj.recibos.filter(cfdi_obj__estatus="TIMBRADO").count()


class CFDINominaSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source="nomina_empleado.empleado.nombre", read_only=True)
    empleado_numero = serializers.CharField(source="nomina_empleado.empleado.numero_empleado", read_only=True)
    periodo_nombre = serializers.CharField(source="nomina_empleado.periodo.nombre", read_only=True)
    total = serializers.DecimalField(source="nomina_empleado.total_neto", max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = CFDINomina
        fields = "__all__"
        read_only_fields = [
            "uuid", "xml", "pdf_url", "qr_url", "fecha_timbrado", "sello_sat",
            "sello_cfdi", "cadena_original", "no_certificado_sat", "respuesta_pac",
            "creado", "creado_por", "timbrado_por", "cancelado_por", "fecha_cancelacion",
        ]


class BitacoraFiscalNominaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source="usuario.username", read_only=True)
    class Meta:
        model = BitacoraFiscalNomina
        fields = "__all__"
