"""Historia H30nov-historia-regalar-gta-6: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_02.jpg'

render([
    (story(quote(FOTO), 'ANTES DE REGALARLO',
           '¿REGALAS <span class="ye">GTA 6</span>?',
           '3 cosas clave antes de comprarlo',
           ['Solo PS5 y Xbox Series X/S', 'Caja con código, sin disco', 'Hasta 212 GB de espacio'],
           size=130, pos='62% center'),
     salida('H-30nov.jpg'), 1080, 1920),
])
