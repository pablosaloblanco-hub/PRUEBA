import json
import shutil
import subprocess
import zipfile

import pytest
from PIL import Image

from gta6espa import capturas, validar


def test_preparar_filtra_prohibidas(tmp_path):
    origen = tmp_path / "img.png"
    Image.new("RGB", (3840, 2160), "red").save(origen)
    pack = tmp_path / "pack.zip"
    with zipfile.ZipFile(pack, "w") as z:
        z.write(origen, "GTAVI_Screenshots/Places/Vice_City_01.png")
        z.write(origen, "GTAVI_Screenshots/People/Cal_01.png")
        z.write(origen, "GTAVI_Screenshots/Lucia Caminos/Lucia_01.png")
        z.write(origen, "GTAVI_Screenshots/Jason and Lucia/JL_01.png")
        z.write(origen, "../fuera.png")
    destino = tmp_path / "capturas"
    r = capturas.preparar(pack, destino)
    assert r["copiadas"] == 2 and r["saltadas_prohibidas"] == 3
    with Image.open(destino / "Places" / "Vice_City_01.jpg") as im:
        assert im.width == 1920
    assert not (tmp_path / "fuera.jpg").exists()


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="sin ffmpeg")
def test_reel_vertical_sin_audio_original(tmp_path):
    from gta6espa import video
    clip = tmp_path / "clip.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=30",
                    "-f", "lavfi", "-i", "sine=frequency=440", "-t", "10", "-c:v", "libx264", "-c:a", "aac",
                    str(clip)], check=True)
    salida = video.montar([{"ruta": str(clip)}, {"ruta": str(clip), "inicio": 2, "fin": 8}], tmp_path / "reel.mp4")
    info = validar.info_video(salida)
    v = [s for s in info["streams"] if s["codec_type"] == "video"][0]
    assert (v["width"], v["height"]) == (720, 1280)
    assert not any(s["codec_type"] == "audio" for s in info["streams"])  # audio original fuera
    assert abs(float(info["format"]["duration"]) - 16) < 0.5
    assert salida.stat().st_size <= 3_000_000
