"""Historia H28nov-historia-leonida-vs-florida: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'Places/Ambrosia/Ambrosia_04.jpg'

render([
    (story(quote(FOTO), 'LEONIDA VS FLORIDA',
           'LEONIDA EXISTE <span class="cy">(CASI)</span>',
           'Así se inspira en la Florida real',
           ['Vice City = Miami', 'Leonida Keys = los Cayos', 'Grassrivers = Everglades'],
           size=130, pos='60% center'),
     salida('H-28nov.jpg'), 1080, 1920),
])
