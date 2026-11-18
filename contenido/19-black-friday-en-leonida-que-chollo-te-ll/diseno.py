"""Suelta 19 · Black Friday en Leonida: ¿qué chollo te llevas?"""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# url() de la plantilla va sin comillas: las rutas con espacios deben ir codificadas.
FOTO = quote("Places/Vice City/Vice_City_22.jpg")

render([
    (single(FOTO, "BLACK FRIDAY EN LEONIDA",
            'SOLO TE LLEVAS <span class="gl-ye">UNO</span>',
            "Hoy todo el mundo va de compras. En Leonida, el chollo es el plan.",
            mini([
                ("palm", "A · LEONIDA KEYS", "Islas unidas por puentes"),
                ("bolt", "B · AMBROSIA", "Ruta con los moteros"),
                ("car", "C · MOUNT KALAGA", "Rutas todoterreno"),
            ]),
            "COMENTA A, B O C", size=140, pos="center"),
     salida("19-1.jpg"), 1080, 1350),
])
