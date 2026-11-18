---
description: Crea una publicación de @gta6espa de punta a punta (idea → programada) con todo el equipo de agentes
argument-hint: <tema> [formato] [fecha AAAA-MM-DD HH:MM]
---
Produce una pieza completa para Instagram y TikTok de @gta6espa sobre: $ARGUMENTS

Sigue el flujo de CLAUDE.md sin saltarte pasos:
1. Arranque de sesión si no está hecho (`scripts/preparar_sesion.sh`, plantilla y `trabajo/leeme.md` con el agente coordinador).
2. Agente **estratega**: comprueba huecos y crea la ficha en «idea» con fecha, formato y objetivo. Si el usuario dio formato o fecha, respétalos salvo choque de hora.
3. Si el tema necesita un dato nuevo, agente **investigador** y después **coordinador** para añadirlo al LÉEME.
4. Aprueba la pieza (`avanzar <id> aprobada`) si encaja con el plan y las reglas; si hay dudas de fondo, pregunta a Pablo.
5. Agente **redactor** → «redactada».
6. Agente **disenador** (o **editor-video** si es un Reel) → «disenada».
7. Agente **revisor** → «revisada». Si la devuelve, corrige con el agente que toque y vuelve a revisar.
8. Agente **publicador** → «programada».
9. Agente **coordinador** → registro en el LÉEME.
10. Resume a Pablo: qué sale, cuándo, enlace de Metricool y qué le toca a él. Envíale la hoja de contacto con SendUserFile.
