from django.contrib import admin

from .models import (
    BitacoraFiscalNomina, CFDINomina, ConceptoNomina, ConfigNominaEmpresa,
    IncidenciaNomina, NominaEmpleado, PeriodoNomina,
)


admin.site.register(ConfigNominaEmpresa)
admin.site.register(PeriodoNomina)
admin.site.register(NominaEmpleado)
admin.site.register(ConceptoNomina)
admin.site.register(IncidenciaNomina)
admin.site.register(CFDINomina)
admin.site.register(BitacoraFiscalNomina)
