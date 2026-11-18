"""Historia H29nov-historia-tu-favorito-de-gta-v: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'Places/Vice City/Vice_City_26.jpg'

render([
    (story(quote(FOTO), 'VOTA EN LA ENCUESTA',
           '¿TU FAVORITO DE <span class="ye">GTA V</span>?',
           'Antes de Leonida, Los Santos',
           ['Michael', 'Franklin', 'Trevor'],
           size=130, pos='center'),
     salida('H-29nov.jpg'), 1080, 1920),
])
