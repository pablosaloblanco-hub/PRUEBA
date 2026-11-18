"""N20nov · Tu primera hora en Vice City: elige plan (suelta, 1080×1350)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto("Places/Vice City/Vice_City_09.jpg")

render([
    (single(FOTO, "PRIMER FINDE EN VICE CITY",
            'TIENES <span class="ye">UNA HORA</span> EN <span class="mag">VICE CITY</span>. ¿QUÉ HACES?',
            "Elige plan para tu primera hora en Leonida",
            mini([("palm", "A · OCEAN BEACH", "Un paseo junto al mar"),
                  ("map", "B · LITTLE CUBA", "Perderte por sus calles"),
                  ("pin", "C · TISHA-WOCKA", "Curiosear en el mercadillo")]),
            "COMENTA A, B O C 👇", size=120),
     salida("N20nov-1.jpg"), 1080, 1350),
])
