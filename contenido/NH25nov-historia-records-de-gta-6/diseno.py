"""Historia NH25nov: 1080x1920 (NH-25nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_05.jpg')

render([
    (story(FOTO, 'DATOS DE RÉCORD',
           'LOS RÉCORDS DE <span class="ye">GTA&nbsp;6</span>',
           'Antes de salir ya lo había roto todo',
           ['Tráiler 1: 93 M en 24 h', 'Tráiler 2: +475 M en 24 h', 'Récord Guinness incluido'], size=120, pos='center'),
     salida('NH-25nov.jpg'), 1080, 1920),
])
