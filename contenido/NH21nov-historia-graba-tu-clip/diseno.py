"""Historia NH21nov: 1080x1920 (NH-21nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('Places/Grassrivers/Grassrivers_02.jpg')

render([
    (story(FOTO, 'GUÍA PS5',
           'GRABA TU MEJOR <span class="ye">MOMENTO</span>',
           'Sin salir de la partida',
           ['Doble Crear = últimos 30 s', 'Partida reciente: hasta 1 h', 'Mándanos tu clip por DM'], size=120, pos='center'),
     salida('NH-21nov.jpg'), 1080, 1920),
])
