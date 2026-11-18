---
description: Tablero del sistema de contenido de @gta6espa (piezas, calendario, pendientes)
---
Da el estado del proyecto @gta6espa en modo informe:
1. `python -m gta6espa tablero`.
2. getScheduledPosts de los próximos 7 días (marca «GTA6ESPA», Europe/Madrid), guardado en `trabajo/programado.json`, y `python -m gta6espa revisar-calendario --dias 7`.
3. Sección «Pendiente» del LÉEME (agente **coordinador** si no hay copia de hoy en `trabajo/leeme.md`).
Devuelve: piezas por estado, días vacíos, choques, errores de Metricool y pendientes de Pablo y de ChatGPT. Sin propuestas salvo que se pidan.
