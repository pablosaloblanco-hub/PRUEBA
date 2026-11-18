from PIL import Image

from conftest import TEXTO_IG, TEXTO_TT
from gta6espa import validar


def errores(h):
    return [x.mensaje for x in h if x.nivel == "ERROR"]


def test_texto_correcto_instagram_y_tiktok():
    assert errores(validar.validar_texto(TEXTO_IG, "instagram", "carrusel")) == []
    assert errores(validar.validar_texto(TEXTO_TT, "tiktok", "carrusel")) == []


def test_falta_credito_y_hashtag():
    texto = "Comenta tu zona #GTA6 #GTAVI #ViceCity #Leonida"
    e = errores(validar.validar_texto(texto, "instagram", "carrusel"))
    assert any("crédito" in m for m in e)
    assert any("#GTA6Español" in m for m in e)


def test_instagram_exige_credito_completo():
    texto = TEXTO_IG.replace(" · Cuenta fan · No oficial", "")
    assert any("completo" in m for m in errores(validar.validar_texto(texto, "instagram", "carrusel")))


def test_tiktok_exige_parati():
    texto = TEXTO_TT.replace("#parati ", "")
    assert any("#parati" in m for m in errores(validar.validar_texto(texto, "tiktok", "carrusel")))


def test_demasiados_hashtags():
    texto = TEXTO_IG + " #PS5 #Xbox"
    assert any("máximo" in m for m in errores(validar.validar_texto(texto, "instagram", "carrusel")))


def test_dato_prohibido_sin_tildes_ni_mayusculas():
    texto = TEXTO_IG + "\nSale el 26 DE MAYO de 2026 y estará Disponible en PC"
    e = errores(validar.validar_texto(texto, "instagram", "carrusel"))
    assert sum("prohibido" in m for m in e) == 2


def test_spoiler_es_aviso():
    h = validar.validar_texto(TEXTO_IG + "\nOjo con el final del juego", "instagram", "carrusel")
    assert errores(h) == []
    assert any(x.nivel == "AVISO" and "spoiler" in x.mensaje for x in h)


def test_historia_sin_texto():
    assert validar.validar_texto("", "instagram", "historia") == []
    assert errores(validar.validar_texto("hola", "instagram", "historia"))


def test_imagen_tamano_y_formato(tmp_path):
    bien = tmp_path / "1.jpg"
    Image.new("RGB", (1080, 1350)).save(bien, "JPEG")
    assert validar.validar_imagen(bien, "carrusel") == []
    png = tmp_path / "2.png"
    Image.new("RGB", (1080, 1920)).save(png, "PNG")
    e = errores(validar.validar_imagen(png, "carrusel"))
    assert any("JPG" in m for m in e) and any("1080×1350" in m for m in e)


def test_capturas_prohibidas_y_carpeta():
    e = errores(validar.validar_capturas(["People/Lucia Caminos/x.jpg", "Jason Duval/y.jpg", "Places/vice.jpg"]))
    assert len(e) == 2
    assert errores(validar.validar_capturas(["Trailer/z.jpg"]))
