"""Historia H01dic-historia-etiqueta-a-tu-duo: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'People/Real Dimez/Real_Dimez_03.jpg'

render([
    (story(quote(FOTO), 'REAL DIMEZ',
           '¿QUIÉN ES TU <span class="mag">DÚO</span>?',
           'Bae-Luxe y Roxy lo tienen claro',
           ['Real Dimez: dúo de rap', 'Amigas desde el instituto', 'Etiqueta al tuyo en el post'],
           size=130, pos='58% center'),
     salida('H-01dic.jpg'), 1080, 1920),
])
