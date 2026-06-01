from django.contrib import admin
from .models import Departamento, Empleado, Prestamo, Puesto, Vacacion
for m in [Departamento, Puesto, Empleado, Vacacion, Prestamo]:
    admin.site.register(m)
