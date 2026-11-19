"""Historia H04dic-historia-3-anos-del-trailer-1: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('People/Brian Heder/Brian_Heder_02.jpg')

render([
    (story(FOTO, 'TRÁILER 1',
           'HOY HACE <span class="ye">3 AÑOS</span>',
           'El tráiler 1 salió el 4/12/2023',
           ['Se adelantó un día', '93 M de visitas en 24 h', '¿Dónde lo viste tú?'],
           size=130, pos='60% center'),
     salida('H-04dic.jpg'), 1080, 1920),
])
