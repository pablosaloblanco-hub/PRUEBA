"""Diseño · 20 · Leonida vs Florida: los sitios reales que inspiran GTA 6 (carrusel 6 diapositivas)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # la plantilla mete la ruta en url() sin comillas: hay que codificar los espacios
    return quote(ruta)


TOTAL = 6
F1 = foto("Places/Grassrivers/Grassrivers_05.jpg")
F2 = foto("Places/Vice City/Vice_City_03.jpg")
F3 = foto("Places/Leonida Keys/Leonida_Keys_01.jpg")
F4 = foto("Places/Grassrivers/Grassrivers_04.jpg")
F5 = foto("Places/Port Gellhorn/Port_Gellhorn_06.jpg")
F6 = foto("Places/Vice City/Vice_City_11.jpg")

render([
    (cover(F1, "LEONIDA VS FLORIDA",
           'LEONIDA <span class="gl-ye">EXISTE</span><br><span class="gl-cy">(CASI)</span>',
           "Los sitios reales que inspiran GTA 6",
           [("globe", "Florida"), ("pin", "Miami"), ("palm", "Cayos"), ("map", "Everglades")], 1, TOTAL),
     salida("20-1.jpg"), 1080, 1350),
    (info(F2, "VICE CITY", "INSPIRADA EN MIAMI",
          [("pin", "EQUIVALENTE REAL", "Miami", "La gran ciudad de Leonida se inspira en Miami.", "ye"),
           ("palm", "ZONAS DE LA CIUDAD", "Ocean Beach · Little Cuba", "Dos de los sitios de Vice City que ha enseñado Rockstar.", "cy"),
           ("map", "Y ADEMÁS", "Tisha-Wocka y el puerto", "El mercadillo Tisha-Wocka y la zona del puerto.", "mag")], 2, TOTAL),
     salida("20-2.jpg"), 1080, 1350),
    (info(F3, "LEONIDA KEYS", "COMO LOS CAYOS DE FLORIDA",
          [("pin", "EQUIVALENTE REAL", "Cayos de Florida", "La versión de Leonida de los famosos cayos.", "ye"),
           ("car", "CÓMO ES", "Islas + puentes", "Rockstar la presenta como islas unidas por puentes.", "cy"),
           ("info", "DATO", "1 de 6 zonas", "Una de las 6 zonas de Leonida que ha presentado Rockstar.", "mag")], 3, TOTAL),
     salida("20-3.jpg"), 1080, 1350),
    (info(F4, "GRASSRIVERS", "COMO LOS EVERGLADES",
          [("pin", "EQUIVALENTE REAL", "Everglades", "El gran pantano de Florida, en versión Leonida.", "ye"),
           ("palm", "PAISAJE", "Pantanos y manglares", "Así describe Rockstar esta zona.", "cy"),
           ("globe", "ESTADO", "Leonida = Florida", "Grassrivers forma parte de Leonida, el estado inspirado en Florida.", "mag")], 4, TOTAL),
     salida("20-4.jpg"), 1080, 1350),
    (info(F5, "LAS OTRAS 3", "LO QUE CUENTA ROCKSTAR",
          [("pin", "PORT GELLHORN", "«La costa olvidada»", "Moteles baratos y atracciones cerradas.", "ye"),
           ("fire", "AMBROSIA", "Industria y moteros", "Con la refinería de azúcar Allied Crystal.", "cy"),
           ("map", "MOUNT KALAGA", "Frontera norte", "Parque nacional: caza, pesca y rutas todoterreno.", "mag")], 5, TOTAL),
     salida("20-5.jpg"), 1080, 1350),
    (close(F6, "¿Has estado en Miami o en los Cayos?",
           "Cuéntanos qué sitio real de Florida reconoces en Leonida",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 6, TOTAL, size=110),
     salida("20-6.jpg"), 1080, 1350),
])
