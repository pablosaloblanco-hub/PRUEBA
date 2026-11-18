"""N24nov · Del 1 al 10: cuánto has dormido desde el jueves (suelta)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, scale, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F_AMANECER = foto("Places/Ambrosia/Ambrosia_04.jpg")

LEYENDA = ('<div style="display:flex;justify-content:space-between;gap:20px;margin-top:18px;'
           'font-weight:900;font-size:26px;letter-spacing:1px;text-shadow:0 2px 6px #000">'
           '<span style="text-align:left"><span class="mag">1</span> = ¿DORMIR? ¿QUÉ ES ESO?</span>'
           '<span style="text-align:right"><span class="cy">10</span> = COMO UN BEBÉ (NO HE JUGADO)</span>'
           '</div>')

render([
    (single(F_AMANECER, "DESDE EL JUEVES A LAS 00:00",
            'DEL <span class="ye">1</span> AL <span class="cy">10</span>: ¿CUÁNTO HAS '
            '<span class="mag">DORMIDO</span> DESDE EL JUEVES?',
            "Otra vez viendo amanecer en Leonida…",
            scale() + LEYENDA,
            "COMENTA TU NÚMERO 👇", size=110),
     salida("N24nov-1.jpg"), 1080, 1350),
])
