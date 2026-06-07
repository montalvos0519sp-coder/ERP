"""Paginación estándar del ERP.

Permite que el cliente controle el tamaño de página con `?page_size=`. Sin esto,
DRF ignora el page_size del frontend y deja todo en una sola página de 50, lo que
provoca "Página inválida" al pedir la página 2 (el front calcula las páginas con
su propio page_size) y que listas grandes se trunquen a 50 registros.
"""
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 10000
