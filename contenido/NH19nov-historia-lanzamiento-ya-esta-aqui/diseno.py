"""Historia de lanzamiento NH19nov: 1080x1920 (NH-19nov.jpg)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto("Places/Vice City/Vice_City_08.jpg")

render([
    (story(FOTO, "¡POR FIN! · 19/11 · 00:00",
           'YA ESTÁ <span class="mag">AQUÍ</span>',
           "GTA VI ya se puede jugar: Vice City te espera",
           ["En PS5 y Xbox Series X/S",
            "13 años, 2 meses y 2 días",
            "Bonus: compra antes del 20/11"], size=150),
     salida("NH-19nov.jpg"), 1080, 1920),
])
