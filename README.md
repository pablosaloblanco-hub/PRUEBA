# Sistema de agentes · GTA 6 Español (@gta6espa)

Equipo de agentes de Claude Code para gestionar, crear y subir el contenido de Instagram y TikTok de la cuenta fan **GTA 6 Español**. Se coordina con ChatGPT (YouTube) y con Pablo a través del LÉEME de Google Drive.

> Cuenta fan no oficial. Sin relación con Rockstar Games ni Take-Two Interactive. Este repositorio no contiene imágenes ni vídeos de Rockstar.

## Cómo se usa
Abre Claude Code en este repositorio y escribe uno de estos comandos:

| Comando | Qué hace |
|---|---|
| `/pieza <tema> [formato] [fecha]` | Una publicación de punta a punta: plan, textos, diseño, revisión, Drive y Metricool |
| `/semana [AAAA-MM-DD]` | Plan y producción de la semana completa |
| `/reel <tema>` | Reel con los clips de PS5 de Pablo o vídeos oficiales sin audio |
| `/revisar <id>` | Control de calidad de una pieza |
| `/publicar <id>` | Subir y programar una pieza revisada |
| `/comprobar` | Ver si lo programado ha salido |
| `/informe` | Informe semanal de métricas e ideas |
| `/estado` | Tablero de piezas, calendario y pendientes |
| `/dato <dato>` | Verificar un dato y añadirlo al LÉEME |

## Cómo está montado
```
CLAUDE.md                 instrucciones del director (la sesión principal)
.claude/agents/           10 agentes: estratega, investigador, redactor, disenador,
                          editor-video, revisor, publicador, analista, coordinador, comunidad
.claude/commands/         los comandos de arriba
config/reglas.yaml        reglas de la cuenta (hashtags, formatos, horarios, prohibiciones)
config/capturas_bloqueadas.txt  capturas que no se pueden volver a usar
gta6espa/                 herramientas en Python (CLI: python -m gta6espa)
contenido/<id>/           ficha de cada pieza (pieza.yaml) y su diseno.py
contenido/_ejemplo/       pieza de ejemplo con diseño de referencia
scripts/preparar_sesion.sh  dependencias, pack de capturas y comprobaciones
tests/                    pruebas (python3 -m pytest -q)
trabajo/                  todo lo pesado o privado; no se sube nunca
```

Cada pieza pasa por estos estados, y la herramienta no deja saltarse ninguno:

```
idea → aprobada → redactada → disenada → revisada → subida → programada → publicada
```

## Requisitos
- Conectores de Google Drive y Metricool en la sesión.
- Python 3.11+, `pip install -r requirements.txt`, Chrome en `/usr/bin/google-chrome` y ffmpeg para los Reels.
- Para descargar las capturas oficiales, la red del entorno debe permitir `media-rockstargames-com.akamaized.net`.

## Tareas programadas relacionadas
Viven en la cuenta de Claude, no en este repositorio:
- **Informe semanal GTA 6 Español**: lunes a las 8:59.
- **Limpieza semanal Drive GTA 6**: domingos a las 21:31.
- **Comprobación diaria GTA 6 Español**: cada día, comprueba que lo programado ha salido y avisa de errores.
