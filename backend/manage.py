#!/usr/bin/env python
"""Django management script para ERP-PROFESIONAL."""
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "erp_core.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "No se pudo importar Django. ¿Está instalado y el venv activado?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
