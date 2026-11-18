#!/usr/bin/env bash
# Prepara una sesión de trabajo del sistema de contenido de @gta6espa.
# Uso: scripts/preparar_sesion.sh            (instala dependencias y prepara capturas si hay pack)
#      scripts/preparar_sesion.sh --descargar (además descarga el pack oficial de Rockstar)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "· Dependencias de Python"
python3 -c "import yaml, PIL, playwright" 2>/dev/null || \
  pip install -q -r requirements.txt --break-system-packages

echo "· Navegador para la plantilla"
if [ ! -x /usr/bin/google-chrome ]; then
  echo "  AVISO: la plantilla espera Chrome en /usr/bin/google-chrome."
fi
command -v ffmpeg >/dev/null || echo "  AVISO: falta ffmpeg (solo se necesita para Reels)."

mkdir -p trabajo
PACK=trabajo/GTAVI_Screenshots.zip
URL=$(python3 -c "from gta6espa.reglas import reglas; print(reglas()['capturas']['pack_oficial'])")

if [ "${1:-}" = "--descargar" ] && [ ! -f "$PACK" ]; then
  echo "· Descargando el pack oficial de capturas"
  if ! curl -fSL --retry 3 -o "$PACK.part" "$URL"; then
    rm -f "$PACK.part"
    echo "  ERROR: no se pudo descargar $URL."
    echo "  Si es un 403 del proxy, hay que permitir media-rockstargames-com.akamaized.net en la red del entorno."
    exit 2
  fi
  mv "$PACK.part" "$PACK"
fi

if [ -f "$PACK" ]; then
  if [ -z "$(ls -A trabajo/capturas 2>/dev/null)" ]; then
    echo "· Preparando capturas (solo Places y People, sin carpetas prohibidas)"
    python3 -m gta6espa capturas --zip "$PACK"
  else
    echo "· Capturas ya preparadas en trabajo/capturas"
  fi
else
  echo "· Sin pack de capturas. Ejecuta con --descargar o copia el ZIP en $PACK."
fi

[ -f trabajo/plantilla_gta6.py ] || echo "· Falta trabajo/plantilla_gta6.py: descárgala de Drive («03 · Plantilla de diseño»)."
[ -f trabajo/leeme.md ] || echo "· Falta trabajo/leeme.md: pide al agente coordinador la copia del LÉEME."
echo "Listo. Estado de las piezas:"
python3 -m gta6espa tablero
