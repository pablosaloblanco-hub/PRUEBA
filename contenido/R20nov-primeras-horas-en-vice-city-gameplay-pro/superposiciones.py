"""Superposiciones del Reel R20nov (720×1280, PNG con transparencia).

- franja.png: franja inferior con la marca y degradado superior. TAPAN los subtítulos, los
  objetivos de misión y la barra del GPS del juego, que son historia. Van durante todo el vídeo.
- gancho.png: texto grande de los primeros segundos.
- cierre.png: pregunta final para comentar.
Se ejecuta desde trabajo/<id>/ (salida en la carpeta actual).
"""
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

FUENTES = ('<link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Permanent+Marker&'
           'family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,900&display=block" rel="stylesheet">')
BASE = """<!doctype html><html><head><meta charset="utf-8">%s<style>
html,body{margin:0;width:720px;height:1280px;background:transparent;overflow:hidden;font-family:'Barlow Condensed';color:#fff}
.t{font-weight:900;font-style:italic;text-transform:uppercase;line-height:.9;letter-spacing:-1px;
   text-shadow:0 4px 18px rgba(0,0,0,.85),0 0 2px #000}
.ye{color:#ffd23f}.mag{color:#ff4fd8}.cy{color:#3ee0ff}
.pill{display:inline-block;padding:8px 18px;border-radius:999px;font-weight:900;letter-spacing:3px;font-size:24px}
</style></head><body>%s</body></html>"""

FRANJA = """
<div style="position:absolute;left:0;right:0;top:0;height:240px;
     background:linear-gradient(180deg,#0b0612 0%,#0b0612 72%,rgba(11,6,18,0) 100%)"></div>
<div style="position:absolute;left:24px;top:28px" class="pill" >
  <span style="background:#ff4fd8;padding:8px 16px;border-radius:999px;box-shadow:0 0 18px rgba(255,79,216,.7)">GAMEPLAY PROPIO · PS5</span></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:250px;
     background:linear-gradient(180deg,rgba(11,6,18,0) 0%,rgba(11,6,18,.92) 22%,#0b0612 40%,#0b0612 100%)"></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#ff4fd8,#3ee0ff)"></div>
<div style="position:absolute;left:0;right:0;bottom:82px;text-align:center">
  <span style="font-family:'Bowlby One';font-size:40px">GTA 6</span>
  <span style="font-family:'Permanent Marker';font-size:40px;color:#ffd23f"> Español</span>
  <span style="font-family:'Bowlby One';font-size:40px;color:#3ee0ff"> · @gta6espa</span></div>
<div style="position:absolute;left:0;right:0;bottom:40px;text-align:center;font-weight:800;letter-spacing:3px;font-size:20px;opacity:.9">
  GRABADO EN PS5 POR @GTA6ESPA · CUENTA FAN · NO OFICIAL</div>
"""

GANCHO = """
<div style="position:absolute;left:30px;right:30px;top:200px;text-align:center">
  <div class="t" style="font-size:96px">ASÍ SE VE</div>
  <div class="t" style="font-size:132px"><span class="ye">GTA 6</span> <span class="mag">EN PS5</span></div>
  <div style="margin-top:18px"><span class="pill" style="background:rgba(11,6,18,.85);border:2px solid #3ee0ff">SIN SPOILERS 🌴</span></div>
</div>
"""

CIERRE = """
<div style="position:absolute;left:30px;right:30px;top:230px;text-align:center">
  <div style="font-family:'Permanent Marker';font-size:76px;line-height:1.05;text-shadow:0 4px 18px rgba(0,0,0,.9)">¿Avioneta<br>o coche?</div>
  <div style="margin-top:22px"><span class="pill" style="background:#ff4fd8">COMENTA 👇</span></div>
</div>
"""


async def _render():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 720, "height": 1280})
        for nombre, cuerpo in (("franja.png", FRANJA), ("gancho.png", GANCHO), ("cierre.png", CIERRE)):
            await pg.set_content(BASE % (FUENTES, cuerpo), wait_until="networkidle")
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(200)
            await pg.screenshot(path=str(Path.cwd() / nombre), omit_background=True)
        await b.close()

asyncio.run(_render())
