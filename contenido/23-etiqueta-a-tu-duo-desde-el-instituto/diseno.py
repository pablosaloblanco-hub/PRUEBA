"""Suelta 23 · Etiqueta a tu dúo desde el instituto (Real Dimez)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# url() de la plantilla va sin comillas: las rutas con espacios deben ir codificadas.
FOTO = quote("People/Real Dimez/Real_Dimez_04.jpg")

render([
    (single(FOTO, "REAL DIMEZ",
            'ETIQUETA A TU <span class="mag">DÚO</span> DESDE EL <span class="ye">INSTITUTO</span>',
            "Bae-Luxe y Roxy: dúo de rap, amigas desde el instituto · fichadas por Dre'Quan en Only Raw Records",
            mini([
                ("users", "BAE-LUXE Y ROXY", "Son Real Dimez"),
                ("heart", "AMIGAS", "Desde el instituto"),
                ("disc", "ONLY RAW RECORDS", "Fichadas por Dre'Quan"),
            ]),
            "ETIQUETA A TU DÚO 👇", size=120),
     salida("23-1.jpg"), 1080, 1350),
])
