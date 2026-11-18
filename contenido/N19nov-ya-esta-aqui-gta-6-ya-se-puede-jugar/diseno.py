"""Suelta de lanzamiento N19nov: 1 imagen 1080x1350 (N19nov-1.jpg)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto("Places/Vice City/Vice_City_01.jpg")

render([
    (single(FOTO, "13 AÑOS, 2 MESES Y 2 DÍAS DESPUÉS",
            '¡YA ESTÁ <span class="mag">AQUÍ</span>!',
            'GTA 6 ya se juega en <span class="cy">PS5</span> y <span class="cy">Xbox Series X/S</span><br>'
            '00:00 en la Península y Baleares (Canarias, una hora más tarde)<br>'
            '<span class="ye">Último día del bonus Vintage Vice City Pack</span> · antes del 20/11',
            mini([("pad", "A · PS5", "Juego en PS5"),
                  ("pad", "B · XBOX", "Series X/S"),
                  ("clock", "C · AÚN NO", "Aún no lo tengo")]),
            "COMENTA A, B O C Y DESDE DÓNDE JUEGAS 👇", size=160),
     salida("N19nov-1.jpg"), 1080, 1350),
])
