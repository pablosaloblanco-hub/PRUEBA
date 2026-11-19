"""Historia H09dic-historia-9-cosas-para-hacer-en-leonida: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_02.jpg')

render([
    (story(FOTO, 'GUÍA',
           '9 COSAS QUE NO SON LA <span class="ye">HISTORIA</span>',
           '3 de 9: el resto, en el post',
           ['Cruza los puentes de los Keys', 'Manglares de Grassrivers', 'Todoterreno en Mount Kalaga'],
           size=120, pos='47% center'),
     salida('H-09dic.jpg'), 1080, 1920),
])
