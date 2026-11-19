"""27 · Tierra, mar o aire: ¿cómo te mueves por Leonida? (suelta, 1080×1350)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Vice City/Vice_City_15.jpg")

render([
    (single(F1, "SÁBADO EN LEONIDA",
            '<span class="ye">TIERRA</span>, <span class="cy">MAR</span><br>O <span class="mag">AIRE</span>',
            '¿Cómo te mueves tú por <span class="cy">Leonida</span>?',
            mini([("car", "T · TIERRA", "Sobre ruedas"),
                  ("palm", "M · MAR", "Sobre el agua"),
                  ("eye", "A · AIRE", "Desde arriba")]),
            "COMENTA T, M O A 👇", size=130),
     salida("27-1.jpg"), 1080, 1350),
])
