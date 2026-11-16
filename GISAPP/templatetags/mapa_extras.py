# mapa/templatetags/mapa_extras.py
from django import template

register = template.Library()

@register.filter
def color_from_index(index):
    """Generar colores basados en el índice"""
    colors = [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e',
        '#e74a3b', '#858796', '#5a5c69', '#6f42c1'
    ]
    return colors[(index - 1) % len(colors)]