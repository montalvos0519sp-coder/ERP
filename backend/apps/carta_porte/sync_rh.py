"""Sincronización Operador (Viajes/Carta Porte) ↔ Empleado (RH) por RFC.

La misma persona debe existir en ambos módulos. Al dar de alta/editar un
operador se crea o vincula su empleado de RH (depto "Operadores", puesto
"Chofer"); y al dar de alta un empleado con puesto de chofer/operador se crea o
vincula su operador. Se enlaza por RFC dentro de la misma empresa, sin duplicar.
"""
from __future__ import annotations

import logging
from datetime import date

logger = logging.getLogger(__name__)

_PUESTO_OPERADOR = ("chofer", "operador", "conductor")


def _split_nombre(full: str):
    parts = (full or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _numero_empleado_unico(Empleado, empresa) -> str:
    n = Empleado.objects.filter(empresa=empresa).count() + 1
    num = f"OP{n:03d}"
    while Empleado.objects.filter(empresa=empresa, numero_empleado=num).exists():
        n += 1
        num = f"OP{n:03d}"
    return num


def asegurar_empleado_de_operador(operador):
    """Crea/vincula el empleado de RH correspondiente a un operador."""
    if not operador or not operador.rfc or not operador.empresa_id:
        return None
    try:
        from apps.rh.models import Departamento, Empleado, Puesto
    except Exception:
        logger.exception("RH no disponible para sincronizar operador")
        return None
    emp = operador.empresa
    e = operador.empleado if operador.empleado_id else None
    if e is None:
        e = Empleado.objects.filter(empresa=emp, rfc=operador.rfc).first()
    if e is None:
        depto, _ = Departamento.objects.get_or_create(empresa=emp, nombre="Operadores")
        puesto, _ = Puesto.objects.get_or_create(
            empresa=emp, departamento=depto, nombre="Chofer", defaults={"salario_base": 0})
        nombre, apellido = _split_nombre(operador.nombre)
        e = Empleado.objects.create(
            empresa=emp, puesto=puesto, numero_empleado=_numero_empleado_unico(Empleado, emp),
            nombre=nombre or (operador.nombre or "Operador"), apellido=apellido,
            rfc=operador.rfc, codigo_postal_fiscal=(operador.codigo_postal or "")[:5],
            fecha_ingreso=date.today())
    if operador.empleado_id != e.id:
        operador.empleado = e
        operador.save(update_fields=["empleado"])
    return e


def asegurar_operador_de_empleado(empleado):
    """Crea/vincula el operador de Viajes si el empleado es chofer/operador."""
    if not empleado or not empleado.rfc or not empleado.empresa_id:
        return None
    pn = (getattr(getattr(empleado, "puesto", None), "nombre", "") or "").lower()
    if not any(k in pn for k in _PUESTO_OPERADOR):
        return None
    from .models import Operador
    op = Operador.objects.filter(empresa=empleado.empresa, rfc=empleado.rfc).first()
    nombre = f"{empleado.nombre} {getattr(empleado, 'apellido', '')}".strip()
    if op is None:
        op = Operador.objects.create(
            empresa=empleado.empresa, rfc=empleado.rfc, nombre=nombre, licencia="",
            codigo_postal=(getattr(empleado, "codigo_postal_fiscal", "") or ""), empleado=empleado)
    elif not op.empleado_id:
        op.empleado = empleado
        op.save(update_fields=["empleado"])
    return op
