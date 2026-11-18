import pytest

from gta6espa import piezas


@pytest.fixture
def espacio(tmp_path, monkeypatch):
    """Contenido y trabajo en carpetas temporales para no tocar el repositorio."""
    contenido, trabajo = tmp_path / "contenido", tmp_path / "trabajo"
    contenido.mkdir(); trabajo.mkdir()
    monkeypatch.setattr(piezas, "CONTENIDO", contenido)
    monkeypatch.setattr(piezas, "TRABAJO", trabajo)
    return tmp_path


TEXTO_IG = ("¿Cuál es tu zona favorita de Leonida? Comenta 👇\n\n"
            "Imágenes: Rockstar Games · Cuenta fan · No oficial.\n"
            "#GTA6 #GTAVI #GTA6Español #ViceCity #Leonida #ZonasLeonida")
TEXTO_TT = ("Tu zona favorita de Leonida 👇 Comenta #GTA6 #GTAVI #GTA6Español #ViceCity #Leonida #parati "
            "· Imágenes: Rockstar Games · Cuenta fan · No oficial")
