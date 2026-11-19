"""Historia H10dic-historia-tu-juego-del-ano: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
    return quote(ruta)


FOTO = foto('People/Cal Hampton/Cal_Hampton_01.jpg')

render([
    (story(FOTO, 'PREGUNTA',
           '¿TU JUEGO DEL <span class="ye">AÑO</span>?',
           'Dínoslo sin pensarlo mucho',
           ['Solo uno, sin empates', 'No tiene que ser GTA 6', 'Lo contamos en comentarios'],
           size=130, pos='70% center'),
     salida('H-10dic.jpg'), 1080, 1920),
])
