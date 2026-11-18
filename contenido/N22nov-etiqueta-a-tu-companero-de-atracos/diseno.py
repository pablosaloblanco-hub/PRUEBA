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

# El título se baja (revisor, 19/11) para que no tape la cara de Raul.
html = single(FOTO, "ATRACADOR VETERANO",
            '<span class="ye">RAUL BAUTISTA</span> BUSCA <span class="mag">SOCIO</span>',
            "¿Con quién te la jugarías tú?",
            mini([("star", "RAUL BAUTISTA", "Atracador veterano"),
                  ("users", "¿Y TU SOCIO?", "El que nunca te deja tirado"),
                  ("car", "AL VOLANTE", "Conduce sin perder los nervios")]),
            "ETIQUETA A TU COMPAÑERO DE ATRACOS 👇", size=100)
assert "top:200px;z-index:10;text-align:center" in html
html = html.replace("top:200px;z-index:10;text-align:center", "top:575px;z-index:10;text-align:center", 1)

render([(html, salida("N22nov-1.jpg"), 1080, 1350)])
