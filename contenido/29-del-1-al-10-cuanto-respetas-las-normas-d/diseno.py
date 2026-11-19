"""Suelta 29 · Del 1 al 10: ¿cuánto respetas las normas de tráfico en Vice City?"""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, scale, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto("Places/Vice City/Vice_City_04.jpg")

# Leyenda en una fila de tres, 26 px, debajo de la escala (dentro de middle)
LEYENDA = ('<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-top:18px;'
           'font-weight:900;font-size:26px;letter-spacing:1px;line-height:1.1;text-shadow:0 2px 6px #000">'
           '<span style="flex:1;text-align:left"><span class="mag">1</span> = ¿SEMÁFORO? ¿QUÉ SEMÁFORO?</span>'
           '<span style="flex:0 0 auto;text-align:center"><span class="ye">5</span> = SEGÚN EL DÍA</span>'
           '<span style="flex:1;text-align:right"><span class="cy">10</span> = CONDUCTOR EJEMPLAR</span>'
           '</div>')

render([
    (single(FOTO, "SÉ SINCERO",
            'DEL <span class="ye">1</span> AL <span class="cy">10</span>: ¿CUÁNTO RESPETAS LAS '
            '<span class="mag">NORMAS DE TRÁFICO</span> EN VICE CITY?',
            "Semáforos, intermitentes y el arte de aparcar",
            scale() + LEYENDA,
            "COMENTA TU NÚMERO 👇", size=100),
     salida("29-1.jpg"), 1080, 1350),
])
