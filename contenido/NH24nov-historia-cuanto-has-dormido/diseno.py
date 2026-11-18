"""Historia NH24nov: 1080x1920 (NH-24nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('Places/Vice City/Vice_City_27.jpg')

render([
    (story(FOTO, 'HUMOR GAMER',
           '¿CUÁNTO HAS <span class="cy">DORMIDO</span>?',
           'Sé sincero: aquí nadie juzga',
           ['Salió el jueves a las 00:00', 'Llevamos 5 días en Leonida', 'Tu nota de sueño: 1 al 10'], size=120, pos='center'),
     salida('NH-24nov.jpg'), 1080, 1920),
])
