"""Historia H07dic-historia-normas-de-trafico-en-vice-city: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('Places/Vice City/Vice_City_03.jpg')

render([
    (story(FOTO, 'HUMOR',
           '¿CARNÉ POR PUNTOS EN <span class="ye">VICE CITY</span>?',
           'Del 1 al 10, sé sincero',
           ['Nota 1: ¿Semáforo? ¿Cuál?', 'Nota 5: según el día', 'Nota 10: conductor ejemplar'],
           size=120, pos='50% center'),
     salida('H-07dic.jpg'), 1080, 1920),
])
