"""Historia H06dic-historia-reto-foto-del-puente: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('Places/Leonida Keys/Leonida_Keys_03.jpg')

render([
    (story(FOTO, '6 FOTOS',
           'RETO FOTO DEL <span class="ye">PUENTE</span>',
           '¿Cuál es tu foto más rara?',
           ['Haz tus 6 fotos en Leonida', 'Por DM y sin spoilers', 'Las mejores, con tu @'],
           size=130, pos='58% center'),
     salida('H-06dic.jpg'), 1080, 1920),
])
