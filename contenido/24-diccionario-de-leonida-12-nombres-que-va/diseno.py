"""Diccionario de Leonida: 12 nombres que vas a oír (carrusel, 6 diapositivas)."""
from pathlib import Path

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


TOTAL = 6
F1 = "Places/Vice City/Vice_City_09.jpg"
F2 = "Places/Vice City/Vice_City_15.jpg"
F3 = "Places/Leonida Keys/Leonida_Keys_02.jpg"
F4 = "Places/Port Gellhorn/Port_Gellhorn_01.jpg"
F5 = "Places/Ambrosia/Ambrosia_04.jpg"
F6 = "Places/Vice City/Vice_City_27.jpg"

render([
    (cover(F1, "GUÍA PARA NO PERDERSE",
           'DICCIONARIO DE <span class="ye">LEONIDA</span>',
           '<span class="cy">12 nombres</span> de GTA 6 que vas a oír sin parar',
           [("disc", "12 NOMBRES"), ("map", "6 ZONAS"), ("save", "GUÁRDALO")], 1, TOTAL),
     salida("24-1.jpg"), 1080, 1350),
    (info(F2, "VICE CITY", "DICCIONARIO · 01–03",
          [("map", "01 · EL ESTADO", "LEONIDA", "El estado de GTA 6, inspirado en Florida", "ye"),
           ("pin", "02 · LA CIUDAD", "VICE CITY", "La ciudad de Leonida inspirada en Miami", "cy"),
           ("palm", "03 · EN VICE CITY", "OCEAN BEACH", "Uno de los nombres de Vice City que ha enseñado Rockstar", "mag")],
          2, TOTAL),
     salida("24-2.jpg"), 1080, 1350),
    (info(F3, "LEONIDA KEYS", "DICCIONARIO · 04–06",
          [("pin", "04 · EN VICE CITY", "LITTLE CUBA", "Otro de los nombres de Vice City presentados por Rockstar", "ye"),
           ("star", "05 · EN VICE CITY", "TISHA-WOCKA", "El mercadillo de Vice City", "cy"),
           ("palm", "06 · ZONA", "LEONIDA KEYS", "Islas unidas por puentes, como los Cayos de Florida", "mag")],
          3, TOTAL),
     salida("24-3.jpg"), 1080, 1350),
    (info(F4, "PORT GELLHORN", "DICCIONARIO · 07–09",
          [("map", "07 · ZONA", "GRASSRIVERS", "Pantanos y manglares, como los Everglades", "ye"),
           ("pin", "08 · ZONA", "PORT GELLHORN", "«La costa olvidada»: moteles baratos y atracciones cerradas", "cy"),
           ("globe", "09 · ZONA", "MOUNT KALAGA", "Parque nacional en la frontera norte: caza, pesca y todoterreno", "mag")],
          4, TOTAL),
     salida("24-4.jpg"), 1080, 1350),
    (info(F5, "AMBROSIA", "DICCIONARIO · 10–12",
          [("fire", "10 · ZONA", "AMBROSIA", "Industria, refinería de azúcar y moteros", "ye"),
           ("bolt", "11 · EN AMBROSIA", "ALLIED CRYSTAL", "La refinería de azúcar de Ambrosia", "cy"),
           ("disc", "12 · SELLO", "ONLY RAW RECORDS", "El sello de Dre'Quan Priest, socio de Boobie Ike", "mag")],
          5, TOTAL),
     salida("24-5.jpg"), 1080, 1350),
    (close(F6, "¿Qué nombre te costó más?", "Comenta su número (01–12) y guarda el diccionario 👇",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 6, TOTAL),
     salida("24-6.jpg"), 1080, 1350),
])
