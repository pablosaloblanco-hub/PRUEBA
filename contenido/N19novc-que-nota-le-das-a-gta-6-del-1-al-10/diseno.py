"""N19novc · ¿Qué nota le das a GTA 6 del 1 al 10? (suelta TikTok, 1 imagen)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, scale, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Vice City/Vice_City_04.jpg")

render([
    (single(F1, "18 HORAS EN LEONIDA",
            '¿<span class="ye">APRUEBA</span> O<br><span class="mag">SUSPENDE</span>?',
            'Después de <span class="cy">13 años, 2 meses y 2 días</span> esperando,<br>¿qué nota le das a GTA 6 del 1 al 10?',
            scale(), "COMENTA TU NOTA (SIN SPOILERS) 👇", size=150),
     salida("N19novc-1.jpg"), 1080, 1350),
])
