"""31 · 9 cosas para hacer en Leonida que no son la historia (carrusel de 5).

Rótulo de cada foto = zona de la carpeta de la captura, nunca un barrio.
Grassrivers_03 (guion, 3/5) descartada: el hombre del hidrodeslizador apunta con una escopeta
a un caimán (arma + caza). Se usa Grassrivers_05 (pantano con la ciudad al fondo).
Subetiqueta cian acortada a «PLANES 0X–0Y · MÁRCALOS»: «MARCA CUÁNTAS LLEVAS · 0X–0Y» pisaba la marca de agua.
"""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_06.jpg")
F2 = foto("Places/Vice City/Vice_City_26.jpg")
F3 = foto("Places/Grassrivers/Grassrivers_05.jpg")
F4 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_05.jpg")
F5 = foto("Places/Grassrivers/Grassrivers_02.jpg")
TOTAL = 5

render([
    (cover(F1, "SIN SPOILERS",
           '9 COSAS PARA HACER EN <span class="ye">LEONIDA</span>',
           '…que <span class="mag">no son la historia</span>',
           [("check", "9 PLANES"), ("map", "6 ZONAS"), ("save", "GUÁRDALO")], 1, TOTAL),
     salida("31-1.jpg"), 1080, 1350),
    (info(F2, "VICE CITY", "PLANES 01–03 · MÁRCALOS",
          [("palm", "01 · PASEA", "OCEAN BEACH", "Date una vuelta sin prisa por este rincón de Vice City", "ye"),
           ("pin", "02 · PIÉRDETE", "LITTLE CUBA", "Callejea sin rumbo fijo y sin mirar el mapa", "cy"),
           ("star", "03 · CURIOSEA", "TISHA-WOCKA", "Pasa por el mercadillo y mira qué se cuece", "mag")], 2, TOTAL),
     salida("31-2.jpg"), 1080, 1350),
    (info(F3, "GRASSRIVERS", "PLANES 04–06 · MÁRCALOS",
          [("eye", "04 · ACÉRCATE", "EL PUERTO", "Remata la ruta por Vice City junto al agua, en su puerto", "ye"),
           ("car", "05 · CRUZA", "LEONIDA KEYS", "Ve de isla en isla por los puentes cuando llegues a los Keys", "cy"),
           ("map", "06 · MÉTETE", "GRASSRIVERS", "Adéntrate en los pantanos y manglares, lejos del asfalto", "mag")], 3, TOTAL),
     salida("31-3.jpg"), 1080, 1350),
    (info(F4, "MOUNT KALAGA", "PLANES 07–09 · MÁRCALOS",
          [("pin", "07 · BUSCA", "PORT GELLHORN", "Recorre sus moteles baratos y echa un ojo a las atracciones cerradas", "ye"),
           ("bolt", "08 · MIRA", "ALLIED CRYSTAL", "Sube a Ambrosia a ver de cerca la refinería de azúcar", "cy"),
           ("globe", "09 · SAL", "MOUNT KALAGA", "De pesca o de ruta todoterreno por la frontera norte", "mag")], 4, TOTAL),
     salida("31-4.jpg"), 1080, 1350),
    (close(F5, "¿Cuántas llevas de 9?", "Comenta tu número y guarda la lista para cuando llegues 👇",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 5, TOTAL),
     salida("31-5.jpg"), 1080, 1350),
])
