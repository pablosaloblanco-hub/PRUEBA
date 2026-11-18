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
