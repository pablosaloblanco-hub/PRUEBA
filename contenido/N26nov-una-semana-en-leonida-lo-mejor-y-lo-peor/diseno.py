"""N26nov · Una semana en Leonida: lo mejor y lo peor · suelta (1080×1350)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Vice City/Vice_City_15.jpg")

render([
    (single(F1, "BALANCE DE LA PRIMERA SEMANA",
            'UNA SEMANA EN <span class="cy">LEONIDA</span>',
            '¿Qué te ha <span class="ye">enganchado</span> y qué te ha <span class="mag">desesperado</span>?',
            mini([("heart", "LO MEJOR 👍", "Lo que más te ha enganchado"),
                  ("x", "LO PEOR 👎", "Lo que te saca de quicio"),
                  ("eye", "SIN SPOILERS", "Nada de la historia")]),
            "COMENTA LO MEJOR Y LO PEOR 👇", size=130),
     salida("N26nov-1.jpg"), 1080, 1350),
])
