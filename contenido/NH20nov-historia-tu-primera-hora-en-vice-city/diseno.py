"""Historia NH20nov: 1080x1920 (NH-20nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('Places/Vice City/Vice_City_03.jpg')

render([
    (story(FOTO, 'PLAN DE ESTRENO',
           'TU PRIMERA HORA EN <span class="cy">VICE CITY</span>',
           'Elige plan y vota en la encuesta',
           ['Atardecer en Ocean Beach', 'Paseo por Little Cuba', 'Mercadillo Tisha-Wocka'], size=120, pos='center'),
     salida('NH-20nov.jpg'), 1080, 1920),
])
