"""N23nov · Más allá de Lucia y Jason: 6 personajes de Leonida (carrusel de 8)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


def sub_corto(texto: str) -> str:
    """Subetiqueta larga: algo más pequeña para no pisar la marca de agua de la foto."""
    return f'<span style="font-size:29px;letter-spacing:2px">{texto}</span>'


TOTAL = 8
W, H = 1080, 1350

F_PORTADA = foto("People/DreQuan Priest/DreQuan_Priest_03.jpg")
F_CAL = foto("People/Cal Hampton/Cal_Hampton_01.jpg")
# Boobie_Ike_03 (bailarina de barra al fondo) y Boobie_Ike_01 (pistola en la mesa) descartadas.
F_BOOBIE = foto("Places/Vice City/Vice_City_13.jpg")
# Revisor 19/11: la discoteca no es su club. Pie visible para que se lea como foto de ambiente.
PIE_AMBIENTE = ('<div style="position:absolute;right:60px;top:180px;z-index:12;font-family:Barlow Condensed;'
                'font-weight:800;font-size:24px;letter-spacing:2px;color:#fff;background:rgba(11,6,18,.75);'
                'padding:4px 12px;border-radius:8px">FOTO: AMBIENTE DE VICE CITY</div>')
F_DREQUAN = foto("People/DreQuan Priest/DreQuan_Priest_04.jpg")
F_DIMEZ = foto("People/Real Dimez/Real_Dimez_03.jpg")
F_RAUL = foto("People/Raul Bautista/Raul_Bautista_03.jpg")
F_BRIAN = foto("People/Brian Heder/Brian_Heder_02.jpg")
F_CIERRE = foto("Places/Vice City/Vice_City_11.jpg")

render([
    (cover(F_PORTADA, "6 PERSONAJES DE LEONIDA",
           'MÁS ALLÁ DE <span class="ye">LUCIA</span><br>Y <span class="cy">JASON</span>',
           "6 nombres que ya conoces, tal y como los presentó Rockstar",
           [("users", "6 personajes"), ("info", "Descripción oficial"),
            ("eye", "Cero spoilers"), ("save", "Guárdalo")], 1, TOTAL, size=128),
     salida("N23nov-1.jpg"), W, H),

    (info(F_CAL, "CAL HAMPTON", "SOCIO DE BRIAN HEDER",
          [("users", "SU SOCIO", "Brian Heder", "Trabaja con Brian, el contrabandista veterano de los Keys.", "ye"),
           ("eye", "QUÉ HACE", "Oído a la Guardia Costera", "Escucha las comunicaciones de la Guardia Costera.", "cy")],
          2, TOTAL, photo_h=740),
     salida("N23nov-2.jpg"), W, H),

    (info(F_BOOBIE, "BOOBIE IKE", "LEYENDA DE VICE CITY",
          [("star", "QUIÉN ES", "Leyenda de Vice City", "Así lo presenta Rockstar.", "ye"),
           ("map", "SUS NEGOCIOS", "Inmobiliaria, club y estudio", "Tres negocios en plena Vice City.", "cy"),
           ("disc", "ONLY RAW RECORDS", "Socio de Dre'Quan", "Comparte el sello con Dre'Quan Priest.", "mag")],
          3, TOTAL).replace('<div class="border"></div>', PIE_AMBIENTE + '<div class="border"></div>', 1),
     salida("N23nov-3.jpg"), W, H),

    (info(F_DREQUAN, "DRE'QUAN PRIEST", sub_corto("MÁS BUSCAVIDAS QUE GÁNSTER"),
          [("bolt", "CÓMO ES", "Más buscavidas que gánster", "La definición que da Rockstar.", "ye"),
           ("disc", "SU SELLO", "Only Raw Records", "El sello que comparte con Boobie Ike.", "cy"),
           ("star", "SU FICHAJE", "Real Dimez", "Ha fichado al dúo de rap de Bae-Luxe y Roxy.", "mag")],
          4, TOTAL),
     salida("N23nov-4.jpg"), W, H),

    (info(F_DIMEZ, "REAL DIMEZ", "BAE-LUXE Y ROXY",
          [("users", "QUIÉNES SON", "Dúo de rap", "Bae-Luxe y Roxy forman Real Dimez.", "ye"),
           ("heart", "AMIGAS", "Desde el instituto", "Y fichadas por Dre'Quan en Only Raw Records.", "cy")],
          5, TOTAL, photo_h=740),
     salida("N23nov-5.jpg"), W, H),

    (info(F_RAUL, "RAUL BAUTISTA", "ATRACADOR VETERANO",
          [("star", "QUIÉN ES", "Atracador veterano", "Así lo presenta Rockstar: un veterano de los atracos.", "ye"),
           ("eye", "LO DEMÁS", "Sin spoilers", "Lo que haga en Leonida lo descubres tú jugando.", "cy")],
          6, TOTAL, photo_h=740),
     salida("N23nov-6.jpg"), W, H),

    (info(F_BRIAN, "BRIAN HEDER", sub_corto("CONTRABANDISTA DE LOS KEYS"),
          [("palm", "QUIÉN ES", "Contrabandista veterano", "Así lo presenta Rockstar, con base en los Keys.", "ye"),
           ("pin", "SU ZONA", "Leonida Keys", "Islas unidas por puentes, como los Cayos de Florida.", "cy"),
           ("users", "SU SOCIO", "Cal Hampton", "Cal trabaja con él.", "mag")],
          7, TOTAL),
     salida("N23nov-7.jpg"), W, H),

    (close(F_CIERRE, "¿Tu favorito?", "Comenta su nombre… y sin spoilers, por favor",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 8, TOTAL),
     salida("N23nov-8.jpg"), W, H),
])
