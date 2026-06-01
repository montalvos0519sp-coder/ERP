from django.contrib import admin

from .models import (
    SatClaveProdServ,
    SatClaveProdServCP,
    SatClaveUnidad,
    SatCodigoPostal,
    SatColonia,
    SatEstado,
    SatFormaPago,
    SatMetodoPago,
    SatMoneda,
    SatMunicipio,
    SatRegimenFiscal,
    SatTipoFigura,
    SatTipoPermiso,
    SatUsoCFDI,
)


for model in [
    SatClaveProdServ, SatClaveProdServCP, SatClaveUnidad, SatEstado, SatMunicipio,
    SatCodigoPostal, SatColonia, SatRegimenFiscal, SatUsoCFDI, SatFormaPago,
    SatMetodoPago, SatMoneda, SatTipoFigura, SatTipoPermiso,
]:
    admin.site.register(model)
