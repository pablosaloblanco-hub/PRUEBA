"""N21nov · Cómo grabar tus clips de GTA 6 en PS5 (carrusel de 6, 1080×1350). Guía solo de PS5."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_01.jpg")
F2 = foto("Places/Leonida Keys/Leonida_Keys_01.jpg")
F3 = foto("Places/Leonida Keys/Leonida_Keys_04.jpg")
F4 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_06.jpg")
F5 = foto("Places/Leonida Keys/Leonida_Keys_07.jpg")
F6 = foto("Places/Vice City/Vice_City_19.jpg")
TOTAL = 6

render([
    (cover(F1, "GUÍA DE PS5",
           'NO PIERDAS TU <span class="ye">MEJOR MOMENTO</span> EN <span class="mag">LEONIDA</span>',
           "Cómo grabar tus clips de GTA 6 en PS5, en 4 pasos",
           [("bolt", "ÚLTIMOS 30 S"), ("clock", "DE 15 S A 1 H"),
            ("cam", "GRABACIÓN NUEVA"), ("send", "MÁNDANOS TU CLIP")], 1, TOTAL, size=120, pos="25% center"),
     salida("N21nov-1.jpg"), 1080, 1350),
    (info(F2, "01 · EL ATAJO", "DOBLE PULSACIÓN",
          [("bolt", "PULSA DOS VECES", "BOTÓN CREAR", "El botón Crear del mando de PS5", "ye"),
           ("save", "SE GUARDAN", "LOS ÚLTIMOS 30 S", "Es lo que hace por defecto", "cy"),
           ("check", "CUÁNDO", "AL MOMENTO", "Justo después de la jugada que quieres guardar", "mag")], 2, TOTAL),
     salida("N21nov-2.jpg"), 1080, 1350),
    (info(F3, "02 · PARTIDA RECIENTE", "MENÚ CREAR",
          [("pad", "EN EL MENÚ CREAR", "GUARDAR PARTIDA RECIENTE", "Elige esta opción", "ye"),
           ("clock", "DURACIÓN", "DE 15 S A 1 H", "Tú decides cuánto tiempo guardar", "cy"),
           ("save", "PARA", "UN RATO LARGO", "Cuando el momento ha durado más de 30 s", "mag")], 3, TOTAL),
     salida("N21nov-3.jpg"), 1080, 1350),
    (info(F4, "03 · GRABACIÓN NUEVA", "GRABA LO QUE VIENE",
          [("cam", "OPCIÓN", "GRABACIÓN NUEVA", "Empieza a grabar desde ese momento", "ye"),
           ("clock", "MÁXIMO", "HASTA 1 H", "De partida seguida en un solo clip", "cy"),
           ("eye", "IDEAL PARA", "RUTAS Y PASEOS", "Una vuelta en kayak o en coche por Leonida", "mag")], 4, TOTAL),
     salida("N21nov-4.jpg"), 1080, 1350),
    (info(F5, "04 · CAMBIA EL ATAJO", "AJUSTES DE PS5",
          [("info", "EN AJUSTES", "CAPTURAS Y EMISIONES", "Entra en los Ajustes de la consola", "ye"),
           ("pad", "Y LUEGO", "ACCESOS DIRECTOS", "Del botón Crear: ahí cambias qué hace la doble pulsación", "cy"),
           ("bolt", "SI NO LO TOCAS", "30 S", "Es lo que guarda la doble pulsación por defecto", "mag")], 5, TOTAL),
     salida("N21nov-5.jpg"), 1080, 1350),
    (close(F6, "¡Mándanos tu clip!",
           "Por DM y sin spoilers 🎬<br>Compartimos los mejores mencionándote<br>¿Juegas en Xbox Series X/S? También vale",
           [("send", "MANDA TU CLIP"), ("save", "GUARDA"), ("users", "COMPARTE")], 6, TOTAL),
     salida("N21nov-6.jpg"), 1080, 1350),
])
