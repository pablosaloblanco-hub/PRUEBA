import pytest
from PIL import Image

from conftest import TEXTO_IG, TEXTO_TT
from gta6espa import metricool, piezas


def test_ciclo_completo(espacio):
    p = piezas.nueva("19-zonas", "Zonas favoritas", "suelta", fecha="2026-11-27 10:00")
    with pytest.raises(piezas.ErrorPieza, match="saltar"):
        piezas.avanzar(p["id"], "disenada")
    piezas.avanzar(p["id"], "aprobada")
    with pytest.raises(piezas.ErrorPieza, match="texto de instagram"):
        piezas.avanzar(p["id"], "redactada")
    piezas.actualizar(p["id"], textos={"instagram": TEXTO_IG, "tiktok": TEXTO_TT}, titulo_tiktok="Tu zona favorita 🌴")
    piezas.avanzar(p["id"], "redactada")

    with pytest.raises(piezas.ErrorPieza, match="lista de medios"):
        piezas.avanzar(p["id"], "disenada")
    img = piezas.carpeta_trabajo(p["id"]) / "19-1.jpg"
    Image.new("RGB", (1080, 1350), "#12061f").save(img, "JPEG")
    (piezas.TRABAJO / "capturas" / "Places").mkdir(parents=True)
    (piezas.TRABAJO / "capturas" / "Places" / "vice.jpg").write_bytes(b"x")
    piezas.actualizar(p["id"], medios=["19-1.jpg"], capturas=["Places/vice.jpg"], datos_usados=["Zonas de Leonida"])
    piezas.avanzar(p["id"], "disenada")

    with pytest.raises(piezas.ErrorPieza, match="hoja de contacto"):
        piezas.avanzar(p["id"], "revisada")
    from gta6espa.hoja_contacto import hoja
    hoja([img], piezas.carpeta_trabajo(p["id"]) / "hoja_contacto.jpg")
    piezas.avanzar(p["id"], "revisada")

    with pytest.raises(piezas.ErrorPieza, match="Drive"):
        piezas.avanzar(p["id"], "subida")
    piezas.actualizar(p["id"], drive={"19-1.jpg": "ABC123"})
    piezas.avanzar(p["id"], "subida")

    peticiones = metricool.peticiones(piezas.cargar(p["id"]))
    assert [x["red"] for x in peticiones] == ["instagram", "tiktok"]
    assert peticiones[0]["date"] == "2026-11-27T10:00:00+01:00"
    assert "drive.google.com/file/d/ABC123/view" in peticiones[1]["info"]
    assert '"autoAddMusic": true' in peticiones[1]["info"]

    # Los IDs no se quedan en la ficha que va al repositorio público
    import yaml
    publica = yaml.safe_load(piezas.ruta_ficha(p["id"]).read_text())
    assert publica["drive"] == {} and piezas.cargar(p["id"])["drive"] == {"19-1.jpg": "ABC123"}
    piezas.actualizar(p["id"], metricool={"instagram": "1", "tiktok": "2"})
    piezas.avanzar(p["id"], "programada")
    assert piezas.cargar(p["id"])["estado"] == "programada"
    assert len(piezas.cargar(p["id"])["historial"]) == 7


def test_historia_solo_instagram_y_sin_texto(espacio):
    p = piezas.nueva("h-27nov", "Historia zonas", "historia", redes=["instagram", "tiktok"], fecha="2026-07-27 13:00")
    assert p["redes"] == ["instagram"]
    piezas.actualizar(p["id"], medios=["h.jpg"], drive={"h.jpg": "X"})
    info = metricool.info_para(piezas.cargar(p["id"]), "instagram")
    assert info["text"] == "" and info["instagramData"]["type"] == "STORY"
    # En verano Madrid va a +02:00
    assert metricool.peticiones(piezas.cargar(p["id"]))[0]["date"].endswith("+02:00")


def test_youtube_solo_reels(espacio):
    p = piezas.nueva("x", "Short", "reel")
    assert p["redes"] == ["instagram", "tiktok", "youtube"]
    with pytest.raises(piezas.ErrorPieza, match="Reels"):
        piezas.nueva("y", "Carrusel", "carrusel", redes=["youtube"])


def test_estados_especiales_y_volver_atras(espacio):
    p = piezas.nueva("20-x", "X", "carrusel", fecha="2026-11-28 10:00")
    piezas.avanzar(p["id"], "aprobada")
    piezas.avanzar(p["id"], "idea", nota="Pablo pide cambiar el tema")
    piezas.avanzar(p["id"], "descartada")
    assert piezas.cargar(p["id"])["estado"] == "descartada"
