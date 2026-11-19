"""Historia H08dic-historia-tu-mejor-momento-en-leonida: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('People/Raul Bautista/Raul_Bautista_04.jpg')

render([
    (story(FOTO, 'SIN SPOILERS',
           'TU MEJOR MOMENTO EN <span class="cy">LEONIDA</span>',
           'Tu anécdota, en tres pasos',
           ['Un sitio de Leonida', 'Lo que pasó allí', 'Cero spoilers, por favor'],
           size=120, pos='47% center'),
     salida('H-08dic.jpg'), 1080, 1920),
])
