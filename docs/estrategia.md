# Estrategia de @gta6espa (20/11)

Sale de analizar dos guías que Pablo pasó el 19/11:
- el hilo de X de @everestchris6, «playbook para ganar dinero con GTA 6 con agentes»;
- el carrusel de @sergioprompts, «Contrata a Claude como gestor de tu página».

Aquí está solo lo que encaja con nuestras reglas.

## 1. El ángulo: nos adueñamos de uno, no de todo
«Las páginas que crecen rápido se adueñan de un ángulo.» El nuestro: **fails, físicas absurdas y vida diaria loca de GTA 6, en español de España y con gameplay propio**. Lo complementan noticias verificadas y lugares de Leonida (carruseles).
- Bio propuesta (la pone Pablo): «GTA 6 en español 🌴 Fails, físicas y lo más absurdo de Leonida · Gameplay propio en PS5 · Cuenta fan, no oficial».
- Cada Reel tiene que encajar en el ángulo. Si no encaja, va a carrusel o historia.

## 2. El primer fotograma es el remate
- No hay intro: el vídeo abre con el mejor golpe (`docs/guion-efectos.md`).
- Los 2 primeros segundos frenan el scroll. Hay que escribir 3 opciones de gancho y quedarse con la más corta.
- Las frases van cortas, como un amigo que te escribe sobre el juego.
- Duración: 15–30 s, la de los vídeos que mejor nos funcionen (ver § 6).

## 3. Portadas que se leen en la cuadrícula
Cada Reel lleva portada con 2–4 palabras enormes («¡NO LO VI!», «FÍSICAS 0/10», «ESTO NO VA BIEN»). Se hace así:
```
python -m gta6espa portada <id> --texto "FÍSICAS 0/10" --t 1.2
```
El publicador la sube a Drive y la manda como `videoThumbnailUrl` a Instagram y YouTube. TikTok se queda con el fotograma de 1,5 s.

## 4. Textos (fórmula)
Primera línea que haga comentar · 2 líneas cortas de contexto · pregunta · crédito · hashtags fijos.

## 5. Horarios: España y Latinoamérica
- La mayoría de fans de GTA en español están en España y en Latinoamérica, que va 5–7 h por detrás.
- Los huecos de las 20:30 y las 22:30 (hora de Madrid) caen en la tarde de México, Colombia y Argentina.
- Cada lunes el analista consulta `getBestTimeToPostByNetwork` y propone mover horas si los datos lo piden.

## 6. Aprender de lo que funciona (outliers)
- Cada lunes el analista marca los **outliers**: las piezas con más del doble de la mediana de visualizaciones de su red en las últimas 2 semanas.
- Lo apunta en `docs/aprendizajes.md`: qué gancho, qué duración, qué portada, qué tema y a qué hora. El estratega y los editores lo leen antes de planificar o montar.
- Lo que no funciona también se apunta: «dejar de hacer».

## 7. Tendencias del día → las recreamos en nuestra partida
- Cada mañana (`/tendencias`) el investigador busca los 5 momentos de GTA 6 más compartidos en las últimas 24 h: canales oficiales de Rockstar y publicaciones públicas.
- Para cada uno: qué pasa, por qué se comparte, enlace y creador.
- Descarta filtraciones, piratería, trucos para «jugar antes» y todo lo que no se pueda confirmar.
- La salida principal es **cómo puede recrearlo Pablo en su partida**, porque eso es contenido propio sin riesgo. La secundaria, un clip en modo cita (`docs/clips-creadores.md`).

## 8. Control de calidad («gauntlet»)
- Nada se publica sin el visto bueno de un revisor que no ha hecho la pieza. Ya lo hacemos.
- **Cada veredicto que devuelve una pieza se apunta en `docs/lecciones-revisor.md`**, y editores y revisor lo leen antes de cada pieza, para no repetir el mismo fallo.

## 9. Crecer con comentarios
- La primera hora decide el alcance, así que Pablo responde en esa hora. El kit diario lo prepara `comunidad`.
- Las preguntas que se repiten en los comentarios se convierten en ideas de pieza: Pablo pega los comentarios y `comunidad` las saca.
- Comentarios con valor en cuentas grandes de GTA: los redacta `comunidad` y los publica Pablo. Nunca spam.

## 10. Monetización (cuando haya audiencia)
Ver `docs/monetizacion.md`.
