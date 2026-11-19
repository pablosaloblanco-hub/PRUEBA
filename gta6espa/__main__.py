"""Línea de comandos del sistema: python -m gta6espa <orden> ...

Órdenes:
  nueva       crea una pieza (idea)               lista      piezas y su estado
  ver         muestra la ficha de una pieza       avanzar    cambia el estado (con comprobaciones)
  validar     revisa textos, medios y capturas    hoja       hoja de contacto de una pieza
  render      ejecuta el diseno.py de una pieza   huecos     horas libres según lo programado
  revisar-calendario  días vacíos y choques       payload    peticiones listas para Metricool
  capturas    prepara el pack oficial             reel       monta un Reel con ffmpeg
  tablero     resumen de todo el contenido
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

import yaml

from . import calendario, capturas, metricool, piezas, validar
from .hoja_contacto import hoja
from .reglas import RAIZ, TRABAJO


def _salir(msg: str, codigo: int = 1):
    print(msg, file=sys.stderr)
    sys.exit(codigo)


def cmd_nueva(a):
    numero = a.numero or piezas.siguiente_id()
    pid = f"{numero}-{piezas.slug(a.titulo)}"
    p = piezas.nueva(pid, a.titulo, a.formato, a.redes.split(",") if a.redes else None,
                     a.fecha, a.quien, a.hashtag or "")
    print(f"Creada {p['id']} → {piezas.ruta_ficha(p['id']).relative_to(RAIZ)}")


def cmd_lista(a):
    filas = piezas.listar(a.estado)
    if not filas:
        print("No hay piezas.")
        return
    print(f"{'ID':<34} {'FORMATO':<9} {'ESTADO':<11} {'FECHA':<17} REDES")
    for p in filas:
        print(f"{p['id']:<34} {p['formato']:<9} {p['estado']:<11} {str(p.get('fecha') or '-'):<17} {','.join(p['redes'])}")


def cmd_ver(a):
    print(yaml.safe_dump(piezas.cargar(a.id), allow_unicode=True, sort_keys=False, width=110))


def cmd_avanzar(a):
    p = piezas.avanzar(a.id, a.estado, a.quien, a.nota or "", a.forzar)
    print(f"{p['id']} → {p['estado']}")


def cmd_validar(a):
    p = piezas.cargar(a.id)
    hallazgos = validar.validar_pieza(p)
    errores = [h for h in hallazgos if h.nivel == "ERROR"]
    for h in hallazgos:
        print(h)
    print(f"\n{len(errores)} errores, {len(hallazgos) - len(errores)} avisos.")
    if errores:
        sys.exit(1)


def cmd_hoja(a):
    p = piezas.cargar(a.id)
    base = piezas.carpeta_trabajo(a.id)
    imagenes = [base / m for m in p.get("medios", []) if m.lower().endswith((".jpg", ".jpeg"))]
    salida = hoja(imagenes, base / "hoja_contacto.jpg")
    print(salida)


def cmd_render(a):
    script = piezas.carpeta(a.id) / "diseno.py"
    if not script.exists():
        _salir(f"No existe {script.relative_to(RAIZ)}")
    plantilla = TRABAJO / "plantilla_gta6.py"
    if not plantilla.exists():
        _salir("Falta trabajo/plantilla_gta6.py: descárgala de Drive («03 · Plantilla de diseño»).")
    entorno = dict(os.environ)
    entorno.setdefault("GTA6_ASSETS", str(TRABAJO / "capturas") + "/")
    entorno["PYTHONPATH"] = str(TRABAJO) + os.pathsep + entorno.get("PYTHONPATH", "")
    salida = piezas.carpeta_trabajo(a.id)
    salida.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, str(script)], cwd=salida, env=entorno, check=True)
    print("\n".join(sorted(str(x) for x in salida.glob("*.jpg"))))


def _programado(ruta: str | None) -> list[calendario.Programada]:
    ruta = Path(ruta or TRABAJO / "programado.json")
    if not ruta.exists():
        _salir(f"No existe {ruta}. Guarda ahí la respuesta de getScheduledPosts.")
    return calendario.leer_programado(ruta)


def cmd_huecos(a):
    prog = _programado(a.programado)
    desde = dt.date.fromisoformat(a.desde) if a.desde else dt.date.today()
    redes = a.redes.split(",") if a.redes else (["instagram"] if a.formato == "historia" else ["instagram", "tiktok"])
    for h in calendario.huecos(prog, desde, a.dias, a.formato, redes):
        print(h.strftime("%Y-%m-%d %H:%M"))


def cmd_revisar_calendario(a):
    prog = _programado(a.programado)
    desde = dt.date.fromisoformat(a.desde) if a.desde else dt.date.today()
    vacios = calendario.dias_vacios(prog, desde, a.dias)
    print("Días sin publicación de feed:", ", ".join(d.isoformat() for d in vacios) or "ninguno")
    malos = calendario.choques(prog)
    print("Choques de hora:" if malos else "Choques de hora: ninguno")
    for x, y in malos:
        print(f"  {x.red} {x.fecha:%d/%m %H:%M} ({x.id}) y {y.fecha:%d/%m %H:%M} ({y.id})")
    exc = calendario.excesos(prog)
    print("Días por encima del máximo diario:" if exc else "Días por encima del máximo diario: ninguno")
    for dia, red, grupo, n in exc:
        print(f"  {dia:%d/%m} {red} {grupo}: {n}")
    por_red = {}
    for p in prog:
        por_red.setdefault(p.red, 0)
        por_red[p.red] += 1
    print("Programadas por red:", ", ".join(f"{k}: {v}" for k, v in sorted(por_red.items())))


def cmd_payload(a):
    p = piezas.cargar(a.id)
    print(json.dumps(metricool.peticiones(p), ensure_ascii=False, indent=2))


def cmd_capturas(a):
    if a.zip:
        print(json.dumps(capturas.preparar(Path(a.zip)), ensure_ascii=False, indent=2))
    else:
        print("\n".join(capturas.listar()))


def cmd_reel(a):
    from . import video
    datos = json.loads(Path(a.clips).read_text(encoding="utf-8"))
    clips = datos["clips"] if isinstance(datos, dict) else datos
    sup = datos.get("superposiciones") if isinstance(datos, dict) else None
    salida = video.montar(clips, Path(a.salida), Path(a.musica) if a.musica else None, a.max, sup)
    print(salida)
    for h in validar.validar_video(salida):
        print(h)


def cmd_detectar(a):
    from . import detectar
    if a.resumen:
        for h in detectar.resumen(Path(a.video), Path(a.salida)):
            print(h)
        return
    datos = detectar.analizar(Path(a.video), Path(a.salida), a.maximo, a.rangos, a.salto)
    print(f"{len(datos['candidatos'])} candidatos en {datos['duracion_s']} s · hojas: {len(datos['hojas'])}")
    for h in datos["hojas"]:
        print(" ", h)


def cmd_efectos(a):
    from . import efectos
    salida = efectos.montar(Path(a.guion), Path(a.salida))
    print(salida)
    for h in validar.validar_video(salida):
        print(h)


def cmd_tablero(a):
    todas = piezas.listar()
    cuenta = {}
    for p in todas:
        cuenta[p["estado"]] = cuenta.get(p["estado"], 0) + 1
    print("Piezas por estado:", ", ".join(f"{e}: {cuenta[e]}" for e in piezas.ORDEN + piezas.ESPECIALES if e in cuenta) or "ninguna")
    pendientes = [p for p in todas if p["estado"] not in ("publicada", "descartada")]
    for p in pendientes:
        print(f"  · {p['id']} [{p['estado']}] {p.get('fecha') or 'sin fecha'}")


def main(argv=None):
    ap = argparse.ArgumentParser(prog="gta6espa", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="orden", required=True)

    s = sub.add_parser("detectar", help="buscar choques y caídas en una grabación larga"); s.set_defaults(f=cmd_detectar)
    s.add_argument("video"); s.add_argument("salida"); s.add_argument("--maximo", type=int, default=80)
    s.add_argument("--resumen", action="store_true", help="solo hojas con un fotograma cada 5 s")
    s.add_argument("--rangos", help="«1:20-6:40,12:00-15:30»: buscar solo en esos tramos (conducción libre)")
    s.add_argument("--salto", type=float, default=11, help="dB de salto mínimo")
    s = sub.add_parser("efectos", help="montar un Reel dinámico con zooms, pegatinas y sonidos"); s.set_defaults(f=cmd_efectos)
    s.add_argument("guion", help="guion.json del montaje"); s.add_argument("salida")

    s = sub.add_parser("nueva"); s.set_defaults(f=cmd_nueva)
    s.add_argument("titulo"); s.add_argument("--formato", required=True, choices=piezas.FORMATOS)
    s.add_argument("--fecha", help="«AAAA-MM-DD HH:MM» hora de Madrid"); s.add_argument("--redes")
    s.add_argument("--hashtag"); s.add_argument("--numero"); s.add_argument("--quien", default="Claude")

    s = sub.add_parser("lista"); s.set_defaults(f=cmd_lista); s.add_argument("--estado")
    s = sub.add_parser("ver"); s.set_defaults(f=cmd_ver); s.add_argument("id")
    s = sub.add_parser("avanzar"); s.set_defaults(f=cmd_avanzar)
    s.add_argument("id"); s.add_argument("estado"); s.add_argument("--quien", default="Claude")
    s.add_argument("--nota"); s.add_argument("--forzar", action="store_true")
    s = sub.add_parser("validar"); s.set_defaults(f=cmd_validar); s.add_argument("id")
    s = sub.add_parser("hoja"); s.set_defaults(f=cmd_hoja); s.add_argument("id")
    s = sub.add_parser("render"); s.set_defaults(f=cmd_render); s.add_argument("id")
    for nombre, fn in (("huecos", cmd_huecos), ("revisar-calendario", cmd_revisar_calendario)):
        s = sub.add_parser(nombre); s.set_defaults(f=fn)
        s.add_argument("--programado"); s.add_argument("--desde"); s.add_argument("--dias", type=int, default=7)
        if nombre == "huecos":
            s.add_argument("--formato", required=True, choices=piezas.FORMATOS); s.add_argument("--redes")
    s = sub.add_parser("payload"); s.set_defaults(f=cmd_payload); s.add_argument("id")
    s = sub.add_parser("capturas"); s.set_defaults(f=cmd_capturas); s.add_argument("--zip")
    s = sub.add_parser("reel"); s.set_defaults(f=cmd_reel)
    s.add_argument("clips", help="JSON con [{ruta, inicio, fin}]"); s.add_argument("salida")
    s.add_argument("--musica"); s.add_argument("--max", type=float)
    s = sub.add_parser("tablero"); s.set_defaults(f=cmd_tablero)

    a = ap.parse_args(argv)
    try:
        a.f(a)
    except piezas.ErrorPieza as e:
        _salir(f"Error: {e}")


if __name__ == "__main__":
    main()
