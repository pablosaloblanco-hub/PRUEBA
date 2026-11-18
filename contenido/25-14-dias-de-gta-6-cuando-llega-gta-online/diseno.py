"""14 días de GTA 6: ¿cuándo llega GTA Online? (suelta)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url(...) sin comillas: los espacios de las
    # subcarpetas («Vice City», «Leonida Keys»…) se codifican para que cargue.
    return quote(ruta)


FOTO = foto("Places/Vice City/Vice_City_08.jpg")

render([
    (single(FOTO, "HOY HACE 14 DÍAS",
            '¿CUÁNDO LLEGA <span class="cy">GTA ONLINE</span>?',
            'En GTA V, a estas alturas <span class="ye">ya había Online</span>. '
            'De GTA VI, Rockstar solo ha dicho que «llegará más adelante».',
            mini([("star", "A · ANTES DE NAVIDAD", "Me lo pido de regalo"),
                  ("clock", "B · 1.ª MITAD DE 2027", "Toca esperar un poco"),
                  ("palm", "C · MÁS TARDE", "Mientras, a la playa")]),
            "COMENTA A, B O C 👇", size=120),
     salida("25-1.jpg"), 1080, 1350),
])
