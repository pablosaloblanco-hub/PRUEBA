"""Historia NH22nov: 1080x1920 (NH-22nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('Places/Ambrosia/Ambrosia_01.jpg')

render([
    (story(FOTO, 'ETIQUETA A TU SOCIO',
           '¿QUIÉN ES TU <span class="mag">SOCIO</span>?',
           'Tu compañero de atracos en Leonida',
           ['El que siempre conduce', 'El que vigila la puerta', 'El que lo lía todo (tú)'], size=130, pos='center'),
     salida('NH-22nov.jpg'), 1080, 1920),
])
