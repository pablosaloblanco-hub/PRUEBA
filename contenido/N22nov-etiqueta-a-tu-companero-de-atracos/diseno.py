"""N22nov · Etiqueta a tu compañero de atracos (suelta, 1080×1350)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


# Raul_Bautista_04: americana blanca y neón, sin armas a la vista.
FOTO = foto("People/Raul Bautista/Raul_Bautista_04.jpg")

render([
    (single(FOTO, "ATRACADOR VETERANO",
            '<span class="ye">RAUL BAUTISTA</span> BUSCA <span class="mag">SOCIO</span>',
            "¿Con quién te la jugarías tú?",
            mini([("star", "RAUL BAUTISTA", "Atracador veterano"),
                  ("users", "¿Y TU SOCIO?", "El que nunca te deja tirado"),
                  ("car", "AL VOLANTE", "Conduce sin perder los nervios")]),
            "ETIQUETA A TU COMPAÑERO DE ATRACOS 👇", size=130),
     salida("N22nov-1.jpg"), 1080, 1350),
])
