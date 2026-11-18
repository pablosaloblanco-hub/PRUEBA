"""N19novb · 5 excusas para no ir a trabajar hoy (carrusel TikTok, 7 diapositivas)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


TOTAL = 7
F1 = foto("Places/Vice City/Vice_City_16.jpg")
F2 = foto("People/Cal Hampton/Cal_Hampton_03.jpg")
F3 = foto("People/Brian Heder/Brian_Heder_01.jpg")
F4 = foto("People/Raul Bautista/Raul_Bautista_01.jpg")
F5 = foto("Places/Leonida Keys/Leonida_Keys_03.jpg")
F6 = foto("Places/Port Gellhorn/Port_Gellhorn_01.jpg")
F7 = foto("Places/Vice City/Vice_City_22.jpg")

render([
    (cover(F1, "HOY MEDIA ESPAÑA TIENE FIEBRE",
           '5 EXCUSAS PARA<br><span class="ye">NO IR</span> A <span class="mag">TRABAJAR</span>',
           'Hoy es el día de <span class="cy">GTA 6</span> y el cuerpo te pide Vice City',
           [("clock", "Ya se juega desde las 00:00"), ("map", "Leonida te espera"),
            ("chat", "Comenta tu número"), ("star", "100 % de broma")], 1, TOTAL, size=130),
     salida("N19novb-1.jpg"), 1080, 1350),
    (info(F2, "TENGO FIEBRE…", "EXCUSA 1<br>DE VICE CITY",
          [("fire", "LO QUE LE DICES AL JEFE", "«Tengo fiebre»", "Y no mientes: fiebre de Vice City desde las 00:00.", "ye"),
           ("star", "CREDIBILIDAD", "3/10", "Cuesta colarla desde un flotador.", "cy"),
           ("palm", "PLAN REAL", "Flotador y neón", "Reposo absoluto en Vice City, mando en mano.", "mag")], 2, TOTAL),
     salida("N19novb-2.jpg"), 1080, 1350),
    (info(F3, "SE ME HA ROTO<br>EL COCHE", "EXCUSA 2<br>UN CLÁSICO",
          [("car", "LO QUE LE DICES AL JEFE", "«No me arranca»", "El de la vida real. El de Leonida va como un tiro.", "ye"),
           ("star", "CREDIBILIDAD", "5/10", "La excusa más vieja del mundo, pero sigue funcionando.", "cy"),
           ("map", "PLAN REAL", "Ruta por Leonida", "De Vice City a los Keys por los puentes, ventanilla bajada.", "mag")], 3, TOTAL),
     salida("N19novb-3.jpg"), 1080, 1350),
    (info(F4, "ME MUDO<br>A LEONIDA", "EXCUSA 3<br>LLAMADA URGENTE",
          [("chat", "LO QUE LE DICES AL JEFE", "«Es una mudanza»", "Urgente, de hoy para hoy… y con destino a Leonida.", "ye"),
           ("pin", "BARRIOS PARA ELEGIR", "6 zonas", "Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia o Mount Kalaga.", "cy"),
           ("star", "CREDIBILIDAD", "1/10", "Tu jefe sabe perfectamente qué sale hoy.", "mag")], 4, TOTAL, photo_h=540),
     salida("N19novb-4.jpg"), 1080, 1350),
    (info(F5, "NO HE DORMIDO", "EXCUSA 4<br>LA MÁS SINCERA",
          [("clock", "LO QUE LE DICES AL JEFE", "«Salió a las 00:00»", "En la Península y Baleares; en Canarias, una hora más tarde.", "ye"),
           ("star", "CREDIBILIDAD", "10/10", "La única que es verdad. Tus ojeras lo confirman.", "cy"),
           ("save", "CONSEJO", "Guarda partida", "Y duerme algo esta semana, que Leonida no se va a ir.", "mag")], 5, TOTAL),
     salida("N19novb-5.jpg"), 1080, 1350),
    (info(F6, "ME VOY<br>DE ESCAPADA", "EXCUSA 5<br>PORT GELLHORN",
          [("pin", "LO QUE LE DICES AL JEFE", "«Asuntos personales»", "Una escapada a «la costa olvidada» de Leonida.", "ye"),
           ("star", "CREDIBILIDAD", "4/10", "Nadie se coge un motel un jueves por la mañana.", "cy"),
           ("info", "LO QUE CUENTA ROCKSTAR", "Moteles baratos", "Port Gellhorn: moteles baratos y atracciones cerradas.", "mag")], 6, TOTAL),
     salida("N19novb-6.jpg"), 1080, 1350),
    (close(F7, "¿Cuál vas<br>a usar?",
           'Comenta el número (del 1 al 5) y etiqueta a quien la necesita hoy<br><span class="ye">Todas de broma: el jefe también quiere jugar</span>',
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 7, TOTAL, size=120),
     salida("N19novb-7.jpg"), 1080, 1350),
])
