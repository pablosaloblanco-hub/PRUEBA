import datetime as dt
import json

from gta6espa import calendario


def _post(id_, fecha, red, tipo=None):
    p = {"id": id_, "publicationDate": {"dateTime": fecha, "timezone": "Europe/Madrid"},
         "providers": [{"network": red}], "text": ""}
    if tipo:
        p["instagramData"] = {"type": tipo}
    return p


def test_huecos_y_choques(tmp_path):
    datos = {"data": [
        _post(1, "2030-01-01T10:00:00", "instagram", "POST"),
        _post(2, "2030-01-01T10:00:00", "tiktok"),
        _post(3, "2030-01-01T13:00:00", "instagram", "STORY"),
        _post(4, "2030-01-02T18:30:00", "instagram", "POST"),
        _post(5, "2030-01-02T18:00:00", "instagram", "REEL"),
    ]}
    ruta = tmp_path / "prog.json"
    ruta.write_text(json.dumps(datos))
    prog = calendario.leer_programado(ruta)
    # Instagram ya tiene su post diario los dos días: no hay huecos
    assert calendario.huecos(prog, dt.date(2030, 1, 1), 2, "carrusel", ["instagram", "tiktok"]) == []
    libres = calendario.huecos(prog, dt.date(2030, 1, 1), 2, "carrusel", ["tiktok"])
    assert [h.strftime("%d %H:%M") for h in libres] == ["01 18:00", "02 10:00", "02 18:00"]
    hist = calendario.huecos(prog, dt.date(2030, 1, 1), 2, "historia", ["instagram"])
    assert [h.strftime("%d %H:%M") for h in hist] == ["02 13:00"]
    assert calendario.dias_vacios(prog, dt.date(2030, 1, 1), 3) == [dt.date(2030, 1, 3)]
    malos = calendario.choques(prog)
    assert len(malos) == 1 and {malos[0][0].id, malos[0][1].id} == {"4", "5"}


def test_maximo_diario_instagram(tmp_path):
    datos = [_post(1, "2030-02-01T00:05:00", "instagram", "POST"),
             _post(2, "2030-02-01T18:00:00", "instagram", "POST"),
             _post(3, "2030-02-02T10:00:00", "instagram", "POST")]
    ruta = tmp_path / "p.json"; ruta.write_text(json.dumps(datos))
    prog = calendario.leer_programado(ruta)
    assert [(d.day, r, g, n) for d, r, g, n in calendario.excesos(prog)] == [(1, "instagram", "feed", 2)]
    libres = calendario.huecos(prog, dt.date(2030, 2, 2), 2, "carrusel", ["instagram"])
    assert all(h.date() != dt.date(2030, 2, 2) for h in libres)  # el 2 ya tiene su post


def test_borradores_no_cuentan(tmp_path):
    datos = [_post(1, "2030-03-01T10:00:00", "instagram", "POST"),
             dict(_post(2, "2030-03-01T10:00:00", "instagram", "POST"), draft=True)]
    ruta = tmp_path / "p.json"; ruta.write_text(json.dumps(datos))
    prog = calendario.leer_programado(ruta)
    assert len(prog) == 1 and calendario.choques(prog) == [] and calendario.excesos(prog) == []


def test_reels_tienen_su_propio_maximo(tmp_path):
    datos = [_post(1, "2030-04-01T10:00:00", "instagram", "POST"),
             _post(2, "2030-04-01T11:30:00", "instagram", "REEL"),
             _post(3, "2030-04-01T20:30:00", "instagram", "REEL"),
             _post(4, "2030-04-01T14:30:00", "instagram", "REEL")]
    ruta = tmp_path / "p.json"; ruta.write_text(json.dumps(datos))
    prog = calendario.leer_programado(ruta)
    assert calendario.excesos(prog) == []
    assert all(h.date() != dt.date(2030, 4, 1) for h in calendario.huecos(prog, dt.date(2030, 4, 1), 2, "reel", ["instagram"]))
    assert [h.strftime("%d %H:%M") for h in calendario.huecos(prog, dt.date(2030, 4, 2), 1, "reel", ["instagram"])] == ["02 11:30", "02 14:30", "02 20:30"]
    tt = calendario.huecos([], dt.date(2030, 4, 2), 1, "reel", ["tiktok", "youtube"])
    assert [h.strftime("%H:%M") for h in tt] == ["11:30", "14:30", "16:30", "20:30", "22:30"]


def test_efectos_sonidos_y_filtro():
    from gta6espa import efectos
    for tipo in efectos.SONIDOS:
        x = efectos.sonido(tipo)
        assert len(x) > 1000 and abs(x).max() <= 1.0
    f = efectos._filtro_tramo({"inicio": 0, "fin": 3, "zoom": [[1, 0.5, 1.3]], "temblor": [[1, 0.4, 10]],
                               "destello": [1], "congelar": 0.5}, "cuadrado", 1920, 1080)
    assert "zoompan" in f and "tpad" in f and "boxblur" in f and "crop=788:788" in f


def test_clip_externo_modo_cita(monkeypatch):
    from gta6espa import validar
    monkeypatch.setattr(validar, "creadores", lambda: [])
    p = {"redes": ["instagram"], "clip_externo": {"creador": "@alguien", "url": "https://x", "duracion_s": 8},
         "textos": {"instagram": "Clip: @alguien"}}
    assert validar.validar_clip_externo(p) == []
    p["clip_externo"]["duracion_s"] = 25
    assert any("modo cita" in h.mensaje for h in validar.validar_clip_externo(p))
    monkeypatch.setattr(validar, "creadores", lambda: [{"usuario": "@alguien", "permiso": "escrito"}])
    assert validar.validar_clip_externo(p) == []
    monkeypatch.setattr(validar, "creadores", lambda: [{"usuario": "@alguien", "permiso": "no"}])
    assert any("no se usen" in h.mensaje for h in validar.validar_clip_externo(p))
    p["textos"]["instagram"] = "sin crédito"
    assert any("Clip: @alguien" in h.mensaje for h in validar.validar_clip_externo(p))


def test_ia_exige_aviso():
    from gta6espa import validar
    p = {"id": "x", "formato": "reel", "redes": ["tiktok"], "ia": True, "medios": [], "titulo_tiktok": "t",
         "textos": {"tiktok": "hola"}}
    assert any("IA" in h.mensaje for h in validar.validar_pieza(p))
