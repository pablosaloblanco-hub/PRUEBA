"""Suelta 21 · Michael, Franklin o Trevor: ¿quién era tu favorito de GTA V?"""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# url() de la plantilla va sin comillas: las rutas con espacios deben ir codificadas.
FOTO = quote("Places/Vice City/Vice_City_17.jpg")

render([
    (single(FOTO, "DEBATE DE DOMINGO",
            '¿<span class="gl-mag">MICHAEL</span>, <span class="gl-cy">FRANKLIN</span> O <span class="gl-ye">TREVOR</span>?',
            "13 años después, la pregunta sigue en pie",
            mini([
                ("users", "M · MICHAEL", "Protagonista de GTA V"),
                ("users", "F · FRANKLIN", "Protagonista de GTA V"),
                ("users", "T · TREVOR", "Protagonista de GTA V"),
            ]),
            "COMENTA M, F O T", size=120),
     salida("21-1.jpg"), 1080, 1350),
])
