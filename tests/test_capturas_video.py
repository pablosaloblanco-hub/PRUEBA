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


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="sin ffmpeg")
def test_reel_con_superposicion_tapa_la_franja(tmp_path):
    from gta6espa import video
    clip = tmp_path / "clip.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=white:size=1920x1080:rate=30",
                    "-t", "9", "-c:v", "libx264", str(clip)], check=True)
    franja = tmp_path / "franja.png"
    im = Image.new("RGBA", (720, 1280), (0, 0, 0, 0))
    im.paste((10, 6, 18, 255), (0, 1050, 720, 1280))
    im.save(franja)
    salida = video.montar([{"ruta": str(clip)}], tmp_path / "r.mp4", superposiciones=[{"ruta": str(franja)}])
    fot = tmp_path / "f.png"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "4", "-i", str(salida), "-frames:v", "1", str(fot)], check=True)
    with Image.open(fot) as f:
        assert sum(f.convert("RGB").getpixel((360, 1200))) < 80    # franja oscura encima
        assert sum(f.convert("RGB").getpixel((360, 300))) > 600    # vídeo blanco debajo
