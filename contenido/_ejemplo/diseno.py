"""Ejemplo de diseno.py: así genera el agente diseñador las imágenes de una pieza.

Se ejecuta con «python -m gta6espa render <id>», que:
  - pone trabajo/ en el PYTHONPATH (allí está plantilla_gta6.py, descargada de Drive);
  - apunta GTA6_ASSETS a trabajo/capturas/ (capturas oficiales ya filtradas);
  - ejecuta este archivo con trabajo/<id>/ como carpeta actual.
La plantilla necesita rutas de salida ABSOLUTAS: usa siempre salida("nombre.jpg").
La plantilla mete la foto en url() sin comillas: una ruta con espacios («Places/Vice City/...»)
sale SIN FOTO y sin dar error. Pasa siempre las capturas por foto(), que las codifica.
Las rutas de las capturas son relativas a GTA6_ASSETS y deben estar apuntadas en
«capturas» de pieza.yaml para que el revisor las compruebe.
"""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO_PORTADA = foto("Places/Vice City/Vice_City_01.jpg")
FOTO_DATOS = foto("Places/Vice City/Vice_City_10.jpg")
TOTAL = 3

render([
    (cover(FOTO_PORTADA, "GUÍA RÁPIDA",
           'LAS 6 ZONAS DE <span class="ye">LEONIDA</span>',
           "Del neón de Vice City a los pantanos de Grassrivers",
           [("map", "6 ZONAS"), ("pin", "VICE CITY"), ("palm", "LEONIDA KEYS")], 1, TOTAL),
     salida("E-1.jpg"), 1080, 1350),
    (info(FOTO_DATOS, "VICE CITY", "INSPIRADA EN MIAMI",
          [("pin", "BARRIOS", "OCEAN BEACH", "También Little Cuba y el puerto", "ye"),
           ("star", "IMPRESCINDIBLE", "TISHA-WOCKA", "El mercadillo más famoso de la ciudad", "cy"),
           ("car", "PARA EXPLORAR", "DE NOCHE", "Neón, playa y coches de lujo", "mag")], 2, TOTAL),
     salida("E-2.jpg"), 1080, 1350),
    (close(FOTO_DATOS, "¿Cuál es tu zona?", "Dínoslo en comentarios 👇",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 3, TOTAL),
     salida("E-3.jpg"), 1080, 1350),
])
