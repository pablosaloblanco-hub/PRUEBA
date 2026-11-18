"""Historia NH26nov: 1080x1920 (NH-26nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_02.jpg')

render([
    (story(FOTO, 'BALANCE SIN SPOILERS',
           'UNA SEMANA EN <span class="mag">LEONIDA</span>',
           'Cuéntanos tu primera semana',
           ['7 días desde el estreno', '¿Lo mejor? Cuéntanoslo', '¿Lo peor? (sin spoilers)'], size=120, pos='60% center'),
     salida('NH-26nov.jpg'), 1080, 1920),
])
