# Lecciones del revisor (gauntlet)

**Criterio del director (21/11) sobre tramos de misión:** cuenta lo que SE VE en el vídeo final. Conducir o pasear durante una misión vale si en pantalla no aparece nada de ella: ni marcadores, chevrons ni rutas rosas, ni objetivos, subtítulos o diálogos, ni rótulos de la historia, ni personajes de la trama, ni acción de misión (persecuciones, tiros o robos con violencia), ni cinemáticas. El recorte puede quitar el HUD. Lo que no vale es un elemento de la misión que se ve dentro del mundo (como el marcador rosa sobre la palmera o el hidroavión de Brian).

**Excepción del formato L «Secretos de Leonida» (Pablo, 24/11):** se puede ver un arma escondida y el momento de recogerla; se devuelve si se dispara, se apunta a alguien o se usa. De una misión secundaria solo vale el sitio donde empieza y quien la da: se devuelve si aparece una cinemática, un diálogo o un objetivo. En el resto de formatos sigue sin valer ningún arma a la vista.

Cada vez que el revisor devuelve una pieza, añade aquí una línea: fecha, pieza, qué falló y cómo se evita.
Los editores, redactores y diseñadores la leen antes de cada pieza.

| Fecha | Pieza | Qué falló | Cómo evitarlo |
|---|---|---|---|
| 19/11 | R20nov v1 | Persecución en lancha con un acompañante que dispara | Nada de persecuciones de misión. Si alguien apunta o dispara, fuera |
| 19/11 | G19nova | Diálogos de misión | Sin subtítulos ni diálogos. El recorte por defecto quita la franja de abajo |
| 19/11 | G19novb v1 | Choques con chispas cuando aún no estaban permitidos | (Ya permitidos desde el 19/11 noche) |
| 19/11 | R20novd v1 | Sangre en rodilla y brazo tras saltar del coche; coche del sheriff con nivel de búsqueda | Ampliar a resolución completa la piel del personaje en cada caída. Nada de coches de policía o sheriff |
| 19/11 | R20novd v1 | Coche de policía con luces detrás del jugador | Si hay estrellas de búsqueda, mirar todo el encuadre por si hay patrullas |
| 19/11 | R20novd v2 | Sangre en el antebrazo en el camión volcado (se pasó en la v1) | Revisar la piel cada 0,1 s con el personaje a pie, aunque el plano ya se aprobara |
| 19/11 | R20novc v1 | Plano de noche casi negro y rótulo «BRIAN'S MARINA» | `gamma` 1,5–2,0 de noche y fuera los rótulos de la historia |
| 19/11 | R20novc v2 | Cartel luminoso «Wonder Whale» legible en el gancho | Mirar los letreros legibles en los primeros 0,5 s |
| 19/11 | R21nova v1 | Tres planos nocturnos que no se distinguían | Luminancia media > 60/255 o `gamma` |
| 19/11 | R22nova v1–v2 | Peatón atropellado al subir a la acera (visible con gamma) | Con gamma alta, revisar la acera cada 0,1 s en cada choque |
| 19/11 | R22novb v1 | Hidroavión de la misión de Brian: marcador rosa de destino y rótulo «Brian's» | Nada de tramos de misión aunque parezcan libres: marcadores rosas = misión |
| 19/11 | R20novd v1 | Textos que hablaban de tramos ya quitados | Al cambiar un tramo, revisar los 5 textos y los títulos |
| 20/11 | R22novd, R22novf, R23novb | Matrícula personalizada con texto grosero («ASS MAN») legible en los planos traseros | Pixelar la matrícula o cortar el plano; revisar también la imagen congelada del final |
| 20/11 | R24novc (descartado por el editor) | Persecución de misión: brazo con arma por la ventanilla, impactos de bala y chevron rosa sobre el objetivo | Un chevron o marcador rosa sobre un vehículo = misión. Fuera el tramo entero |
| 20/11 | R22nove v1 | Coche de policía con luces en 2,9-4,1 s (#2, con estrella de búsqueda); además, lo que sale volando en el #4 es el capó y el texto decía «señal» | Con estrellas en el HUD, mirar el fondo cada 0,1 s. Comprobar a cámara lenta qué objeto sale volando antes de nombrarlo en pegatinas y textos |
| 20/11 | R23nova v1 | Marcador rosa de misión («B» con candado) en 3,80-3,87 s, sobre una palmera (#2, jacuzzi) | Los marcadores rosas del mundo duran 2-3 fotogramas en los giros de cámara: revisar cada tramo a 30 fps, no solo cada 0,1 s |
| 20/11 | R22novd v1 | Matrícula «ASS MAN» legible en los 3 primeros fotogramas (0,00-0,07 s): el pixelado con seguimiento empieza tarde | El pixelado debe cubrir desde el primer fotograma del tramo, también en la repetición y en los congelados. Revisar los fotogramas 0-5 de cada tramo uno a uno |
| 20/11 | R23nove v1 | Camión publicitario «BLACK HOLES - Swallow them up whole!» (doble sentido sexual) legible en 6,50-7,70 s (#3) | Leer todos los rótulos y anuncios legibles del fondo, no solo los de la historia; «Black Holes» queda vetado (ya se recortó en R22nove) |
| 23/11 | R24novd v1 | Cartel verde de localidad («Abismo Key») legible en 11,30-11,60 s al final del #4: la nota decía que se cortaba antes del cartel, pero el corte llegaba 0,4 s tarde | Medir en el vídeo final el primer fotograma en que asoma un cartel y cortar 0,2 s antes; no fiarse del minuto del original |
| 23/11 | R24novc v1 | Pegatina «EL RETROVISOR: ADIÓS» con el retrovisor intacto todo el plano (y el texto dice «sin un rasguño») | Igual que el capó de R22nove: antes de nombrar una pieza que «se va», ampliarla al final del tramo y comprobar que ya no está |
| 24/11 | R24nove v1 | Distancia del GPS «1.92 millas» legible en el borde superior de 15,05 a 21,9 s (#6, el único plano con cámara normal), con y0 = 0,08; además contradice el subtítulo «Sin GPS» | Con la cámara normal la distancia del GPS baja hasta y ≈ 0,09: usar y0 ≥ 0,10 (o 0,11, como en los demás reels). Mirar el borde de arriba de cada tramo a tamaño real, sobre todo cuando un formato mezcla planos aéreos sin HUD con planos normales |
| 24/11 | S24a-c (descartado por el editor) | Grabación g3_20_1819 entera: arma larga colgada a la espalda en todo el tramo de moto, rueda de armas abierta y robo de coches con «Crimen denunciado» en el tramo de coche | Un arma visible, también colgada a la espalda o enfundada a la vista, cuenta como arma: fuera el tramo, no se difumina. Antes de montar, comprobar a tamaño real la espalda del personaje en cada tramo |
