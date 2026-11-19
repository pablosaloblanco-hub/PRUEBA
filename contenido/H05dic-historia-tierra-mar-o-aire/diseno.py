"""Historia H05dic-historia-tierra-mar-o-aire: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_01.jpg')

render([
    (story(FOTO, 'TÚ ELIGES',
           'TIERRA, <span class="cy">MAR</span> O <span class="mag">AIRE</span>',
           'Elige cómo te mueves',
           ['Tierra: sobre ruedas', 'Mar: sobre el agua', 'Aire: desde arriba'],
           size=130, pos='38% center'),
     salida('H-05dic.jpg'), 1080, 1920),
])
