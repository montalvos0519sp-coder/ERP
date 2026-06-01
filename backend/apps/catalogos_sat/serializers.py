from rest_framework import serializers

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


class _Simple(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"


class SatClaveProdServSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatClaveProdServ


class SatClaveProdServCPSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatClaveProdServCP


class SatClaveUnidadSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatClaveUnidad


class SatEstadoSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatEstado


class SatMunicipioSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatMunicipio


class SatCodigoPostalSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatCodigoPostal


class SatColoniaSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatColonia


class SatRegimenFiscalSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatRegimenFiscal


class SatUsoCFDISerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatUsoCFDI


class SatFormaPagoSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatFormaPago


class SatMetodoPagoSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatMetodoPago


class SatMonedaSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatMoneda


class SatTipoFiguraSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatTipoFigura


class SatTipoPermisoSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatTipoPermiso


class SatConfigVehicularSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatConfigVehicular


class SatSubTipoRemSerializer(_Simple):
    class Meta(_Simple.Meta):
        model = SatSubTipoRem
