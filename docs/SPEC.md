# Mis Finanzas — Especificación definitiva (v1)

> App web personal para controlar gastos y finanzas (ingresos, gastos, balance, presupuestos y tendencias). Un solo usuario, un solo monedero, una sola moneda de visualización. Todo local (localStorage), sin backend, sin red.
>
> Stack fijo (ya scaffoldeado en este repo): Vite 8 + React 19 + TypeScript 6 (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`), CSS plano con custom properties (`src/styles/tokens.css` ya existe), Recharts 3, Vitest + Testing Library (jsdom), Playwright (proyectos `chromium` y `mobile` = Pixel 7, locale `es-ES`, zona `Europe/Madrid`). Sin Tailwind, sin librerías de componentes, sin router, sin librería de estado, sin librerías de fechas/validación/ids.
>
> Este documento fusiona tres propuestas (producto, MVP, integridad de datos). Cuando había conflicto se ha elegido **el conjunto mínimo que da control real**, construible en ~2 días por una persona. Lo marcado como **P1** es opcional y no bloquea el "hecho".

---

## 1. Objetivo y principios

- **Registrar un gasto en 3 toques** («+» → importe → Guardar). Todo lo demás viene prerrellenado con valores inteligentes (tipo Gasto, fecha hoy, última categoría usada). Si registrar es lento, la gente deja de registrar y todo lo demás deja de servir.
- **El mes es la unidad mental.** Un selector de mes compartido gobierna Inicio, Movimientos, Presupuestos e Informes. Las preguntas que responde la app: «¿cómo voy este mes?», «¿en qué se me va el dinero?», «¿cuánto me queda del presupuesto?», «¿gasto más de lo que ingreso?».
- **El dinero nunca se corrompe.** Importes en céntimos enteros (jamás floats), fechas locales `'YYYY-MM-DD'` (jamás `toISOString`), parser de importes como gramática de texto, agregaciones puras y deterministas, ids inyectables. `src/domain/**` no importa React ni DOM y concentra los tests.
- **Los datos no se pierden.** Envelope versionado con migraciones, copia previa antes de cada guardado (salvo al recuperar un payload corrupto, precisamente para no pisar esa copia), nunca se sobrescribe lo que no se pudo leer, y exportar/importar JSON en un toque.
- **Todo lo que se entrega está pulido**: 360 px sin scroll horizontal, tema claro/oscuro, estados vacíos, mensajes de error en español, teclado y lectores de pantalla. Lo que no cabe pulido en 2 días es P1 o queda fuera.

---

## 2. Funcionalidades

### 2.1 P0 — obligatorias (con criterios de aceptación)

#### F1. Alta rápida de movimiento (hoja «Nuevo movimiento»)
- Un botón «+» visible en todas las pantallas: FAB central en la barra inferior (móvil), botón «+ Nuevo movimiento» arriba de la barra lateral (escritorio). (El atajo de teclado `n` es P1-11.)
- Al abrir, el foco está en **Importe** (`type="text" inputmode="decimal" autocomplete="off"`). Valores por defecto: tipo = `expense`, fecha = hoy (local), categoría = `settings.lastUsedCategoryId[type]` si existe y no está eliminada, si no la primera categoría del tipo por `sortOrder`; nota = `''`.
- Importe: acepta `12`, `12,5`, `12.50`, `1.234,56`, `1,234.56` (ver §4.1) y guarda céntimos enteros. Bajo el campo se muestra en vivo la interpretación («= 1.234,56 €») o el error. `''`, `0`, negativo, >2 decimales o texto no numérico → error en línea y botón **Guardar** deshabilitado.
- Segmento «Gasto | Ingreso» cambia la rejilla de categorías al tipo elegido y preselecciona la última usada de ese tipo.
- Fecha: chips «Hoy» / «Ayer» + `<input type="date">` etiquetado «Fecha». Se permiten fechas futuras.
- Nota opcional, `maxLength=140`, recortada (`trim`).
- `Enter` en Importe o Nota envía el formulario. `Escape`, «×» o clic en el fondo cierran sin guardar.
- Al guardar: se persiste síncronamente (§5), la hoja se cierra, aparece el toast «Gasto guardado» / «Ingreso guardado», y `settings.lastUsedCategoryId[type]` se actualiza.
- **Criterio e2e**: desde la app recién abierta, `+` → escribir `12,50` → Guardar (3 interacciones) → la fila «−12,50 €» aparece en Movimientos y el hero de Inicio muestra «Gastos 12,50 €»; tras `page.reload()` sigue ahí.

#### F2. Editar y eliminar movimiento
- Tocar una fila abre la misma hoja en modo «Editar movimiento», con el importe prerrellenado sin agrupación («1234,56», re-parsea exactamente), botones «Guardar cambios» y «Eliminar».
- «Eliminar» muestra confirmación en la propia hoja (dos pasos): «¿Eliminar este movimiento?» → «Sí, eliminar» / «Cancelar». No se usa `window.confirm`.
- Cambiar el tipo en edición resetea la categoría a la última usada del nuevo tipo; el reducer rechaza un `categoryId` de otro tipo.
- **Criterio**: editar el importe de 12,50 a 20 actualiza la fila y los totales; eliminar quita la fila, los totales bajan, la hoja se cierra; recarga persiste ambos cambios.

#### F3. Movimientos: lista mensual agrupada por día, búsqueda y filtros
- Cabecera con selector de mes («‹ septiembre 2026 ›» + píldora «Hoy» visible solo cuando el mes seleccionado ≠ mes actual). El mes seleccionado es estado global de UI compartido con Inicio, Presupuestos e Informes.
- Tira de totales del conjunto visible: «Ingresos 1.200,00 € · Gastos 843,20 € · Balance +356,80 €».
- Lista agrupada por día (cabecera «Hoy», «Ayer» o «jueves, 18 sep» + neto del día), orden: fecha desc, `createdAt` desc, `id` asc. Fila: círculo con emoji sobre el color de la categoría, nombre de categoría, nota (muted, truncada), importe a la derecha coloreado (`−12,50 €` en `--color-expense`, `+1.200,00 €` en `--color-income`), sin salto de línea nunca.
- Búsqueda «Buscar por nota o categoría»: dentro del mes seleccionado, sin acentos ni mayúsculas (`cafe` encuentra «Café»), debounce 150 ms. El campo es `<input type="search">` con botón «×» (`aria-label` «Limpiar búsqueda») visible cuando hay texto; el valor crudo vive en estado local del componente y se despacha `filter/set {query}` con debounce de 150 ms; «Limpiar búsqueda» despacha inmediatamente. Chips «Todos | Gastos | Ingresos». Chip de categoría activo (desde el drilldown de Inicio/Informes) con «×» para quitarlo. Enlace «Limpiar filtros» cuando hay alguno activo. Los filtros se reinician al cambiar de pantalla.
- Estados vacíos: «No hay movimientos en septiembre 2026» + botón «Añadir movimiento»; con filtros: «Ningún movimiento coincide con los filtros» + «Limpiar filtros».
- (El botón «Exportar CSV» es P1-16; las firmas de §4.9 se conservan para entonces.)
- **Criterio** (fixture §3.7, `today = 2026-09-25`): la app abre en «septiembre 2026» con «Ingresos 1.200,00 € · Gastos 843,20 € · Balance +356,80 €» y 5 filas (la de 2026-09-28 bajo su propia cabecera de día —`formatDayHeader('2026-09-28', today)`— por encima de la de «Hoy», que no existe porque no hay movimientos el 25); «‹» muestra «agosto 2026» con «Ingresos 1.200,00 € · Gastos 677,50 € · Balance +522,50 €» (4 filas); otro «‹» muestra «julio 2026» con «Ingresos 1.200,00 € · Gastos 750,00 € · Balance +450,00 €» (3 filas); «Hoy» vuelve a septiembre 2026 y la píldora desaparece; en septiembre, buscar `cafe` deja solo la fila `t-10` («Café y compra semanal»).

#### F4. Categorías (con valores por defecto)
- Primer arranque: se siembran 11 categorías de gasto y 4 de ingreso (§3.4), cada una con emoji y color. «Otros gastos» y «Otros ingresos» son `builtIn: true`: no se pueden eliminar ni cambiar de tipo (sí renombrar/recolorear).
- Pantalla «Categorías» (desde Ajustes en móvil; ítem de barra lateral en escritorio): pestañas «Gastos | Ingresos» y lista de filas. La fila de categoría **NO** es un botón: es un `<li>` con badge, nombre, «{n} movimientos» y un botón de icono «Editar» (`aria-label` «Editar {nombre}»). Solo «Editar» abre la hoja «Editar categoría». (Los botones de icono «Subir»/«Bajar» en la misma fila, sin drag, son P1-17.)
- Hoja «Nueva categoría / Editar categoría»: Nombre (1–30 caracteres, único por tipo sin distinguir mayúsculas ni acentos), Icono (rejilla fija de 40 emojis), Color (9 muestras con aria-label), Tipo (deshabilitado en edición). Errores: «El nombre es obligatorio», «Ya existe una categoría con ese nombre».
- Eliminar categoría con N movimientos: diálogo «Sus N movimientos pasarán a "Otros gastos". Se eliminará también su presupuesto.» → «Eliminar» / «Cancelar». El reducer reasigna atómicamente a la `builtIn` del mismo tipo y borra el presupuesto de esa categoría. Con 0 movimientos: confirmación simple «¿Eliminar la categoría Ocio?».
- **Criterio**: crear «Mascotas 🐶», usarla en un movimiento, eliminarla → el movimiento pasa a «Otros gastos», sin filas huérfanas (invariante verificado por `assertInvariants`).

#### F5. Presupuestos mensuales con progreso
- Modelo simple: un presupuesto por categoría de gasto (`limitCents > 0`) que aplica a **todos los meses**, más un presupuesto total opcional (`categoryId: null`). Sin overrides por mes (P1 en §2.2).
- Pantalla «Presupuestos» para el mes seleccionado: tarjeta «Presupuesto total» (si existe) y una tarjeta por presupuesto: emoji+nombre, «Gastado 320,00 € de 400,00 €», barra de progreso coloreada por estado, línea de estado: `< 80 %` «Te quedan 80,00 €» (acento), `80–100 %` «Te quedan 12,00 €» (aviso), `> 100 %` «Has superado el presupuesto en 25,00 €» (crítico). Botones «Editar» / «Eliminar» (confirm «¿Eliminar el presupuesto de Ocio?»).
- (La sección «Sin presupuesto» —categorías de gasto con gasto este mes y sin presupuesto: «Ocio · 95,00 € este mes · Añadir»— es P1-18; la consulta `categoriesWithoutBudget` de §4.5 se conserva documentada.)
- Hoja «Nuevo presupuesto / Editar presupuesto»: Categoría (select: «Total mensual» + categorías de gasto sin presupuesto; deshabilitado en edición), «Límite mensual» (> 0, mensajes de §4.4), ayuda «Se aplica a todos los meses». Error «Ya existe un presupuesto para esta categoría». El select omite «Total mensual» cuando ya existe un presupuesto total; si no queda ninguna opción, el botón «+ Nuevo presupuesto» se deshabilita con ayuda «Todas las categorías tienen presupuesto».
- Estado vacío: «Aún no tienes presupuestos» · «Fija un límite mensual por categoría y verás cuánto te queda» · «Crear presupuesto».
- **Criterio**: presupuesto Ocio 100 € con gastos de 79/80/100/101 € muestra respectivamente estado `ok`/`warning`/`warning`/`over` y los textos anteriores (tests unitarios de `budgetProgress`). Con el fixture §3.7 en septiembre 2026: el presupuesto `b-ocio` (100,00 €) tiene «Gastado 110,00 € de 100,00 €», estado `over` (ratio 1,1) y «Has superado el presupuesto en 10,00 €»; el presupuesto total `b-total` (1.000,00 €) tiene «Gastado 843,20 € de 1.000,00 €», estado `warning` (ratio 0,8432 ≥ 0,8) y «Te quedan 156,80 €». E2e: crear presupuesto Alimentación 200 € → tarjeta visible con «Gastado 83,20 € de 200,00 €» y «Te quedan 116,80 €».

#### F6. Inicio: resumen del mes y saldo
- Para el mes seleccionado: tarjeta hero «Balance del mes» (grande, +/− coloreado) con dos tiles «Ingresos» y «Gastos». Debajo: «Saldo total 4.320,15 €» (= saldo inicial + todos los ingresos − todos los gastos con fecha ≤ hoy, ayuda «Saldo inicial + ingresos − gastos hasta hoy»; sufijo «(sin contar 2 movimientos futuros)» cuando existan).
- Fila de KPI del mes: «Gasto medio por día» y «Proyección a fin de mes» (§4.6), «—» cuando no aplica; para el mes en curso se etiqueta «día 25 de 30» y, si hay movimientos futuros en el mes, se añade el sufijo «(sin contar {n} futuro(s))» porque la extrapolación solo usa el gasto con `date <= today` (§4.6).
- Sección «Presupuestos»: Inicio muestra el total (si existe) y después las 2–3 tarjetas de categoría con mayor ratio, hasta 3 filas en total, + «Ver todos»; sin presupuestos: «Crea un presupuesto para controlar tus gastos» + «Crear presupuesto».
- Sección «Gastos por categoría»: top 5 barras horizontales (emoji, nombre, importe, % del gasto del mes) + «Ver informe». Tocar una fila → Movimientos filtrado por esa categoría y mes.
- Sección «Últimos movimientos»: 5 filas + «Ver todos».
- Estado vacío de primer uso (sin ningún movimiento en todo el histórico): tarjeta «Empieza registrando tu primer gasto» + «Añadir movimiento» + enlace «Importar copia de seguridad». Mes sin datos pero con histórico: «Todavía no hay movimientos en septiembre 2026».
- **Criterio** (fixture §3.7, `today = 2026-09-25`, mes septiembre 2026): hero «+356,80 €» con tiles «Ingresos 1.200,00 €» y «Gastos 843,20 €»; «Saldo total 1.479,30 €» (= 100,00 + 3 × 1.200,00 − (750,00 + 677,50 + 793,20)) con «(sin contar 1 movimiento futuro)»; KPI «Gasto medio por día 31,73 €» y «Proyección a fin de mes 951,84 € · día 25 de 30 (sin contar 1 futuro)»; sección «Presupuestos» con 2 filas: «Presupuesto total» (`warning`, «Te quedan 156,80 €») y «Ocio» (`over`, «Has superado el presupuesto en 10,00 €»); «Gastos por categoría»: Vivienda 600,00 € (71 %), Ocio 110,00 € (13 %), Alimentación 83,20 € (10 %), Suscripciones 50,00 € (6 %); «Últimos movimientos» con las 5 filas de septiembre.

#### F7. Informes (gráficos)
- Tarjeta «Gastos por categoría» (mes seleccionado): `PieChart` donut, etiqueta central con el total, leyenda HTML debajo (swatch, emoji, nombre, importe, %) con categorías < 3 % agrupadas en «Otras»: hasta 8 porciones nombradas más «Otras» (9 como máximo). Tocar fila de leyenda → Movimientos filtrado (la fila «Otras» no es interactiva). Vacío: «Aún no hay gastos en este mes».
- Tarjeta «Ingresos frente a gastos»: `BarChart` agrupado de **6 meses fijos** terminando en el mes seleccionado (el toggle «6 meses | 12 meses» es P1-19), meses sin datos como barras a cero, tooltip es-ES, y debajo una `<table>` (Mes / Ingresos / Gastos / Balance) accesible que es el objetivo de las aserciones e2e. Vacío (todo a cero): «Aún no hay datos para este periodo».
- (La tarjeta «Resumen del mes» —«Gasto medio por día», «Día con más gasto», «Movimientos: N»— es P1-19; `monthKpis.topDay` se conserva en el dominio.)
- Todos los datos salen de funciones puras (§4.5); los componentes de gráfico solo se smoke-testean.
- **Criterio** (fixture §3.7, `today = 2026-09-25`, mes septiembre 2026): la tabla tiene exactamente 6 filas (columna Mes con `formatMonthLabel`): «abril 2026», «mayo 2026» y «junio 2026» con «0,00 €» en Ingresos, Gastos y Balance; «julio 2026» «1.200,00 € / 750,00 € / +450,00 €»; «agosto 2026» «1.200,00 € / 677,50 € / +522,50 €»; «septiembre 2026» «1.200,00 € / 843,20 € / +356,80 €» (= `monthlyTrend(txs, '2026-09', 6)`). La leyenda del donut tiene 4 filas: Vivienda 600,00 € 71 %, Ocio 110,00 € 13 %, Alimentación 83,20 € 10 %, Suscripciones 50,00 € 6 % (sin «Otras»); total central «843,20 €».

#### F8. Persistencia local con esquema versionado, migraciones y recuperación
- Detalle completo en §5. Resumen de aceptación: recargar tras cualquier cambio muestra el mismo estado; un JSON corrupto en `localStorage` no se sobrescribe y muestra la tarjeta de recuperación; `QuotaExceededError` mantiene el estado en memoria y muestra banner; el guardado ocurre una sola vez por acción (test con spy incluso en `StrictMode`).

#### F9. Copia de seguridad: exportar / importar JSON y borrar todo
- Ajustes → «Copia de seguridad»: «Exportar copia (JSON)» descarga `mis-finanzas-2026-09-25.json` (el envelope completo, pretty-printed).
- «Importar copia» abre un selector de archivo; el archivo pasa por el mismo `parse → validate → migrate` que la carga; se muestra «Se importarán 412 movimientos, 16 categorías y 5 presupuestos» y «¿Reemplazar los datos actuales?» → «Reemplazar» / «Cancelar». Importar **reemplaza**, nunca combina. Errores: «El archivo no es un JSON válido», «El archivo es de una versión más nueva de la app», «El archivo no es una copia válida de Mis Finanzas».
- «Borrar todos los datos»: diálogo «Esta acción no se puede deshacer. Escribe BORRAR para confirmar», botón deshabilitado hasta coincidir; vuelve al estado sembrado.
- **Criterio e2e**: con reloj fijo (§10.3) exportar (evento `download`) → borrar todo → importar el archivo → mismos movimientos y ajustes: deep-equal **estricto** del envelope exportado antes y después (incluido `savedAt`, porque `exportJson(data, now)` recibe el reloj inyectado, §3.2).

#### F10. Ajustes
- «General»: Moneda (select `EUR, USD, GBP, CHF, MXN, ARS, COP, CLP, PEN, BRL`, ayuda «Solo cambia el formato; los importes no se convierten»), Tema (segmento Sistema / Claro / Oscuro → atributo `data-theme` en `<html>`), Saldo inicial (importe, admite negativo y 0, ayuda «Saldo con el que empiezas a contar»).
- «Organización»: enlace «Categorías» (móvil).
- «Copia de seguridad» (F9), «Zona peligrosa» (F9).
- Pie: «Mis Finanzas v1 · Tus datos se guardan solo en este navegador · Uso: 1,2 MB de ~5 MB». `{x}` = `formatBytes(repo.estimateBytes())`, donde `estimateBytes` es la **suma** de `mis-finanzas` y `mis-finanzas:backup` (`length × 2` cada una) contra el límite típico de ~5 MB por origen, porque la copia automática duplica el espacio ocupado.
- **Criterio**: cambiar moneda a USD reformatea «12,50 US$» en Movimientos sin alterar `amountCents`; cambiar tema a Oscuro pone `data-theme="dark"` y el fondo de `body` cambia.

#### F11. Diseño responsive, tema claro/oscuro y accesibilidad
- 360 px: barra inferior (Inicio, Movimientos, [+], Presupuestos, Informes), FAB elevado, cabecera con selector de mes y engranaje → Ajustes, hojas como `<dialog>` inferior (max-height 92svh, `padding-bottom: env(safe-area-inset-bottom)`), rejilla de categorías de 4 columnas, gutter 16 px, sin scroll horizontal (`scrollWidth <= innerWidth`, e2e).
- ≥ 900 px: barra lateral 220 px (Inicio, Movimientos, Presupuestos, Informes, Categorías, Ajustes), contenido `max-width: 1080px`, hojas como diálogo centrado de 480 px, rejilla de 6 columnas.
- Objetivos táctiles ≥ 44 px; toda entrada con `<label>`; `<dialog>` con `showModal()` (trampa de foco + Escape); toasts con `aria-live="polite"`; botones de icono con `aria-label`; tablas bajo cada gráfico; `prefers-reduced-motion` anula transiciones; foco visible con `--focus-ring`.
- **Criterio e2e (proyecto mobile)**: barra inferior y FAB visibles, la hoja se abre; en `mobile.spec.ts` se ejecuta `page.setViewportSize({ width: 360, height: 740 })` antes de la comprobación `document.scrollingElement.scrollWidth <= 360`, y además se comprueba `scrollWidth <= innerWidth` en el viewport por defecto del Pixel 7 (412 px); `emulateMedia({colorScheme:'dark'})` cambia `background-color` de `body`.

### 2.2 P1 — extras opcionales (marcados, no bloquean)

| # | Funcionalidad | Nota de diseño |
|---|---|---|
| P1-1 | **Deshacer eliminación (toast 5 s)** | Sustituye la confirmación de dos pasos por «Movimiento eliminado · Deshacer»; el undo re-dispatch-a `transaction/restore` con el mismo objeto (mismo `id`, `createdAt`). |
| P1-2 | **Duplicar movimiento («Repetir hoy»)** | Acción en la hoja de edición: abre una hoja nueva con importe/categoría/nota copiados y fecha de hoy. Cubre el 80 % del valor de los recurrentes. |
| P1-3 | **Movimientos recurrentes (reglas mensuales)** | `RecurringRule {type, amountCents, categoryId, note, dayOfMonth 1..31, startMonth, endMonth, active, lastGeneratedMonth}`; `materializeRecurring(rules, today)` idempotente, día recortado al último del mes; migración v1→v2 añade `recurringRules: []` y `Transaction.recurringRuleId`. Alternativa más segura: proponer en Inicio «Pendientes de confirmar» en vez de crear automáticamente. |
| P1-4 | **Archivar categorías** | `archived: boolean`; ocultas del selector, visibles en histórico marcadas «(archivada)». Migración v1→v2 añade `archived: false`. |
| P1-5 | **Búsqueda global (todos los meses)** | Con texto no vacío la búsqueda ignora el mes y la cabecera muestra «Resultados en todos los meses (12)». |
| P1-6 | **Importar CSV** | Tokenizador RFC-4180, detección de separador, `DD/MM/YYYY`, duplicados por `Id` y por huella, vista previa con filas rechazadas. |
| P1-7 | **Evolución del saldo** | `LineChart` del saldo a fin de mes de los últimos 12 meses (`balanceSeries`). |
| P1-8 | **Presupuestos con vigencia por mes** | Modelo efectivo-datado (`{categoryId, month, limitCents|null, recurring}`) con `resolveBudget`. Solo si el usuario pide «solo este mes». |
| P1-9 | **Sugerencia de presupuesto** | «Media de los últimos 3 meses: 187,40 €» + «Usar». |
| P1-10 | **Sincronización entre pestañas** | Escuchar `storage` y recargar el snapshot; toast «Datos actualizados desde otra pestaña». |
| P1-11 | **Atajos de teclado** | `n` (abrir alta cuando ningún campo tiene el foco), `←/→` mes, `/` búsqueda, `?` ayuda. (`Esc` ya en P0 vía `<dialog>`.) |
| P1-12 | **PWA instalable** | `manifest.webmanifest` + iconos; sin service worker de caché. |
| P1-13 | **Tema aplicado antes del primer render** | Script inline en `index.html` que lee `mis-finanzas:theme` y fija `data-theme` (evita el flash). |
| P1-14 | **Onboarding de 3 pasos** | Moneda, saldo inicial, primer gasto; flag `settings.onboardingDone`. |
| P1-15 | **«+ Nueva» desde la hoja de movimiento** | Requiere pila de hojas: `UiState.sheet` pasaría a `sheets: Sheet[]` (profundidad máx. 2), `category/new` con `returnTo: 'transaction'`, `sheet/pop { createdCategoryId }`, y `TransactionSheet` conservaría su borrador en estado local mientras está cubierta. En P0 las categorías solo se crean desde la pantalla Categorías. |
| P1-16 | **Exportar CSV** | Botón «Exportar CSV» en Movimientos (conjunto visible); todo §4.9 (`src/domain/csv.ts`, `csv.test.ts`) y la parte CSV de `backup.spec.ts`. Las firmas de §4.9 ya están cerradas. |
| P1-17 | **Reordenar categorías («↑ ↓»)** | Botones de icono «Subir»/«Bajar» en la fila de categoría (sin drag) y acción `category/move` (§3.3, §4.7). |
| P1-18 | **Sección «Sin presupuesto»** | En Presupuestos: categorías de gasto con gasto en el mes y sin presupuesto («Ocio · 95,00 € este mes · Añadir»), con `categoriesWithoutBudget` (§4.5). |
| P1-19 | **Informes: «Resumen del mes» y toggle «12 meses»** | Tarjeta «Gasto medio por día · Día con más gasto · Movimientos: N» (`monthKpis`) y segmento «6 meses | 12 meses» (`monthlyTrend(txs, month, 12)`). En P0 la ventana es de 6 meses fija. |

### 2.3 Excluido explícitamente (v1)

- **Cuentas / carteras y transferencias** (banco, efectivo, tarjeta): duplica invariantes y añade un campo obligatorio al alta. El modelo deja hueco (`accountId` futuro) pero no hay UI.
- **Varias monedas por movimiento y conversión de divisas**: la moneda es solo formato; no hay tipos de cambio ni red.
- **Backend, autenticación, sincronización en la nube, compartir**: por restricción; exportar/importar JSON es la historia de portabilidad.
- **Conexión bancaria / importación de extractos del banco**: parsers frágiles y específicos.
- **Fotos de tickets / adjuntos**: agotarían los ~5 MB de localStorage.
- **Metas de ahorro, deudas, préstamos, inversiones, patrimonio neto**: otro dominio.
- **Movimientos divididos y etiquetas libres**: la nota + búsqueda lo cubren.
- **Presupuestos por periodo distinto del mes natural o con arrastre**: solo mes natural.
- **Notificaciones push / recordatorios**: requieren service worker y permisos.
- **Drag-and-drop, gestos de deslizar, animaciones complejas**: botones explícitos por fiabilidad y testabilidad.
- **i18n más allá de es-ES**: todo el copy vive en `src/ui/copy.ts`; una futura i18n es un cambio mecánico.
- **Undo/redo general, cifrado de localStorage, datos de ejemplo**: fuera.
- **Librerías nuevas** (zod, dayjs, uuid, zustand, react-router, iconos): prohibidas por el stack; el subconjunto necesario se escribe y se testea a mano.

---

## 3. Modelo de datos

### 3.1 `src/domain/types.ts` (copiar tal cual; sin enums, sin parameter properties)

```ts
// ============================================================================
// src/domain/types.ts — tipos y constantes puros. Sin React, sin DOM.
// Convenciones (verificadas por src/domain/validate.ts):
//   - Dinero SIEMPRE en céntimos enteros (Cents). Nunca floats.
//   - Fechas locales 'YYYY-MM-DD' (LocalDate) y meses 'YYYY-MM' (MonthKey),
//     construidas con getFullYear/getMonth/getDate, nunca con toISOString.
//   - erasableSyntaxOnly: objetos `as const` + tipos unión en lugar de enums.
// ============================================================================

/** Céntimos enteros. En campos persistidos > 0 salvo Settings.initialBalanceCents. */
export type Cents = number
/** 'YYYY-MM-DD' local. El orden lexicográfico coincide con el cronológico. */
export type LocalDate = string
/** 'YYYY-MM' */
export type MonthKey = string
/** UUID v4 (crypto.randomUUID) o 'cat-…' para las categorías sembradas. */
export type Id = string
/** Milisegundos epoch. Solo para orden estable y auditoría; nunca fecha de negocio. */
export type Timestamp = number

export const CENTS_PER_UNIT = 100
/** 999.999.999,99 → sumas de 100k filas siguen muy por debajo de 2^53. */
export const MAX_CENTS = 99_999_999_999
export const MAX_NOTE_LENGTH = 140
export const MAX_CATEGORY_NAME_LENGTH = 30
/** Rango navegable del selector de mes; `month/shift` recorta a estos límites. */
export const MIN_MONTH: MonthKey = '2000-01'
export const MAX_MONTH: MonthKey = '2099-12'

export const TransactionType = { expense: 'expense', income: 'income' } as const
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

/** Claves de color de categoría; el UI las resuelve a --series-1..8 / --series-other. */
export const ColorKey = {
  blue: 'blue', orange: 'orange', teal: 'teal', amber: 'amber',
  pink: 'pink', green: 'green', violet: 'violet', red: 'red', gray: 'gray',
} as const
export type ColorKey = (typeof ColorKey)[keyof typeof ColorKey]

export type Transaction = {
  id: Id
  type: TransactionType
  /** Entero 1..MAX_CENTS. El signo lo da `type`, nunca el importe. */
  amountCents: Cents
  date: LocalDate
  /** Debe existir y ser del mismo `type`. */
  categoryId: Id
  /** Recortada, 0..140 caracteres, '' permitido. */
  note: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Category = {
  id: Id
  /** Recortado, 1..30 caracteres, único por `type` sin distinguir mayúsculas/acentos. */
  name: string
  type: TransactionType
  /** Un emoji de la lista fija EMOJI_CHOICES. */
  icon: string
  color: ColorKey
  /** Orden ascendente dentro de su tipo. */
  sortOrder: number
  /** «Otros gastos» / «Otros ingresos»: no se pueden eliminar; destino de reasignación. */
  builtIn: boolean
}

export type Budget = {
  id: Id
  /** null = presupuesto total mensual. Como máximo uno por categoryId (y uno con null). */
  categoryId: Id | null
  /** Entero > 0. Se aplica a todos los meses. */
  limitCents: Cents
}

export const Theme = { system: 'system', light: 'light', dark: 'dark' } as const
export type Theme = (typeof Theme)[keyof typeof Theme]

export const SUPPORTED_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL',
] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export type Settings = {
  /** Solo formato; cambiarla nunca convierte importes. Se guarda como string por si un import trae otro código. */
  currency: string
  /** Fijo en v1; guardado para que una futura i18n tenga hogar. */
  locale: 'es-ES'
  theme: Theme
  /** Entero, puede ser negativo o 0. Se suma al saldo total. */
  initialBalanceCents: Cents
  /** Preselección de la hoja de alta, por tipo. */
  lastUsedCategoryId: Record<TransactionType, Id | null>
  /** 0 < x < 1. Umbral de aviso de presupuesto. Default 0.8. */
  budgetWarnRatio: number
}

/** Estado de dominio completo. Inmutable: el reducer devuelve objetos nuevos. */
export type AppData = {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  settings: Settings
}

export const WELL_KNOWN_IDS = {
  otherExpense: 'cat-otros-gastos',
  otherIncome: 'cat-otros-ingresos',
} as const

/** Resultado genérico sin excepciones. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

### 3.2 Envelope persistido — `src/domain/storage/schema.ts`

```ts
import type { AppData, Timestamp } from '../types'

export const APP_TAG = 'mis-finanzas' as const
export const SCHEMA_VERSION = 1 as const
export const STORAGE_KEY = 'mis-finanzas'
export const BACKUP_STORAGE_KEY = 'mis-finanzas:backup'
export const THEME_MIRROR_KEY = 'mis-finanzas:theme' // P1-13

/** Lo que se escribe en localStorage y lo que se exporta como JSON. `data` es unknown hasta validar. */
export type PersistedEnvelope = {
  app: typeof APP_TAG
  schemaVersion: number
  /** Epoch ms del guardado/exportación; informativo. */
  savedAt: Timestamp
  data: unknown
}

/** Envelope validado en la versión actual. */
export type PersistedV1 = {
  app: typeof APP_TAG
  schemaVersion: 1
  savedAt: Timestamp
  data: AppData
}

/** Migración pura y total de `from` a `to` (= from + 1). Se registra una sola vez. */
export type Migration = {
  from: number
  to: number
  migrate: (raw: PersistedEnvelope) => PersistedEnvelope
}

export type LoadResult =
  | { kind: 'ok'; data: AppData; migratedFrom: number | null }
  | { kind: 'empty' }                                                    // primer uso → sembrar
  | { kind: 'corrupt'; raw: string; error: string; hasBackup: boolean }  // JSON roto / validación fallida
  | { kind: 'newer'; raw: string; foundVersion: number }                 // export de una versión futura
  | { kind: 'unavailable'; error: string }                               // localStorage lanza

export type SaveResult =
  | { kind: 'ok' }
  | { kind: 'quota'; bytesAttempted: number }
  | { kind: 'unavailable'; error: string }

export type ImportPreview = {
  transactions: number
  categories: number
  budgets: number
  schemaVersion: number
  /** Avisos de normalización de validateAppData (§4.4), en español, para mostrar bajo la vista previa. */
  warnings: string[]
}

export type ImportError = 'invalid-json' | 'not-an-envelope' | 'newer-version' | 'invalid-data' | 'too-large'
export type ImportResult =
  | { kind: 'ok'; data: AppData; preview: ImportPreview }
  | { kind: 'invalid'; error: ImportError; detail: string }

export type StorageRepository = {
  /** Solo lee; nunca escribe (§5.2). */
  load(): LoadResult
  /** Sonda de escritura (§5.2 paso 1): setItem + removeItem de 'mis-finanzas:probe'. El store la llama tras load(). */
  probeWrite(): SaveResult
  /** `now` alimenta `savedAt` (inyectado por el store: `deps.now()`). `skipBackup` omite la copia previa (§5.3); solo desde la recuperación. */
  save(data: AppData, now: Timestamp, opts?: { skipBackup?: boolean }): SaveResult
  /** Carga desde BACKUP_STORAGE_KEY con la misma validación. Nunca escribe. */
  restoreBackup(): LoadResult
  /** Cadena cruda de STORAGE_KEY (para «Descargar datos en bruto»). */
  readRaw(): string | null
  /** Envelope PersistedV1 serializado con 2 espacios; `savedAt = now` (determinista en tests). */
  exportJson(data: AppData, now: Timestamp): string
  /** Valida + migra; NO persiste (el UI confirma y luego despacha data/replace). */
  parseImport(json: string): ImportResult
  /** Bytes aproximados ocupados: suma de STORAGE_KEY y BACKUP_STORAGE_KEY (length * 2 cada una). */
  estimateBytes(): number
  clear(): void
}
```

### 3.3 Acciones y consultas — `src/domain/actions.ts`, `src/domain/queries.ts`

```ts
// src/domain/actions.ts
import type { AppData, Budget, Cents, ColorKey, Id, LocalDate, Settings, Timestamp, TransactionType } from './types'

export type TransactionInput = {
  type: TransactionType
  amountCents: Cents
  date: LocalDate
  categoryId: Id
  note: string
}

export type Action =
  | { type: 'transaction/add'; id: Id; input: TransactionInput; now: Timestamp }
  | { type: 'transaction/update'; id: Id; patch: Partial<TransactionInput>; now: Timestamp }
  | { type: 'transaction/remove'; id: Id }
  /** El reducer asigna sortOrder (max del tipo + 1) y builtIn = false; el cliente solo aporta id e input. */
  | { type: 'category/add'; id: Id; input: { name: string; type: TransactionType; icon: string; color: ColorKey } }
  | { type: 'category/update'; id: Id; patch: Partial<{ name: string; icon: string; color: ColorKey }> }
  // P1-17 (reordenar): `{ type: 'category/move'; id: Id; direction: 'up' | 'down' }`. La firma queda cerrada aquí
  // pero NO forma parte de la unión en P0 (el switch exhaustivo del reducer no la contempla).
  /** Reasigna sus movimientos a la builtIn del mismo tipo y borra su presupuesto. Rechazado si builtIn. */
  | { type: 'category/remove'; id: Id; now: Timestamp }
  | { type: 'budget/upsert'; budget: Budget }
  | { type: 'budget/remove'; id: Id }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'data/replace'; data: AppData }   // import / restaurar copia (ya validado)
  | { type: 'data/reset'; now: Timestamp }    // «Borrar todos los datos» → estado sembrado

export type ReducerError =
  | 'unknown-transaction' | 'unknown-category' | 'category-type-mismatch' | 'builtin-category'
  | 'duplicate-id' | 'duplicate-category-name' | 'invalid-amount' | 'invalid-date' | 'invalid-note'
  | 'invalid-category-name' | 'invalid-icon' | 'invalid-color'
  | 'duplicate-budget' | 'invalid-budget' | 'budget-on-income-category'
  | 'invalid-settings'

// src/domain/queries.ts — formas de retorno de las funciones puras (§4.5)
export type MonthSummary = {
  month: MonthKey
  incomeCents: Cents
  expenseCents: Cents
  /** incomeCents − expenseCents; puede ser negativo. */
  balanceCents: number
  transactionCount: number
}

export type CategoryTotal = {
  /** null solo en la fila plegada «Otras». */
  categoryId: Id | null
  /** true para la fila plegada «Otras»; sin drilldown. */
  isOthers: boolean
  name: string
  icon: string
  /** Color propio de la categoría: lo usa CategoryBadge (Movimientos, Inicio, Categorías). Informes NO lo usa (§7.5). */
  color: ColorKey
  amountCents: Cents
  count: number
  /** Entero 0..100 por resto mayor; la suma de todas las filas es 100 (o 0 si no hay gasto). */
  percent: number
}

export const BudgetStatus = { ok: 'ok', warning: 'warning', over: 'over' } as const
export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus]

export type BudgetProgress = {
  budget: Budget
  month: MonthKey
  /** null cuando budget.categoryId es null (total). */
  category: Category | null
  spentCents: Cents
  limitCents: Cents
  /** limitCents − spentCents; negativo cuando se supera. */
  remainingCents: number
  /** spentCents / limitCents, sin recortar (la barra recorta a 1). Único float del dominio junto a percent. */
  ratio: number
  status: BudgetStatus
}

export type MonthKpis = {
  month: MonthKey
  daysInMonth: number
  /** 0 si el mes es futuro; día de hoy si es el actual; daysInMonth si es pasado. */
  daysElapsed: number
  /** Gasto del mes con date > today (0 en meses pasados). Se excluye de la media y la proyección. */
  futureExpenseCents: Cents
  /** Math.round(expensePastCents / daysElapsed); null si daysElapsed === 0. (expensePastCents = gasto con date <= today.) */
  avgDailyExpenseCents: Cents | null
  /** pasado: expenseCents; actual: Math.round(expensePastCents * daysInMonth / daysElapsed); futuro: null. */
  projectedExpenseCents: Cents | null
  /** Fecha con mayor gasto del mes; en caso de empate, la fecha más antigua; null si no hay gastos. */
  topDay: { date: LocalDate; expenseCents: Cents } | null
}

export type TotalBalance = {
  balanceCents: number
  /** Movimientos con date > today, excluidos del saldo. */
  futureCount: number
}

export type DayGroup = { date: LocalDate; netCents: number; transactions: Transaction[] }

export type TransactionFilter = {
  month: MonthKey
  query: string
  type: TransactionType | 'all'
  categoryId: Id | null
}
```

### 3.4 Categorías por defecto — `src/domain/seed.ts`

| Tipo | id | Nombre | Emoji | color (token) | sortOrder | builtIn |
|---|---|---|---|---|---|---|
| expense | `cat-alimentacion` | Alimentación | 🛒 | `blue` (`--series-1`) | 0 | no |
| expense | `cat-restaurantes` | Restaurantes | 🍽️ | `orange` (`--series-2`) | 1 | no |
| expense | `cat-transporte` | Transporte | 🚌 | `teal` (`--series-3`) | 2 | no |
| expense | `cat-vivienda` | Vivienda | 🏠 | `violet` (`--series-7`) | 3 | no |
| expense | `cat-suministros` | Suministros | 💡 | `amber` (`--series-4`) | 4 | no |
| expense | `cat-ocio` | Ocio | 🎬 | `pink` (`--series-5`) | 5 | no |
| expense | `cat-salud` | Salud | 💊 | `red` (`--series-8`) | 6 | no |
| expense | `cat-compras` | Compras | 👕 | `green` (`--series-6`) | 7 | no |
| expense | `cat-suscripciones` | Suscripciones | 📱 | `violet` (`--series-7`) | 8 | no |
| expense | `cat-educacion` | Educación | 📚 | `blue` (`--series-1`) | 9 | no |
| expense | `cat-otros-gastos` | Otros gastos | 📦 | `gray` (`--series-other`) | 10 | **sí** |
| income | `cat-nomina` | Nómina | 💼 | `green` (`--series-6`) | 0 | no |
| income | `cat-extras` | Extras | 💶 | `teal` (`--series-3`) | 1 | no |
| income | `cat-devoluciones` | Devoluciones | ↩️ | `blue` (`--series-1`) | 2 | no |
| income | `cat-otros-ingresos` | Otros ingresos | ➕ | `gray` (`--series-other`) | 3 | **sí** |

`seedData(now): AppData` devuelve estas 15 categorías, `transactions: []`, `budgets: []` y `DEFAULT_SETTINGS`. Los ids sembrados son estables para que fixtures, migraciones y tests puedan referenciarlos.

`EMOJI_CHOICES` (40, fijos): 🛒 🍽️ ☕ 🍺 🚌 🚗 ⛽ 🏠 💡 📶 🎬 🎮 🎵 📚 💊 🏥 💪 👕 🛍️ 💇 🎁 ✈️ 🏖️ 🐶 👶 🧾 💳 🏦 📱 💻 🔧 🧹 🎓 🎉 ⚽ 🚲 🍼 📦 💼 💶

### 3.5 Ajustes por defecto

```ts
export const DEFAULT_SETTINGS: Settings = {
  currency: 'EUR',
  locale: 'es-ES',
  theme: 'system',
  initialBalanceCents: 0,
  lastUsedCategoryId: { expense: null, income: null },
  budgetWarnRatio: 0.8,
}
```

### 3.6 Estado de UI (no persistido) — `src/ui/state/uiReducer.ts`

```ts
export const Screen = {
  home: 'home', transactions: 'transactions', budgets: 'budgets',
  reports: 'reports', categories: 'categories', settings: 'settings',
} as const
export type Screen = (typeof Screen)[keyof typeof Screen]

export type Sheet =
  | { kind: 'none' }
  | { kind: 'transaction/new'; presetType?: TransactionType }
  | { kind: 'transaction/edit'; id: Id }
  | { kind: 'budget/new'; presetCategoryId?: Id | null }
  | { kind: 'budget/edit'; id: Id }
  | { kind: 'category/new'; type: TransactionType }
  | { kind: 'category/edit'; id: Id }

export type Toast = { id: number; message: string } | null

export type UiState = {
  screen: Screen
  /** Pantalla desde la que se llegó a la actual (la fija `nav`); null al arrancar. Lo usa el botón «Volver» (§7.0). */
  previousScreen: Screen | null
  month: MonthKey
  /** Un solo slot: `sheet/open` con una hoja abierta se ignora (la pila de hojas es P1-15). */
  sheet: Sheet
  filter: Omit<TransactionFilter, 'month'>
  toast: Toast
}

export type UiAction =
  /** Fija `previousScreen = state.screen` (si cambia de pantalla), resetea `filter` y aplica `filter` si viene. */
  | { type: 'nav'; screen: Screen; filter?: Partial<UiState['filter']> }
  | { type: 'month/set'; month: MonthKey }
  /** Recorta al rango MIN_MONTH..MAX_MONTH (§3.1); en el límite devuelve el mismo estado. */
  | { type: 'month/shift'; delta: -1 | 1 }
  | { type: 'sheet/open'; sheet: Sheet }
  | { type: 'sheet/close' }
  | { type: 'filter/set'; patch: Partial<UiState['filter']> }
  | { type: 'filter/clear' }
  | { type: 'toast/show'; message: string; id: number }
  | { type: 'toast/hide'; id: number }
```

### 3.7 Fixture canónico `v1.json` — `src/domain/storage/__fixtures__/v1.json`

Envelope `{ app: 'mis-finanzas', schemaVersion: 1, savedAt: 1_783_900_800_000, data }` compartido por unit, componentes y e2e. **Todos los criterios numéricos de §2.1 se calculan a partir de §3.7 con `today = 2026-09-25`** (viernes; septiembre 2026 tiene 30 días). `data.categories` = las 15 de §3.4 tal cual; `data.settings` = `DEFAULT_SETTINGS` salvo `initialBalanceCents: 10000` y `lastUsedCategoryId: { expense: 'cat-suscripciones', income: 'cat-nomina' }`.

`data.transactions` (12; `createdAt = updatedAt = 1_782_864_000_000 + n × 86_400_000`, n = número de fila):

| n | id | type | date | amountCents | categoryId | note | createdAt |
|---|---|---|---|---|---|---|---|
| 1 | `t-01` | income | 2026-07-01 | 120000 | `cat-nomina` | Nómina julio | 1782950400000 |
| 2 | `t-02` | expense | 2026-07-05 | 60000 | `cat-vivienda` | Alquiler | 1783036800000 |
| 3 | `t-03` | expense | 2026-07-18 | 15000 | `cat-alimentacion` | Compra mensual | 1783123200000 |
| 4 | `t-04` | income | 2026-08-01 | 120000 | `cat-nomina` | Nómina agosto | 1783209600000 |
| 5 | `t-05` | expense | 2026-08-05 | 60000 | `cat-vivienda` | Alquiler | 1783296000000 |
| 6 | `t-06` | expense | 2026-08-12 | 3250 | `cat-restaurantes` | Cena con Ana | 1783382400000 |
| 7 | `t-07` | expense | 2026-08-22 | 4500 | `cat-ocio` | Cine | 1783468800000 |
| 8 | `t-08` | income | 2026-09-01 | 120000 | `cat-nomina` | Nómina septiembre | 1783555200000 |
| 9 | `t-09` | expense | 2026-09-05 | 60000 | `cat-vivienda` | Alquiler | 1783641600000 |
| 10 | `t-10` | expense | 2026-09-12 | 8320 | `cat-alimentacion` | Café y compra semanal | 1783728000000 |
| 11 | `t-11` | expense | 2026-09-20 | 11000 | `cat-ocio` | Entradas concierto | 1783814400000 |
| 12 | `t-12` | expense | 2026-09-28 | 5000 | `cat-suscripciones` | Gimnasio (futuro) | 1783900800000 |

`data.budgets` (2): `{ id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 }` y `{ id: 'b-total', categoryId: null, limitCents: 100000 }`.

Cifras derivadas (las que citan F3, F5, F6 y F7):

| Mes | Ingresos | Gastos | Balance | Filas |
|---|---|---|---|---|
| 2026-07 | 120000 | 75000 | +45000 | 3 |
| 2026-08 | 120000 | 67750 | +52250 | 4 |
| 2026-09 | 120000 | 84320 (de ellos 5000 futuros) | +35680 | 5 |

- `totalBalance(today = 2026-09-25)` = 10000 + 360000 − (75000 + 67750 + 79320) = **147930** («1.479,30 €»), `futureCount = 1` (`t-12`).
- `monthKpis('2026-09')`: `daysInMonth 30`, `daysElapsed 25`, `futureExpenseCents 5000`, `expensePastCents 79320`, `avgDailyExpenseCents = round(79320 / 25) = 3173`, `projectedExpenseCents = round(79320 × 30 / 25) = 95184`, `topDay = { date: '2026-09-05', expenseCents: 60000 }`.
- `expensesByCategory('2026-09')`: Vivienda 60000 (71 %), Ocio 11000 (13 %), Alimentación 8320 (10 %), Suscripciones 5000 (6 %) — porcentajes por resto mayor (suelos 71/13/9/5 = 98, los dos restos mayores son Suscripciones 0,929 y Alimentación 0,867). `foldOthers` no pliega nada (4 filas, todas ≥ 3 %).
- `budgetProgress('2026-09')`: `b-total` primero (`spent 84320`, `ratio 0,8432`, `warning`, `remaining 15680`), luego `b-ocio` (`spent 11000`, `ratio 1,1`, `over`, `remaining −1000`). En agosto `b-ocio` está en `ok` (4500 / 10000, «Te quedan 55,00 €»).
- `monthlyTrend(txs, '2026-09', 6)` = `['2026-04', '2026-05', '2026-06']` a cero + las tres filas de la tabla anterior.
- Búsqueda `cafe` en septiembre → solo `t-10`; en agosto no coincide nada.

---

## 4. Reglas de dominio

Todas las funciones de `src/domain/**` son puras: reciben `today`, `now` y `makeId` como parámetros; nunca leen el reloj ni `crypto` por su cuenta salvo en `ids.ts` y `dates.ts#todayLocal` (envoltorios inyectables).

### 4.1 Dinero — `src/domain/money.ts`

```ts
export type AmountParseError = 'empty' | 'invalid' | 'too-many-decimals' | 'too-large' | 'zero' | 'negative'
export function parseAmount(input: string, opts?: { allowZero?: boolean; allowNegative?: boolean }): Result<Cents, AmountParseError>
export function formatCents(cents: number, currency: string, opts?: { signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero' }): string
export function formatSigned(cents: Cents, type: TransactionType, currency: string): string   // '−12,50 €' / '+1.200,00 €'
export function formatCentsPlain(cents: number): string     // '-1234,56' sin agrupación, 2 decimales (CSV e inputs)
export function formatAmountInput(cents: Cents): string     // '1234,56' (prefill del <input>); round-trip exacto
export function formatCompactCents(cents: number, currency: string): string // Intl notation:'compact' ('1,2 mil €'; maximumFractionDigits 1). Eje Y de Informes.
export function formatBytes(bytes: number): string          // Intl.NumberFormat es-ES, 'kB' / 'MB', 1 decimal ('0 kB', '1,2 kB', '1,3 MB'). Pie de Ajustes.
export function largestRemainderPercents(parts: readonly number[]): number[]  // enteros que suman 100 (o todos 0)
export function isCents(x: unknown): x is Cents            // Number.isSafeInteger
```

**Gramática de `parseAmount`** (determinista, solo enteros; prohibido `parseFloat`, `Number(x)` sobre el texto completo, `toFixed`, `Math.round(x*100)`):
1. `trim`; eliminar espacios/NBSP; eliminar un `+` inicial; eliminar, al principio o al final, exactamente uno de: `€`, `$`, `US$`, `£`, `CHF`, `R$` o un código de 3 letras MAYÚSCULAS de `SUPPORTED_CURRENCIES` (no se acepta minúscula ni otras letras: `12a`, `12 usd` → `invalid`).
2. `''` → `empty`. `-` inicial → si `allowNegative`, signo negativo; si no, `negative`.
3. Cualquier carácter fuera de `[0-9.,]` → `invalid`.
4. Si hay `,` y `.`: el **último** que aparece es el separador decimal; el otro debe dividir la parte entera en grupos de exactamente 3 (`1.234,56` ✓, `1,234.56` ✓, `1.2,3` ✗ `invalid`).
5. Solo `,`: exactamente una → decimal; más de una → `invalid`.
6. Solo `.`: un punto con exactamente 3 dígitos detrás → miles (`1.234` = 1234,00); varios puntos, todos con grupos de 3 → miles (`1.234.567`); en cualquier otro caso → decimal (`12.5`, `12.50`).
7. Fracción: 1 dígito ×10, 2 dígitos tal cual, > 2 → `too-many-decimals` (sin redondeo silencioso). `,5` / `.5` → 50.
8. Los ceros a la izquierda se descartan antes de contar los dígitos (`000000000012` → 1200). Más de 9 dígitos enteros significativos → `too-large` (comprobado antes de multiplicar). `cents = Number(intDigits) * 100 + fractionCents`; `> MAX_CENTS` → `too-large`.
9. Resultado 0 → `zero` salvo `allowZero`.

**Formato**: `formatCents` usa `Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 })` construyendo el número como `sign * (Math.trunc(abs/100) + (abs%100)/100)` — la única división por 100 permitida, hecha justo antes de Intl y nunca almacenada. Los tests normalizan `\s` (NBSP/narrow NBSP) antes de comparar. El signo visual en listas viene de `type` (`formatSigned`), no de `amountCents`. `formatCents` sustituye el guion ASCII que emita Intl por U+2212 (`replace('-', '−')`) para que todo signo negativo visible sea el mismo carácter; el hero de balance usa `signDisplay: 'exceptZero'` (un balance 0 se muestra «0,00 €», nunca «+0,00 €»); si `Intl.NumberFormat` lanza `RangeError` por moneda desconocida se reintenta con `'EUR'` (nunca lanza). `formatCompactCents` y `formatBytes` existen para que nadie use `toFixed` en la UI (§4.2 guardián).

### 4.2 Fechas — `src/domain/dates.ts`

```ts
export function todayLocal(now?: Date): LocalDate                 // getFullYear/getMonth/getDate, zero-padded
export function isLocalDate(s: string): s is LocalDate            // regex + calendario real (rechaza 2025-02-30)
export function isMonthKey(s: string): s is MonthKey
export function monthKeyOf(d: LocalDate): MonthKey                // d.slice(0, 7)
export function currentMonth(now?: Date): MonthKey
export function dayOf(d: LocalDate): number                       // Number(d.slice(8, 10))
export function daysInMonth(m: MonthKey): number                  // aritmética bisiesta, sin Date
export function addMonths(m: MonthKey, n: number): MonthKey       // '2026-01' -1 → '2025-12'
export function addDays(d: LocalDate, n: number): LocalDate       // vía Date.UTC (inmune a DST)
export function lastNMonths(end: MonthKey, n: number): MonthKey[] // n claves, la más antigua primero, termina en end
export function compareDates(a: LocalDate, b: LocalDate): -1 | 0 | 1  // comparación de strings
export function formatMonthLabel(m: MonthKey): string             // 'septiembre 2026' (Intl, Date(y, m-1, 1, 12))
export function formatDayHeader(d: LocalDate, today: LocalDate): string // 'Hoy' | 'Ayer' | 'jueves, 18 sep'
export function formatShortMonth(m: MonthKey): string             // 'sep' (eje X)
export function formatDateLabel(d: LocalDate): string             // '25/09/2026'
```
Reglas: nunca `new Date('YYYY-MM-DD')` (se interpreta como UTC), nunca `toISOString()` para fechas de negocio. Para formatear se construye `new Date(y, m - 1, d, 12)` (mediodía local). Un test-guardián hace `grep` de `parseFloat`, `toFixed`, `toISOString(` y `new Date('` en todo `src/` (incluidos `ui` y `test`) excepto `src/domain/dates.ts` y `e2e/`, y falla si aparecen (mismo alcance en §10.1 y §11.4).

### 4.3 Ids y texto — `src/domain/ids.ts`, `src/domain/text.ts`

- `newId(): Id` → `crypto.randomUUID()`; fallback a v4 con `crypto.getRandomValues` (orígenes no seguros tipo `http://192.168.x.x`). Inyectable en reducer/tests.
- `normalizeText(s: string): string` → `s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()` (el rango de diacríticos combinantes se escribe con escapes `\u0300-\u036f` en el código fuente, nunca con los caracteres en crudo). Se usa en búsqueda y en unicidad de nombres de categoría. `normalizeText('Ñandú') = 'nandu'`.

### 4.4 Validación de formularios — `src/domain/validate.ts`

| Campo | Regla | Mensaje (copy.ts) |
|---|---|---|
| Importe (movimiento, presupuesto) | `parseAmount` con defaults | `empty`/`zero`: «Introduce un importe mayor que 0»; `too-many-decimals`: «Máximo dos decimales»; `invalid`: «Importe no válido. Ejemplos: 12,50 · 1.234,56»; `too-large`: «Importe demasiado grande (máx. 999.999.999,99)»; `negative`: «El importe no puede ser negativo» |
| Saldo inicial | `parseAmount(x, {allowZero: true, allowNegative: true})` | los mismos salvo zero/negative |
| Fecha | `isLocalDate` | «Fecha no válida» |
| Categoría | existe, mismo tipo | «Elige una categoría» |
| Nota | `trim`, `length ≤ 140` | «La nota no puede superar 140 caracteres» |
| Nombre de categoría | `trim`, 1..30, único por tipo con `normalizeText` | «El nombre es obligatorio» / «Ya existe una categoría con ese nombre» / «Máximo 30 caracteres» |
| Presupuesto | categoría de gasto o `null`, sin duplicado | «Ya existe un presupuesto para esta categoría» |

`validateAppData(x: unknown): Result<{ data: AppData; warnings: string[] }, string>` — guards a mano (sin librería): estructura, tipos, enteros seguros, fechas reales, ids únicos, `categoryId` existente y del mismo tipo, presupuestos únicos y solo de gasto, existencia de ambas categorías `builtIn` (se recrean si faltan, con aviso), settings con defaults por campo. **Normaliza** en lugar de rechazar en casos benignos y devuelve un aviso en español por cada ajuste (`warnings`); campos desconocidos se descartan sin aviso. `assertInvariants(data)` re-verifica lo mismo en tests tras cada acción.

**Normalización vs rechazo** (tabla exhaustiva; `validate.test.ts` asserta cada fila):

| Resultado | Condición |
|---|---|
| RECHAZA (`invalid-data`) | `data` no es objeto; `transactions`/`categories`/`budgets` no son arrays; un elemento de `transactions` no es objeto; `amountCents` no es entero ≥ 1 o es > `MAX_CENTS`; `date` inválida (`isLocalDate`); `type` desconocido en un movimiento; `id` no string/vacío o duplicado en cualquier colección (movimientos, categorías o presupuestos); falta `categoryId` (no string) |
| NORMALIZA (con aviso) | categoría con `type` inválido → descartada y sus movimientos a la `builtIn` del tipo del movimiento; `color` inválido → `gray`; `icon` fuera de `EMOJI_CHOICES` → `📦`; nombre vacío/no string → `Categoría {n}`, > 30 → recortado; nombres que colisionan (`normalizeText`, mismo tipo) → sufijo « (2)» (« (3)»…); `sortOrder` no entero/duplicado → renumerado por orden de aparición dentro del tipo; `builtIn` no booleano → `false` (y si falta la `builtIn` de un tipo se recrea con su id de `WELL_KNOWN_IDS`); `categoryId` inexistente o de otro tipo → `builtIn` del tipo del movimiento; `note` no string → `''`, > 140 → recortada; `createdAt`/`updatedAt` no enteros seguros → `0` (`validateAppData` no ve el envelope y no lee el reloj); presupuesto duplicado (mismo `categoryId`, incluido dos con `null`)/de categoría de ingreso o inexistente/`limitCents` no entero o ≤ 0 → descartado; `settings` parcial o no objeto → defaults por campo (`currency` no string de 3 letras → `EUR`, `theme` desconocido → `system`, `initialBalanceCents` no entero seguro → 0, `lastUsedCategoryId` con id inexistente → `null`, `budgetWarnRatio` fuera de (0,1) → 0.8); `savedAt` no numérico → `Date.now()` en el envelope reconstruido (único uso del reloj, en `jsonio`, no en `validate`); `schemaVersion` dado como string o no entero → `not-an-envelope` (lo decide `isPersistedEnvelope`, antes de validar) |

Los avisos se formatean como «Se han ajustado {n} elementos: …» y se muestran bajo la vista previa de importación (§7.7). En la carga normal desde `localStorage` la normalización se aplica en silencio (`LoadResult.ok` no expone `warnings`).

### 4.5 Agregaciones — `src/domain/queries.ts`

```ts
export function transactionsInMonth(txs: readonly Transaction[], month: MonthKey): Transaction[]
/** Orden canónico: date desc, createdAt desc, id asc. */
export function sortTransactions(txs: readonly Transaction[]): Transaction[]
export function filterTransactions(txs: readonly Transaction[], cats: ReadonlyMap<Id, Category>, f: TransactionFilter): Transaction[]
export function groupByDay(txs: readonly Transaction[]): DayGroup[]           // ya ordenados; grupos por fecha desc
export function summarizeMonth(txs: readonly Transaction[], month: MonthKey): MonthSummary
export function summarize(txs: readonly Transaction[]): Omit<MonthSummary, 'month'>   // para el conjunto filtrado
/** n entradas, la más antigua primero, terminando en endMonth; meses sin datos a cero. */
export function monthlyTrend(txs: readonly Transaction[], endMonth: MonthKey, n: number): MonthSummary[]
/** Gasto por categoría del mes: amountCents desc, luego name asc; percent por resto mayor. */
export function expensesByCategory(txs: readonly Transaction[], cats: readonly Category[], month: MonthKey): CategoryTotal[]
/** Mantiene las filas con percent >= minPercent hasta `max` filas nombradas y pliega el resto en una fila final
 *  { categoryId: null, isOthers: true, name: 'Otras', icon: '…', color: 'gray' } (resultado: hasta max + 1 = 9 filas).
 *  Si todas están por debajo del umbral conserva las `max` primeras. Los percent se recalculan para que sumen 100. */
export function foldOthers(rows: readonly CategoryTotal[], opts?: { max?: number; minPercent?: number }): CategoryTotal[] // max 8, minPercent 3
export function totalBalance(txs: readonly Transaction[], initialBalanceCents: Cents, today: LocalDate): TotalBalance
export function monthKpis(txs: readonly Transaction[], month: MonthKey, today: LocalDate): MonthKpis
export function budgetProgress(data: AppData, month: MonthKey): BudgetProgress[]   // uno por budget; total primero, luego por ratio desc
export function categoriesWithoutBudget(data: AppData, month: MonthKey): CategoryTotal[]   // P1-18 (firma cerrada; sin UI en P0)
export function countTransactionsByCategory(txs: readonly Transaction[]): ReadonlyMap<Id, number>
export function recentTransactions(txs: readonly Transaction[], n: number): Transaction[]
```

Semántica exacta:
- `summarizeMonth`: suma entera de `amountCents` por tipo entre los movimientos con `monthKeyOf(date) === month`; `balanceCents = income − expense`; `transactionCount` = filas del mes. Un mes vacío devuelve ceros (nunca `undefined`).
- `monthlyTrend(txs, '2026-09', 6)` → `['2026-04', …, '2026-09']` con `summarizeMonth` de cada uno.
- `totalBalance`: `initialBalanceCents + Σ income − Σ expense` sobre **todos** los movimientos con `date <= today`; `futureCount` = movimientos con `date > today`.
- `budgetProgress`: `spentCents` = gasto del mes de esa categoría (o de todas si `categoryId: null`); `ratio = spent / limit`; `status = spent > limit ? 'over' : ratio >= settings.budgetWarnRatio ? 'warning' : 'ok'` (exactamente 100 % → `warning`, «Te quedan 0,00 €»).
- `monthKpis` (§4.6). `expensesByCategory` con `percent` por **resto mayor** (`[1,1,1]` céntimos → 34/33/33).

### 4.6 Proyección a fin de mes y media diaria

- `daysElapsed(month, today)`: `month > monthKeyOf(today)` → 0; `month === monthKeyOf(today)` → `dayOf(today)`; pasado → `daysInMonth(month)`.
- Para el mes en curso, `avgDailyExpenseCents` y `projectedExpenseCents` se calculan con `expensePastCents` = gasto del mes con `date <= today`; los movimientos futuros del mes (`futureExpenseCents`, `date > today`) se excluyen de la extrapolación aunque cuenten en el total del mes y en presupuestos. En meses pasados `expensePastCents === expenseCents` y `futureExpenseCents === 0`.
- `avgDailyExpenseCents = daysElapsed === 0 ? null : Math.round(expensePastCents / daysElapsed)` (redondeo a entero; el único float intermedio).
- `projectedExpenseCents`: pasado → `expenseCents`; actual → `Math.round(expensePastCents * daysInMonth / daysElapsed)` (el último día sin futuros coincide con el real); futuro → `null`. Los ingresos **no** se extrapolan (las nóminas son a saltos).
- `topDay`: fecha con mayor suma de gasto del mes; en caso de empate, la fecha más antigua; `null` sin gastos.
- Ejemplo de referencia: mes actual, día 10 de 30, 100 € pasados y 800 € futuros → proyección 300,00 €, media 10,00 €, `futureExpenseCents 80000`.
- UI: «Gasto medio por día 27,20 €», «Proyección a fin de mes 816,00 € · día 25 de 30»; `null` → «—»; cuando `futureExpenseCents > 0` la UI añade el sufijo «(sin contar {n} futuro(s))» con `n` = número de movimientos de gasto futuros del mes.

### 4.7 Reglas del reducer — `src/domain/reducer.ts`

`reduce(state: AppData, action: Action): Result<AppData, ReducerError>` — puro, nunca lanza, nunca muta (los tests congelan la entrada con `Object.freeze` profundo).
- `transaction/add`: valida importe (1..MAX), fecha, nota, categoría existente y del mismo tipo, id no duplicado; añade con `createdAt = updatedAt = now`; actualiza `settings.lastUsedCategoryId[type]`.
- `transaction/update`: id existente; aplica patch y revalida; `updatedAt = now`; actualiza `lastUsedCategoryId` si cambia la categoría.
- `transaction/remove`: id desconocido → `unknown-transaction` (no-op sin persistir).
- `category/add`: `id` no duplicado; nombre válido y único (`normalizeText`) dentro del tipo; valida `icon ∈ EMOJI_CHOICES` (`invalid-icon`) y `color ∈ ColorKey` (`invalid-color`); el reducer fija `sortOrder = max(sortOrder del tipo) + 1` y `builtIn = false` (el cliente no puede inyectar una segunda `builtIn` ni huecos/duplicados de `sortOrder`).
- `category/update`: mismas validaciones de nombre/icono/color sobre el patch (renombrar a su propio nombre permitido); `builtIn` puede renombrarse y recolorearse, no cambiar de tipo.
- `category/move` (P1-17, no en P0): intercambia `sortOrder` con la vecina del mismo tipo; en los extremos devuelve el mismo estado.
- `category/remove`: `builtIn` → `builtin-category`; si no: mueve sus movimientos a `WELL_KNOWN_IDS.other*` del mismo tipo (bump `updatedAt = now`), elimina su presupuesto, elimina la categoría, y si era `lastUsedCategoryId` lo pone a `null`.
- `budget/upsert`: `limitCents` entero > 0; `categoryId` `null` o categoría de **gasto** existente; unicidad por `categoryId` (upsert por id reemplaza; otro id con la misma categoría → `duplicate-budget`).
- `settings/update`: `currency` string no vacío de 3 letras, `theme` ∈ Theme, `initialBalanceCents` entero seguro, `budgetWarnRatio` en (0,1), `lastUsedCategoryId` ids existentes o null.
- `data/replace`: se asume validado (viene de `parseImport` / `restoreBackup`). `data/reset` → `seedData(now)`.
- Identidad: si la acción es no-op el reducer devuelve **la misma referencia**; el store lo usa para no persistir ni notificar.

### 4.8 Exportar / importar JSON — `src/domain/storage/jsonio.ts`

- `buildEnvelope(data, now)` → `{ app, schemaVersion: SCHEMA_VERSION, savedAt: now, data }`; `exportJson(data, now)` → `JSON.stringify(buildEnvelope(data, now), null, 2)`. El `now` lo inyecta el store (`deps.now()`), así el resultado es determinista. Nombre de archivo: `mis-finanzas-${today}.json`, tipo `application/json`.
- `parseImport(json)`: `JSON.parse` en try/catch → `invalid-json`; `isPersistedEnvelope` (`app === 'mis-finanzas'`, `schemaVersion` entero ≥ 1 —un string `'1'` o `1.5` fallan aquí—, `data` objeto) → `not-an-envelope`; `schemaVersion > SCHEMA_VERSION` → `newer-version`; migraciones → `validateAppData` → `invalid-data`. Devuelve `preview` con los recuentos y `warnings` (§4.4). La UI rechaza archivos con `File.size > 10 MB` **antes** de leerlos con `ImportError = 'too-large'` («El archivo es demasiado grande»); `parseImport` nunca ve ese caso.
- Importar **reemplaza** todo, incluidos ajustes (moneda, tema). Round-trip `parseImport(exportJson(d, now)).data` deep-equal `d` y `warnings = []`.

### 4.9 Exportar CSV — `src/domain/csv.ts` (P1-16; firmas cerradas, no se implementa en P0)

```ts
export const CSV_HEADER = ['Fecha', 'Tipo', 'Categoría', 'Importe', 'Nota', 'Id'] as const
export function exportTransactionsCsv(txs: readonly Transaction[], cats: ReadonlyMap<Id, Category>): string
export function escapeCsvCell(value: string): string
```
- Codificación UTF-8 **con BOM** (`﻿`), separador `;`, fin de línea `\r\n`, cabecera en español.
- `Fecha` = `YYYY-MM-DD`; `Tipo` = `Gasto` | `Ingreso`; `Categoría` = nombre; `Importe` = `formatCentsPlain` (coma decimal, sin agrupación, 2 decimales, siempre positivo; el signo lo da Tipo); `Nota` texto; `Id`.
- `escapeCsvCell`: se entrecomilla si contiene `;`, `"`, `\n`, `\r` o espacio inicial/final, doblando comillas; las celdas de texto que empiezan por `=`, `+`, `-`, `@` se prefijan con `'` (inyección de fórmulas en Excel).
- Orden: el canónico (fecha desc). Nombre de archivo `movimientos-2026-09.csv` (o `movimientos-filtrados-2026-09-25.csv` con filtros), tipo `text/csv;charset=utf-8`.
- Importar CSV es P1-6.

### 4.10 Eliminación de categorías con movimientos

Regla única: **nunca se borran movimientos al borrar una categoría**. Se reasignan a la categoría `builtIn` del mismo tipo («Otros gastos» / «Otros ingresos»), que no se puede eliminar. El presupuesto de la categoría borrada se elimina (se avisa en el diálogo). El archivado es P1-4.

---

## 5. Persistencia

### 5.1 Claves y envelope
- `localStorage['mis-finanzas']` → `PersistedEnvelope` (JSON, sin pretty-print para ahorrar espacio).
- `localStorage['mis-finanzas:backup']` → la última carga útil **buena** anterior; se escribe justo **antes** de sobrescribir `mis-finanzas` (siempre hay un estado anterior recuperable; también protege frente a una migración defectuosa).
- Nada más (sin claves `corrupt:*` acumulativas; el payload corrupto se conserva en `mis-finanzas` sin tocar hasta que el usuario decide).

### 5.2 Carga (`LocalStorageRepository.load`)
1. `localStorage` inaccesible (lanza `SecurityError`, es `undefined` o `getItem` lanza) → `unavailable`. La sonda de escritura (`setItem('mis-finanzas:probe','1')` + `removeItem`) se hace **aparte**, en `repo.probeWrite()` (§3.2), que el store llama después de `load()`: si lanza `QuotaExceededError` devuelve `{ kind: 'quota', bytesAttempted: 0 }`, la carga continúa normalmente y el store arranca con ese valor en `persistence.error` (banner de cuota, no de no-disponible: los datos se han leído bien); cualquier otra excepción en la sonda → `{ kind: 'unavailable' }` y el store lo trata como una carga `unavailable` (repositorio en memoria + banner).
2. `getItem` → `null` → `empty` (el store siembra `seedData` y guarda).
3. `JSON.parse` en try/catch → error → `corrupt` (con `raw` y `hasBackup`).
4. `isPersistedEnvelope` → falla → `corrupt`. `schemaVersion > SCHEMA_VERSION` → `newer`.
5. `runMigrations(envelope)`: aplica `MIGRATIONS` en orden desde `schemaVersion` hasta `SCHEMA_VERSION`; falta un paso o lanza → `corrupt`.
6. `validateAppData` → falla → `corrupt`; ok → `{ kind: 'ok', data, migratedFrom }`. `load()` nunca escribe. Si `migratedFrom !== null` el store llama a `save` inmediatamente; la secuencia normal de `save` (§5.3) copia el payload **original** (pre-migración, aún en `mis-finanzas`) a backup antes de escribir la versión nueva.

### 5.3 Guardado (`save`)
- Síncrono, **dentro de `store.dispatch`**, tras un reducer aceptado y **antes** de notificar a los suscriptores. Sin debounce: un `setItem` de ≤ 5 MB tarda pocos ms y así `StrictMode` (que duplica efectos, no dispatches) no puede duplicar escrituras y el cierre de pestaña nunca pierde la última acción.
- Secuencia de `save(data, now, opts)`: (1) `prev = getItem(KEY)`; (2) `if (prev && !opts?.skipBackup) setItem(BACKUP, prev)`; (3) `setItem(KEY, JSON.stringify(buildEnvelope(data, now)))`.
- `skipBackup` omite el paso 2; se usa **solo** desde la recuperación (`Store.recover`, §5.6) para no pisar la copia buena con el payload corrupto que sigue en `KEY`.
- El `setItem(BACKUP, prev)` del paso 2 es best-effort: si lanza por cuota se registra (`console.warn`) y se intenta igualmente el `setItem(KEY)`; el resultado de `save` se decide **solo** por la escritura principal.
- Errores clasificados (de la escritura principal): `QuotaExceededError` (nombre, o `code` 22 / 1014) → `{kind:'quota', bytesAttempted}`; resto → `unavailable`. En ambos casos el estado en memoria se conserva y el store expone `persistence.error`; el siguiente guardado correcto lo limpia.

### 5.4 Migraciones — `src/domain/storage/migrations.ts`
- `MIGRATIONS: readonly Migration[]` contiguas y ordenadas; en v1 la lista está vacía pero el runner, la comprobación de contigüidad y el mecanismo de fixtures (`src/domain/storage/__fixtures__/v1.json`) existen y se testean desde el día uno con una cadena sintética (`0→1→2`) en el test.
- Contrato: `migrate` es pura, total (no lanza con entradas de su versión), descarta campos desconocidos, rellena defaults. Cada fixture histórico debe migrar y pasar `validateAppData`.
- Ejemplo documentado para v2 (P1): añadir `archived: false` a categorías y `recurringRules: []`.

### 5.5 Errores en UI
- `unavailable` → banner persistente arriba: «No se puede guardar en este navegador. Los datos se perderán al cerrar esta pestaña.» La app funciona con `InMemoryRepository`.
- `quota` → banner: «No se ha podido guardar: el almacenamiento está lleno. Exporta una copia y elimina movimientos antiguos.» + botón «Exportar copia».
- `corrupt` → tarjeta de recuperación que **sustituye** el contenido hasta resolver: «No se han podido leer tus datos guardados.» + «Restaurar copia automática» (si `hasBackup`; llama a `store.recover('restore-backup')`), «Descargar datos en bruto» (raw como `.txt`), «Empezar de cero» (confirmación con BORRAR; `store.recover('reset')`). Mientras tanto el store está en `mode: 'readonly'` (§5.6) y nunca se sobrescribe `mis-finanzas` hasta que el usuario elige. Si `restoreBackup()` devuelve algo distinto de `ok`, la tarjeta muestra «La copia automática tampoco se puede leer» y oculta el botón «Restaurar copia automática»; quedan «Descargar datos en bruto» y «Empezar de cero».
- `newer` → tarjeta: «Estos datos son de una versión más reciente de Mis Finanzas. Actualiza la app o descarga los datos.» + «Descargar datos en bruto». Store en `mode: 'readonly'` con `seedData` en memoria; no se guarda nada.

### 5.6 Suscripción de React — decisión: `useSyncExternalStore` sobre un store externo
`src/domain/storage/store.ts`:
```ts
export type StoreMode = 'normal' | 'readonly'
export type PersistenceStatus = {
  error: SaveResult | null
  load: LoadResult | null
  lastSavedAt: Timestamp | null
  /** 'readonly' mientras la carga es corrupt/newer, o unavailable sin haber cambiado aún a InMemoryRepository: dispatch reduce y notifica pero NUNCA llama a repo.save. */
  mode: StoreMode
  /** true tras un recover('restore-backup') fallido: la UI oculta el botón. */
  backupUnreadable: boolean
}
export type Store = {
  getSnapshot(): AppData                 // misma referencia hasta que un dispatch cambie el estado
  getPersistence(): PersistenceStatus    // snapshot separado, cambia rara vez
  subscribe(listener: () => void): () => void
  dispatch(action: Action): Result<AppData, ReducerError>   // reduce → save(data, deps.now()) (sync, solo en mode 'normal') → notify
  /** Salida del modo readonly tras corrupt (§5.5). Nunca toca el backup (save con skipBackup). */
  recover(kind: 'restore-backup' | 'reset'): void
  reloadFromStorage(): void
}
export function createStore(repo: StorageRepository, deps: { now: () => Timestamp; today: () => LocalDate }): Store
```
Reglas del store:
- `createStore` llama a `repo.load()` y después a `repo.probeWrite()`: `ok` → `mode: 'normal'` (y re-guarda si `migratedFrom !== null`); `empty` → siembra y guarda, `normal`; `corrupt` / `newer` → snapshot = `seedData(deps.now())` en memoria y `mode: 'readonly'`; `unavailable` (de `load` o de la sonda) → `mode: 'readonly'` sobre ese repo (nunca se escribe en un storage que lanza); `App.tsx` detecta `getPersistence().load.kind === 'unavailable'` y crea el store definitivo sobre `InMemoryRepository`, que arranca `normal` (guardar en memoria es inocuo) conservando el `LoadResult` `unavailable` original en `persistence.load` para el banner. Sonda con `quota` → `normal` con `persistence.error = quota`.
- En `readonly`, `dispatch` reduce y notifica pero **nunca** llama a `repo.save` (así «no se guarda nada» de §5.5 es una propiedad del store y no de la UI).
- `recover('restore-backup')`: llama a `repo.restoreBackup()`; si `ok` → snapshot = sus datos, `repo.save(data, deps.now(), { skipBackup: true })`, `mode = 'normal'`; si no → sigue `readonly`, `backupUnreadable = true` (la UI muestra «La copia automática tampoco se puede leer» y oculta el botón).
- `recover('reset')`: snapshot = `seedData(deps.now())`, `repo.save(seed, deps.now(), { skipBackup: true })`, `mode = 'normal'`. El backup anterior queda intacto.
- `data/reset` despachado en modo `normal` («Borrar todos los datos» de Ajustes) sigue la secuencia normal de `save`: el estado previo pasa a backup (último recurso del usuario).
`src/ui/state/StoreContext.tsx` provee el store; `useAppData()` = `useSyncExternalStore(store.subscribe, store.getSnapshot)`; `usePersistence()` igual con `getPersistence`; `useDispatch()` devuelve `store.dispatch`. Los derivados (`summarizeMonth`, etc.) se calculan con `useMemo` sobre el snapshot.

Justificación breve: (1) la persistencia vive fuera de React, así el guardado ocurre exactamente una vez por acción y no en `useEffect` (inmune a `StrictMode` y a re-renders); (2) el store se inyecta en tests con `InMemoryRepository` sin mocks globales; (3) `useSyncExternalStore` es la primitiva oficial para fuentes externas, evita tearing y no necesita librería; (4) frente a `useReducer` + `useEffect` para guardar, elimina el doble guardado y el «estado guardado ≠ estado mostrado» al cerrar la pestaña. El estado de UI (pantalla, mes, hoja, filtros, toast) sí usa `useReducer` en `UiContext` porque no se persiste.

---

## 6. Estructura de archivos

Leyenda: **[I]** = construible de forma independiente (solo depende de `types.ts`/tokens); **[D: x]** = depende de x.

```
src/
├── main.tsx                         Monta <App /> con StrictMode (sin props: App crea el store por defecto). [D: App]
├── App.tsx                          `App(props: { store?: Store; today?: () => LocalDate })`: sin props crea un store sobre localStorage (con fallback memoria si load() → unavailable). Providers (Store, Ui) + <Shell>. Aplica data-theme. [D: state, Shell]
├── App.test.tsx                     (ya existe) se reescribe para usar renderApp() pero conserva la aserción del <h1> «Mis Finanzas». [D: renderApp]
├── index.css                        Solo @import de styles/*.css (se reemplaza el del template por completo).
│
├── domain/                          TypeScript puro. Sin React ni DOM (salvo ids.ts/dates.ts para crypto/Date envueltos).
│   ├── types.ts                     Tipos y constantes de §3.1. [I]
│   ├── actions.ts                   Action, TransactionInput, ReducerError. [D: types]
│   ├── money.ts                     parseAmount (gramática §4.1), formatCents, formatSigned, formatCentsPlain, formatAmountInput, formatCompactCents, formatBytes, largestRemainderPercents. [I]
│   ├── dates.ts                     todayLocal, isLocalDate, daysInMonth, addMonths, addDays, lastNMonths, formatMonthLabel, formatDayHeader… [I]
│   ├── ids.ts                       newId con fallback getRandomValues; isId. [I]
│   ├── text.ts                      normalizeText (NFD sin diacríticos, lower, trim). [I]
│   ├── seed.ts                      DEFAULT_CATEGORIES, EMOJI_CHOICES, DEFAULT_SETTINGS, seedData(now). [D: types]
│   ├── validate.ts                  validateAppData (guards a mano + normalización), validators de formulario, assertInvariants. [D: types, money, dates, text]
│   ├── reducer.ts                   reduce(state, action) puro con reglas de §4.7. [D: validate, text, seed]
│   ├── queries.ts                   Agregaciones de §4.5 y §4.6: summarizeMonth, monthlyTrend, expensesByCategory, foldOthers, totalBalance, monthKpis, budgetProgress, filterTransactions, groupByDay. [D: types, dates, money, text]
│   ├── csv.ts                       (P1-16) exportTransactionsCsv, escapeCsvCell (§4.9). No se crea en P0. [D: money]
│   └── storage/
│       ├── schema.ts                APP_TAG, SCHEMA_VERSION, claves, PersistedEnvelope, LoadResult, SaveResult, StorageRepository. [D: types]
│       ├── migrations.ts            MIGRATIONS[] (vacío en v1) + runMigrations con comprobación de contigüidad. [D: schema]
│       ├── jsonio.ts                isPersistedEnvelope, buildEnvelope, exportJson, parseImport (§4.8). [D: schema, migrations, validate]
│       ├── localStorageRepository.ts createLocalStorageRepository(storage): load/probeWrite/save(skipBackup)/backup/readRaw/estimateBytes con clasificación de errores. [D: jsonio]
│       ├── memoryRepository.ts      createMemoryRepository(initial?): misma interfaz sobre un Map (tests y fallback). [D: jsonio]
│       ├── store.ts                 createStore(repo, deps): snapshot estable, dispatch = reduce → save → notify, mode normal/readonly, recover (§5.6). [D: reducer, schema, seed]
│       └── __fixtures__/v1.json     Envelope v1 canónico de §3.7 (3 meses, 12 movimientos, 2 presupuestos) compartido por unit, componentes y e2e. [I]
│
├── ui/                              React. Solo renderiza y despacha.
│   ├── copy.ts                      TODO el texto es-ES (labels, botones, vacíos, confirmaciones, errores) como objeto tipado; funciones para plurales/interpolación. [I]
│   ├── state/
│   │   ├── storeContext.ts          createContext<Store | null>; importado por StoreContext.tsx y useStore.ts. [D: store]
│   │   ├── StoreContext.tsx         <StoreProvider store>. Solo exporta el componente (oxlint only-export-components). [D: storeContext]
│   │   ├── useStore.ts              useAppData, usePersistence, useDispatch, useStore (useSyncExternalStore). [D: storeContext]
│   │   ├── uiReducer.ts             UiState/UiAction/Screen/Sheet (§3.6) y reducer puro (previousScreen, recorte de mes). [I]
│   │   ├── uiContext.ts             createContext para estado y dispatch de UI; importado por UiContext.tsx y useUi.ts. [D: uiReducer]
│   │   ├── UiContext.tsx            <UiProvider today>: useReducer(uiReducer) + temporizador de toast. Solo exporta el componente. [D: uiContext]
│   │   └── useUi.ts                 useUi(), useUiDispatch(), helpers openSheet/nav/showToast. [D: uiContext]
│   ├── hooks/
│   │   ├── useMediaQuery.ts         useMediaQuery('(min-width: 900px)') con useSyncExternalStore. [I]
│   │   ├── useTheme.ts              Sincroniza settings.theme → <html data-theme>. [D: useStore]
│   │   ├── useDownload.ts           downloadText(filename, text, mime) vía Blob + <a download>. [I]
│   │   └── useKeyboardShortcuts.ts  (P1-11) «n» abre alta. No se crea en P0; Escape lo gestiona <dialog>. [D: useUi]
│   ├── components/                  Compartidos, sin conocimiento de pantalla.
│   │   ├── Shell.tsx                Layout: cabecera, contenido, <TabBar> (móvil) / <Sidebar> (escritorio), FAB, <ToastRegion>, <Banners>, <SheetHost>. [D: state, hooks]
│   │   ├── TabBar.tsx               5 slots con aria-current y FAB central. [D: useUi, copy]
│   │   ├── Sidebar.tsx              Nav de escritorio + «+ Nuevo movimiento». [D: useUi, copy]
│   │   ├── MonthSelector.tsx        ‹ › + etiqueta + píldora «Hoy». [D: useUi, dates]
│   │   ├── Dialog.tsx               <dialog> con showModal, cierre por Escape/backdrop/×, variante sheet (móvil) / modal (escritorio). [D: useMediaQuery]
│   │   ├── ConfirmDialog.tsx        Título, texto, botones confirmar/cancelar; variante «escribe BORRAR». [D: Dialog]
│   │   ├── AmountInput.tsx          Input decimal con vista previa «= 12,50 €» y error; expone cents|error al padre. [D: money]
│   │   ├── CategoryPicker.tsx       Rejilla 4/6 columnas de tiles (button aria-pressed). Sin «+ Nueva» (P1-15). [D: copy]
│   │   ├── ErrorBoundary.tsx        Componente de clase (sin parameter properties) con prop `fallback` y botón «Reintentar» que resetea el estado. Envuelve el React.lazy de Informes. [I]
│   │   ├── CategoryBadge.tsx        Círculo de color + emoji. [I]
│   │   ├── Money.tsx                <span> con formatSigned/formatCents y clase income/expense/neutral. [D: money]
│   │   ├── TransactionRow.tsx       Fila de lista (button) con badge, nombre, nota, importe. [D: Money, CategoryBadge]
│   │   ├── TransactionList.tsx      Grupos por día con cabecera y neto. [D: TransactionRow, queries]
│   │   ├── ProgressBar.tsx          Barra accesible (role=progressbar) coloreada por status, recorta a 100 %. [I]
│   │   ├── BudgetCard.tsx           Tarjeta de presupuesto con textos de estado. [D: ProgressBar, Money]
│   │   ├── EmptyState.tsx           Título, texto, CTA opcional. [I]
│   │   ├── Banner.tsx               Aviso persistente (warning/error) con acción. [I]
│   │   ├── ToastRegion.tsx          aria-live=polite, un toast a la vez. [D: useUi]
│   │   ├── SegmentedControl.tsx     Grupo de radio estilizado (Gasto|Ingreso, tema; «6|12 meses» en P1-19). [I]
│   │   ├── Chips.tsx                Chip (button aria-pressed) y fila con scroll horizontal. [I]
│   │   └── charts/
│   │       ├── chartColors.ts       Lee --series-N y --series-income/expense con getComputedStyle (memo por tema). [I]
│   │       ├── ExpenseDonut.tsx     PieChart donut + leyenda HTML; recibe CategoryTotal[] ya plegado. [D: chartColors]
│   │       ├── IncomeExpenseBars.tsx BarChart agrupado + <table> accesible; recibe MonthSummary[]. [D: chartColors]
│   │       └── ChartFrame.tsx       Envoltorio: ResponsiveContainer en runtime, tamaño fijo cuando recibe prop `size` (tests). [I]
│   └── views/                       Una por pantalla; componen componentes y consultas.
│       ├── HomeView.tsx             Inicio (F6). [D: components, queries]
│       ├── TransactionsView.tsx     Movimientos: búsqueda (estado local + debounce), chips, lista (F3). CSV es P1-16. [D: components, queries]
│       ├── TransactionSheet.tsx     Nuevo/Editar movimiento con confirmación de borrado (F1, F2). [D: Dialog, AmountInput, CategoryPicker]
│       ├── BudgetsView.tsx          Presupuestos (F5). [D: BudgetCard, queries]
│       ├── BudgetSheet.tsx          Nuevo/Editar presupuesto. [D: Dialog, AmountInput]
│       ├── ReportsView.tsx          Informes (F7): donut + barras de 6 meses, cargado con React.lazy dentro de ErrorBoundary. [D: charts, queries]
│       ├── CategoriesView.tsx       Categorías (F4): filas <li> con botón «Editar». [D: components]
│       ├── CategorySheet.tsx        Nueva/Editar categoría + diálogo de eliminación con reasignación. [D: Dialog, ConfirmDialog]
│       ├── SettingsView.tsx         Ajustes (F10) + copia de seguridad (F9) + zona peligrosa. [D: components, jsonio, useDownload]
│       └── RecoveryView.tsx         Tarjeta de datos corruptos / versión más reciente (§5.5). [D: Banner, useDownload]
│
├── styles/
│   ├── tokens.css                   (ya existe) custom properties claro/oscuro. [I]
│   ├── base.css                     Reset mínimo, body con background explícito, tipografía, foco, reduced-motion, utilidades .visually-hidden. [D: tokens]
│   ├── layout.css                   Shell, cabecera, tab bar, sidebar, FAB, contenedores, breakpoints 900px, safe-area. [D: tokens]
│   └── components.css               Botones, inputs, chips, tiles, filas, tarjetas, barras, dialog/sheet, toast, banner, tablas. [D: tokens]
│
└── test/
    ├── setup.ts                     (ya existe) + polyfill de HTMLDialogElement.showModal/close, stub de ResizeObserver, matchMedia + stubs de URL.createObjectURL/revokeObjectURL y HTMLAnchorElement.prototype.click (jsdom no los implementa; sin ellos las pruebas de exportación de SettingsView lanzan).
    ├── renderApp.tsx                 renderApp({ data?, today?, repo? }) → <App store today> con memoryRepository sembrado + userEvent.
    ├── prng.ts                       LCG sembrado para los round-trips de money.test (§9).
    └── fixtures.ts                   Constructores de fixtures (tx(), cat(), budget()) y carga de __fixtures__/v1.json (§3.7).

e2e/
├── smoke.spec.ts                    (ya existe) se mantiene: el <h1> «Mis Finanzas» existe siempre (§7.0).
├── helpers.ts                       seedStorage(page, envelope) vía addInitScript; fixedClock(page, isoLocal) sobre page.clock.setFixedTime (§10.3).
├── quick-add.spec.ts                F1 + persistencia.
├── edit-delete.spec.ts              F2.
├── month-and-budget.spec.ts         F3, F5, F6 (fixture §3.7 + reloj fijo).
├── reports.spec.ts                  F7 (tabla de 6 meses y leyenda; fixture + reloj fijo).
├── categories.spec.ts               F4 con reasignación.
├── backup.spec.ts                   F9 export → borrar → import (deep-equal estricto con reloj fijo). La parte CSV es P1-16.
├── recovery.spec.ts                 §5.5 corrupt + quota.
└── mobile.spec.ts                   F11 (solo proyecto mobile): tab bar, FAB, sin scroll horizontal a 360 y 412 px, dark mode.
```

Orden de construcción sugerido (2 días): día 1 mañana `domain/{types,money,dates,text,ids,seed,validate,reducer,queries}` con tests y el fixture §3.7; día 1 tarde `storage/*` (incluido `store` con `readonly`/`recover`), `ui/state`, `copy`, estilos base, `Shell` (cabecera con «Volver»), `TransactionSheet`, `TransactionsView`; día 2 mañana `HomeView`, `BudgetsView`, `CategoriesView`, `SettingsView` (import con avisos, saldo inicial), `RecoveryView`; día 2 tarde `ReportsView` (donut + barras de 6 meses), e2e con `fixedClock`, pulido 360 px/oscuro/a11y. Fuera del plan (P1): CSV, reordenar categorías, «Sin presupuesto», «Resumen del mes»/12 meses, atajo `n`, «+ Nueva» desde la hoja.

---

## 7. Pantallas

### 7.0 Marco general
- **Móvil (< 900 px)**: cabecera pegajosa `[título de pantalla | selector de mes (en pantallas mensuales) | ⚙ aria-label «Ajustes»]`; contenido con gutter 16 px y `padding-bottom: var(--tabbar-height) + safe-area`; barra inferior fija con 5 slots: Inicio 🏠, Movimientos 📋, **[+]** (FAB elevado, `aria-label` «Añadir movimiento»), Presupuestos 🎯, Informes 📊. Las hojas son `<dialog>` inferiores (ancho completo, `max-height: 92svh`, asa visual, «×»). En las pantallas `settings` y `categories` la cabecera muestra a la izquierda un botón «‹» con `aria-label` «Volver» (settings → `previousScreen` o Inicio si es `null`; categories → Ajustes) en lugar del selector de mes; la barra inferior no marca ningún slot (`aria-current` ausente) y el ⚙ se oculta en Ajustes.
- **Escritorio (≥ 900 px)**: barra lateral 220 px con «Mis Finanzas», botón primario «+ Nuevo movimiento», nav: Inicio / Movimientos / Presupuestos / Informes / Categorías / Ajustes (`aria-current="page"`); contenido centrado `max-width: 1080px`, padding 24 px, selector de mes a la derecha de la cabecera; hojas como diálogo centrado de 480 px.
- **Título de la app**: siempre existe un `<h1>` «Mis Finanzas»: visible en la barra lateral (escritorio) y `.visually-hidden` al inicio de la cabecera móvil; los títulos de pantalla («Inicio», «Movimientos»…) son `<h2>`. Así `src/App.test.tsx` y `e2e/smoke.spec.ts` siguen pasando sin cambios en su aserción.
- **Selector de mes**: «‹» (`aria-label` «Mes anterior»), «septiembre 2026», «›» («Mes siguiente»), píldora «Hoy» solo si mes ≠ actual. Se permite navegar a meses futuros. Rango navegable `MIN_MONTH`…`MAX_MONTH` (`2000-01`…`2099-12`, §3.1); en los extremos el botón correspondiente se deshabilita y `month/shift` no sale del rango.
- **Toast**: región `aria-live="polite"`, abajo-centro sobre la tab bar (móvil) / abajo-derecha (escritorio), un toast, 4 s.
- **Copy global**: «Mis Finanzas» · «Inicio · Movimientos · Presupuestos · Informes · Categorías · Ajustes» · «Añadir movimiento» · «+ Nuevo movimiento» · «Mes anterior · Mes siguiente · Hoy» · «Cerrar» · «Cancelar» · «Guardar».
- **Banners/recuperación**: textos de §5.5.

### 7.1 Inicio
Estructura móvil: hero → saldo total → KPI (2 tiles) → Presupuestos → Gastos por categoría → Últimos movimientos. Escritorio: hero + saldo + KPI en una fila; rejilla 2 columnas (Presupuestos | Gastos por categoría); Últimos movimientos a ancho completo.

Copy: «Balance del mes» · «Ingresos» · «Gastos» · «Saldo total» · «Saldo inicial + ingresos − gastos hasta hoy» · «(sin contar {n} movimiento(s) futuro(s))» · «Gasto medio por día» · «Proyección a fin de mes» · «día {d} de {n}» · «—» · «Presupuestos» · «Ver todos» · «Crea un presupuesto para controlar tus gastos» · «Crear presupuesto» · «Gastos por categoría» · «Ver informe» · «Últimos movimientos» · «Todavía no hay movimientos en {mes}» · «Empieza registrando tu primer gasto» · «Añadir movimiento» · «Importar copia de seguridad».

Gráficos: ninguno de Recharts (barras horizontales en CSS con `ProgressBar`, más ligero y sin dependencia en la primera pintura). El usuario aprende: cómo va el mes y dónde se concentra el gasto.

### 7.2 Nuevo movimiento / Editar movimiento (hoja)
Orden: cabecera (título, ×) → segmento Gasto|Ingreso → Importe (grande, derecha, sufijo símbolo, vista previa/error) → Fecha (chips Hoy/Ayer + `input date`) → Categoría (rejilla 4/6; tile = emoji en círculo de color + nombre; seleccionado con anillo; sin «+ Nueva»: las categorías se crean en la pantalla Categorías, P1-15 añadirá la pila de hojas) → Nota → pie: «Guardar» / «Guardar cambios» (primario, ancho completo) y «Eliminar» (secundario destructivo, solo edición).

Copy: «Nuevo movimiento» · «Editar movimiento» · «Gasto» · «Ingreso» · «Importe» · placeholder «0,00» · «= {importe}» · «Fecha» · «Hoy» · «Ayer» · «Categoría» · «Nota (opcional)» · placeholder «Ej.: café con Ana» · «Guardar» · «Guardar cambios» · «Eliminar» · «¿Eliminar este movimiento?» · «Sí, eliminar» · «Cancelar» · toasts «Gasto guardado» · «Ingreso guardado» · «Cambios guardados» · «Movimiento eliminado» · errores de §4.4.

### 7.3 Movimientos
Móvil: cabecera con mes → búsqueda → fila de chips con scroll horizontal → tira de totales → lista. Escritorio: búsqueda y chips en una fila (con «Exportar CSV» a la derecha en P1-16); filas con nota en columna propia.

Copy: «Movimientos» · «Buscar por nota o categoría» · «Limpiar búsqueda» (`aria-label` del «×» del campo de búsqueda, F3) · «Todos» · «Gastos» · «Ingresos» · «{categoría} ×» (`aria-label` «Quitar filtro de categoría») · «Limpiar filtros» · «Ingresos {x} · Gastos {y} · Balance {z}» · «Hoy» · «Ayer» · «No hay movimientos en {mes}» · «Añadir movimiento» · «Ningún movimiento coincide con los filtros» · (P1-16: «Exportar CSV» · toast «CSV exportado»).

### 7.4 Presupuestos
Móvil: 1 columna; escritorio: 2 columnas de tarjetas; botón «+ Nuevo presupuesto» en cabecera (icono en móvil, `aria-label`).

Copy: «Presupuestos» · «+ Nuevo presupuesto» · «Todas las categorías tienen presupuesto» (ayuda del botón deshabilitado) · «Presupuesto total» · «Gastado {x} de {y}» · «Te quedan {r}» · «Has superado el presupuesto en {e}» · «Editar» · «Eliminar» · «¿Eliminar el presupuesto de {categoría}?» · «¿Eliminar el presupuesto total?» · «Nuevo presupuesto» · «Editar presupuesto» · «Categoría» · «Total mensual» · «Límite mensual» · «Se aplica a todos los meses» · «Aún no tienes presupuestos» · «Fija un límite mensual por categoría y verás cuánto te queda» · «Crear presupuesto» · «Ya existe un presupuesto para esta categoría» · errores de importe: los de §4.4 («Introduce un importe mayor que 0», etc.) · toasts «Presupuesto guardado» · «Presupuesto eliminado» · (P1-18: «Sin presupuesto» · «{x} este mes» · «Añadir»).

### 7.5 Informes
Móvil: tarjetas apiladas, gráficos de 240 px de alto. Escritorio: donut y barras lado a lado; tabla bajo las barras. Pantalla cargada con `React.lazy` dentro de `ErrorBoundary` (Recharts ~150 kB gz no penaliza el alta diaria).

| Gráfico | Recharts | Datos | Qué aprende el usuario |
|---|---|---|---|
| Gastos por categoría | `PieChart` + `Pie` (innerRadius 60 %, outerRadius 90 %), `Cell` por fila con `--series-1..8` por **posición** (la 9.ª/«Otras» = `--series-other`), `Tooltip` es-ES, sin `Legend` de Recharts (leyenda HTML propia) | `foldOthers(expensesByCategory(txs, cats, month))` | «¿En qué se me va el dinero este mes?» |
| Ingresos frente a gastos | `BarChart` con dos `Bar` (`--series-income`, `--series-expense`), `XAxis` `formatShortMonth`, `YAxis` con `formatCompactCents` («1,2 mil €»), `CartesianGrid` con `--color-grid`, `Tooltip` con `formatCents` | `monthlyTrend(txs, month, 6)` (12 es P1-19) | «¿Gasto más de lo que ingreso? ¿Voy a mejor?» |

Colores del donut: la leyenda HTML y las `Cell` usan el **MISMO** color: el slot posicional `--series-{i+1}` (i = índice de la fila en el array plegado) y `--series-other` para la fila `isOthers`; `CategoryTotal.color` **NO** se usa en Informes, solo en `CategoryBadge` (Movimientos, Inicio, Categorías). El orden de filas es el de `expensesByCategory` (importe desc), por lo que la misma categoría puede cambiar de color entre meses; aceptado y documentado (evita que dos categorías con el mismo `ColorKey`, p. ej. Alimentación y Educación, sean indistinguibles en el donut).

Copy: «Informes» · «Gastos por categoría» · «Otras» · «Aún no hay gastos en este mes» · «Ingresos frente a gastos» · «Aún no hay datos para este periodo» · tabla «Mes · Ingresos · Gastos · Balance» · `aria-label` del gráfico «Gastos de {mes}: {x}; ingresos: {y}» · (P1-19: «6 meses» · «12 meses» · «Resumen del mes» · «Gasto medio por día» · «Día con más gasto» · «Movimientos»).

### 7.6 Categorías
Pestañas «Gastos | Ingresos»; lista `<ul>` de filas. La fila de categoría NO es un botón: es un `<li>` con badge, nombre, «{n} movimientos» y un botón de icono «Editar» (`aria-label` «Editar {nombre}»); en P1-17 se añaden a la misma fila los botones de icono «Subir» y «Bajar». Solo «Editar» abre la hoja. Botón «+ Nueva categoría». Hoja con Nombre, Icono (rejilla de 40), Color (9 muestras), Tipo (segmento, deshabilitado en edición); en edición «Eliminar» (oculto en `builtIn` con ayuda «Esta categoría no se puede eliminar»).

Copy: «Categorías» · «Gastos» · «Ingresos» · «+ Nueva categoría» · «{n} movimientos» · «Editar {nombre}» · (P1-17: «Subir» · «Bajar») · «Nueva categoría» · «Editar categoría» · «Nombre» · «Icono» · «Color» · «Tipo» · «Guardar» · «Eliminar» · «¿Eliminar la categoría {nombre}?» · «Sus {n} movimientos pasarán a "{otros}". Se eliminará también su presupuesto.» · «Esta categoría no se puede eliminar» · «El nombre es obligatorio» · «Máximo 30 caracteres» · «Ya existe una categoría con ese nombre» · toasts «Categoría guardada» · «Categoría eliminada» · nombres de color para `aria-label`: «Azul · Naranja · Verde azulado · Ámbar · Rosa · Verde · Violeta · Rojo · Gris».

### 7.7 Ajustes
Una pantalla con secciones: General → Organización (móvil) → Copia de seguridad → Zona peligrosa → pie.

«Saldo inicial»: campo `AmountInput` con `allowZero`/`allowNegative`; se despacha `settings/update { initialBalanceCents }` al perder el foco o al pulsar Enter si el parseo es válido; si es inválido se muestra el error en línea (§4.4) y no se despacha; el valor mostrado se re-sincroniza desde el snapshot tras guardar (nunca se despacha por pulsación de tecla).

«Importar copia»: bajo la vista previa («Se importarán …») se listan los avisos de normalización de `preview.warnings` (§4.4) como «Se han ajustado {n} elementos: …»; los archivos > 10 MB se rechazan por `File.size` antes de leerlos (`too-large`).

Copy: «Ajustes» · «General» · «Moneda» · «Solo cambia el formato; los importes no se convierten» · «Tema» · «Sistema» · «Claro» · «Oscuro» · «Saldo inicial» · «Saldo con el que empiezas a contar» · «Organización» · «Categorías» · «Copia de seguridad» · «Exportar copia (JSON)» · «Importar copia» · «Se importarán {n} movimientos, {m} categorías y {k} presupuestos» · «Se han ajustado {n} elementos: {lista}» · «¿Reemplazar los datos actuales?» · «Reemplazar» · «El archivo no es un JSON válido» · «El archivo es de una versión más nueva de la app» · «El archivo no es una copia válida de Mis Finanzas» · «El archivo es demasiado grande» · «Datos importados correctamente» · «Copia exportada» · «Zona peligrosa» · «Borrar todos los datos» · «Esta acción no se puede deshacer. Escribe BORRAR para confirmar» · «Borrar» · «Datos borrados» · «Mis Finanzas v1» · «Tus datos se guardan solo en este navegador» · «Uso: {x} de ~5 MB» ({x} = `formatBytes` de la suma de ambas claves, F10) · «Volver» (`aria-label` del «‹» de la cabecera móvil, §7.0).

---

## 8. Diseño visual

### 8.1 Tokens (`src/styles/tokens.css`, ya existente — se usa tal cual)
- Superficies/tinta: `--color-page`, `--color-surface`, `--color-surface-2`, `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-border-strong`, `--color-grid`, `--color-overlay`.
- Acción: `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-on-accent`.
- **Semántica de dinero**: ingreso `--color-income` (verde, texto) / `--color-income-soft`; gasto `--color-expense` (rojo) / `--color-expense-soft`; neutro `--color-text`. Series de gráfico `--series-income`, `--series-expense`.
- Estado (barras de presupuesto): `ok` → `--color-accent`, `warning` → `--color-warning`, `over` → `--color-critical`. Nunca se usan como series.
- Categóricos: `--series-1..8`, `--series-other`; mapa `ColorKey → token`: blue→1, orange→2, teal→3, amber→4, pink→5, green→6, violet→7, red→8, gray→other.
- Tipografía: `--font-sans`, `--font-size-xs..3xl`, `--line-height`. Importes grandes con `font-variant-numeric: tabular-nums`.
- Espaciado `--space-1..10`; radios `--radius-sm/md/lg/pill`; sombras `--shadow-sm/md/lg`; `--focus-ring`; `--transition-fast/base`; layout `--layout-max-width`, `--sidebar-width`, `--tabbar-height`, `--gutter`.
- Modo oscuro: definido bajo `@media (prefers-color-scheme: dark)` con guarda `:root:not([data-theme="light"])` y de nuevo bajo `:root[data-theme="dark"]`; `body { background: var(--color-page); color: var(--color-text) }` explícito. `index.css` del template se **sustituye** por completo (su `#root` centrado de 1126 px rompería el móvil).

### 8.2 Reglas de accesibilidad
- Foco visible siempre: `:focus-visible { box-shadow: var(--focus-ring); outline: none }`; nunca `outline: 0` sin sustituto.
- Cada `<input>`/`<select>` con `<label for>`; errores con `aria-describedby` y `aria-invalid`.
- Botones de icono con `aria-label` (FAB, ‹ ›, ×, «Volver», «Editar {nombre}», ⚙, quitar filtro, limpiar búsqueda).
- Controles custom hechos con elementos nativos: segmentos = `<fieldset>` de `<input type="radio">`; chips = `<button aria-pressed>`; tiles de categoría = `<button aria-pressed>` dentro de `role="group"` etiquetado; filas de lista = `<button>` o `<a>` **solo cuando no contienen otros controles**. Nunca botones dentro de botones: las filas de Movimientos sí son `<button>` porque no contienen otros controles; las filas de Categorías son `<li>` con botones de icono dentro (§7.6).
- Diálogos con `<dialog>.showModal()` (trampa de foco nativa, Escape), `aria-labelledby` al título; al cerrar, el foco vuelve al disparador.
- Contraste ≥ 4.5:1 para texto (los tokens de ingreso/gasto están elegidos para ello en ambos temas); el color nunca es el único canal: los importes llevan signo, las barras llevan texto de estado.
- Gráficos: `role="img"` + `aria-label` resumen, y tabla/lista HTML equivalente debajo.
- `@media (prefers-reduced-motion: reduce)` pone transiciones a 0 (ya en tokens) y desactiva la animación de entrada de hojas.
- Objetivos ≥ 44 × 44 px; texto base 16 px en móvil (evita zoom automático de iOS en inputs).

---

## 9. Casos límite (consolidados)

**Importes**
- Tabla de `parseAmount` (§4.1): `12`→1200, `12,5`→1250, `12.5`→1250, `12,50`→1250, `1.234,56`→123456, `1,234.56`→123456, `1.234`→123400, `1.234.567`→123456700, `0,07`→7, `,5`→50, `  12,50 € `→1250, `+12`→1200, `12 USD`→1200, `$12`→1200, `US$12`→1200, `12 £`→1200, `000000000012`→1200; `''`/`'   '`→empty; `0`/`0,00`→zero; `-5`→negative; `12,505`→too-many-decimals; `1.2,3`, `1,2,3`, `12a`, `12 usd`, `12 eur`, `€12€`, `1..2`, `1e3`→invalid; `1000000000`→too-large; `999999999,99`→ok.
- Round-trip: `parseAmount(formatAmountInput(c)) === c` y `parseAmount(formatCentsPlain(c), { allowNegative: true }) === c` para 1, 10, 99, 100, 123456, MAX_CENTS y los mismos 10.000 valores pseudoaleatorios (LCG sembrado en `src/test/prng.ts`).
- Signo: todo negativo visible usa U+2212 (`formatCents(-5, 'EUR')` contiene «−»); `formatCents(0, 'EUR', { signDisplay: 'exceptZero' }) = '0,00 €'`; `formatCents(1, 'XXX')` no lanza (reintento con EUR).
- Sumas solo con enteros; ratios y porcentajes son los únicos floats y nunca se persisten. Intl puede emitir NBSP o narrow NBSP: los tests normalizan `\s`.
- Importe de −1.234.567,89 € en una fila de 360 px no debe partir línea (`white-space: nowrap`, columna de texto con `min-width: 0` y `text-overflow: ellipsis`).
- El input conserva el texto crudo mientras se escribe; se normaliza solo al guardar (no pelea con el teclado); el teclado móvil puede ofrecer `,` o `.` según SO: ambos válidos.

**Fechas**
- `todayLocal` a las 23:50 en Europe/Madrid (UTC+2) y a las 00:30 en Pacific/Kiritimati devuelve el día local (`npm run test:tz`, §11.1: el propio `dates.test.ts` fija `process.env.TZ` en su primera línea).
- Límites de mes: `transactionsInMonth`/`summarizeMonth` incluyen `2026-09-01` y `2026-09-30` en `2026-09` y excluyen `2026-08-31` y `2026-10-01`; `monthlyTrend(txs, '2026-02', 12)` empieza en `'2025-03'`; `formatDayHeader('2025-12-31', '2026-01-01') = 'Ayer'`; `daysElapsed` cuando `today` es el último día = `daysInMonth`.
- `2025-02-29`, `2025-04-31`, `2026-9-3` inválidas; `2024-02-29` válida. `daysInMonth`: feb 2024 = 29, feb 2100 = 28, feb 2000 = 29.
- `addMonths('2026-01', −1) = '2025-12'`, `('2026-12', 1) = '2027-01'`; `lastNMonths` cruza años; `addDays` en cambios de horario (último domingo de marzo/octubre) no salta días.
- Meses futuros navegables; «Hoy» siempre vuelve al mes actual; movimientos futuros permitidos: cuentan en su mes y en presupuestos de ese mes, pero no en «Saldo total» (sufijo explicativo).
- Editar la fecha de un movimiento a otro mes lo mueve entre vistas y ambos resúmenes cambian.

**KPI y agregaciones**
- Mes vacío: totales 0, sin división por cero (`percent` 0), donut vacío con estado vacío, barras a cero; mes con solo ingresos: donut vacío pero barras pobladas.
- `daysElapsed` = 0 (mes futuro) → media y proyección `null` («—»); día 1 → proyección = gasto pasado × días (se etiqueta «día 1 de 30»); último día sin futuros → proyección = gasto real.
- Futuros en el mes en curso: día 10 de 30 con 100 € pasados y 800 € futuros → proyección 300,00 €, media 10,00 €, `futureExpenseCents` 80000, sufijo «(sin contar 1 futuro)»; el total del mes y los presupuestos sí incluyen los 800 €.
- `topDay` con empate (dos días con el mismo gasto máximo) → la fecha más antigua.
- Redondeo half-up entero: 1001/2 → 501; proyección 1234 céntimos día 10 de 31 → 3825.
- Resto mayor: `[1,1,1]` → 34/33/33; una sola categoría → 100. `foldOthers` con ≤ 8 filas y todas ≥ 3 % las devuelve igual; con 9+ filas devuelve como máximo 8 nombradas + «Otras» (`categoryId: null`, `isOthers: true`); si todas < 3 % conserva las 8 primeras; «Otras» recibe `--series-other` sea cual sea su composición y su fila de leyenda no es interactiva.
- Ventana de 12 meses anterior al primer movimiento: ceros.
- Presupuesto: 0 % → «Te quedan {límite}»; exactamente 100 % → `warning` y «Te quedan 0,00 €»; > 100 % barra recortada visualmente; total y por categoría son independientes; a lo sumo un total (upsert reemplaza).

**Categorías**
- Unicidad sin mayúsculas ni acentos («Ocio», «ocio», «Ócio» colisionan); renombrar a su propio nombre permitido; nombre vacío o > 30 rechazado.
- `builtIn` no se eliminan ni cambian de tipo; reordenar en los extremos es no-op (P1-17); `category/add` nunca crea una `builtIn` ni rompe la contigüidad de `sortOrder`; al eliminar, los movimientos van a la `builtIn` del tipo con `updatedAt` nuevo y el presupuesto desaparece; si era `lastUsedCategoryId` se pone a `null`.
- Cambiar el tipo de un movimiento exige categoría del nuevo tipo (UI resetea, reducer rechaza `category-type-mismatch`).
- Tile con nombre de 2 líneas: altura fija y `line-clamp: 2`.

**Búsqueda y filtros**
- NFD sin diacríticos, minúsculas, `trim`; consulta vacía = sin búsqueda; coincide en nota **y** nombre de categoría; combina con tipo y categoría; los filtros se reinician al cambiar de pantalla; el chip de categoría llega desde el drilldown con el mes ya fijado.

**Persistencia**
- `localStorage` lanza al acceder (privado/bloqueado) o `getItem` lanza → repositorio en memoria + banner «no disponible»; la sonda de escritura que lanza `QuotaExceededError` (name, code 22, code 1014) **no** convierte la carga en `unavailable`: los datos se leen y se muestra el banner de cuota; un guardado que lanza por cuota → estado en memoria + banner; el siguiente guardado correcto limpia el error. El `setItem` del backup es best-effort y no decide el resultado.
- JSON truncado, `app` distinto, `data` no objeto, `transactions` no array, importe `12.5`/`'1250'`/`-3`, fecha inválida → `corrupt`; el payload original **no se toca**; backup ofrecido si existe; si la copia tampoco se puede leer, se avisa y se oculta el botón.
- `schemaVersion` mayor que la actual → `newer`; `schemaVersion` 0, `1.5` o `'1'` → `corrupt` (falla `isPersistedEnvelope`); nunca se guarda encima (store `readonly`).
- Migración que lanza a mitad de cadena → `corrupt`. `load()` nunca escribe; tras una carga con `migratedFrom !== null` el store llama a `save`, cuya secuencia normal copia el payload ORIGINAL (pre-migración) a backup antes de escribir la versión nueva.
- Guardado exactamente una vez por acción aceptada, también bajo `StrictMode`; acción rechazada → ni guarda ni notifica; en `mode: 'readonly'` un dispatch reduce y notifica pero no guarda; `getSnapshot` devuelve la misma referencia entre dispatches (requisito de `useSyncExternalStore`; test que renderiza 100 veces sin dispatch).
- Dos pestañas: gana la última en escribir (documentado; sync es P1-10). `pagehide`/bfcache: nada que hacer porque el guardado es síncrono.
- `data/reset` normal («Borrar todos los datos») escribe el estado previo en `mis-finanzas:backup` (último recurso); la recuperación desde `corrupt` (`recover('restore-backup' | 'reset')`) **nunca** toca el backup (`skipBackup`).

**Import/export**
- Importar reemplaza también ajustes; `parseImport(exportJson(d, now))` es deep-equal a `d` con `warnings: []`; ids duplicados en el archivo → `invalid-data`; `categoryId` inexistente o de otro tipo → builtIn del tipo con aviso en `preview.warnings`; nota > 140 → recortada (aviso); `currency` desconocida → `EUR` (aviso); tabla completa en §4.4. Archivo > 10 MB → `too-large` antes de leer.
- (P1-16) CSV: BOM presente, `;`, CRLF, notas con `;`/comillas entrecomilladas y comillas dobladas, notas que empiezan por `= + - @` con `'` delante; importes `1234,56` sin agrupación; Excel es-ES lo abre en columnas.
- Descargas vía `Blob` + `<a download>` con `URL.revokeObjectURL` diferido; Safari iOS abre en pestaña nueva (aceptado). En jsdom `URL.createObjectURL`/`revokeObjectURL` y `HTMLAnchorElement.prototype.click` se stubean en `setup.ts`.

**UI y entorno**
- Pulsar el FAB con una hoja abierta se ignora (`sheet/open` con hoja abierta se ignora; la pila de hojas es P1-15); al eliminar el movimiento abierto o hacer `data/reset`, la hoja se cierra.
- `month/shift` no sale de `MIN_MONTH`…`MAX_MONTH`; en el límite el botón se deshabilita.
- En móvil, Ajustes y Categorías se abandonan con «Volver» (§7.0); `previousScreen` lo fija `nav`.
- `<input type="date">` varía por navegador; los chips Hoy/Ayer cubren el 90 % de los casos.
- jsdom: `HTMLDialogElement.showModal/close` se polyfillan en `setup.ts`; `ResizeObserver` y `matchMedia` se stubean; los gráficos se renderizan con `size` fijo (sin `ResponsiveContainer`) en tests y solo se comprueba la tabla/leyenda HTML.
- `crypto.randomUUID` ausente en `http://` no seguro → fallback con `getRandomValues`; 100k ids únicos en test.
- Recharts se carga con `React.lazy` en Informes: si el chunk falla, `ErrorBoundary` muestra «No se ha podido cargar el informe» con «Reintentar».

---

## 10. Plan de pruebas

Determinismo: `today`, `now` y `makeId` siempre son parámetros; sin timers falsos en dominio (los componentes con debounce/toast sí los usan, §10.2). Objetivo de cobertura (`@vitest/coverage-v8`, ya instalado): ≥ 95 % líneas en `src/domain/**`, sin umbral por archivo; sin umbral en `src/ui`. `npm run check` ejecuta además `npm run test:tz` (§11.1). Todo criterio numérico se calcula sobre el fixture §3.7 con `today = 2026-09-25`.

### 10.1 Unit (Vitest, `src/domain/**/*.test.ts`)
| Módulo | Casos |
|---|---|
| `money.test.ts` | Tabla completa de §9 «Importes» (válidos, cada error, opciones `allowZero`/`allowNegative`, filas de código de moneda `12 USD`/`$12`/`US$12`/`12 usd`/`12 eur`, ceros a la izquierda `000000000012`); `formatCents` EUR/USD para 0, 5, 100, 123456, −123456, MAX (normalizando NBSP); `formatCents(-5,'EUR')` contiene U+2212; `formatCents(0,'EUR',{signDisplay:'exceptZero'}) = '0,00 €'`; moneda `'XXX'` no lanza; `formatSigned` signo por tipo; `formatCentsPlain(-5) = '-0,05'`; round-trip `parseAmount(formatAmountInput(c))` **y** `parseAmount(formatCentsPlain(c), {allowNegative:true})` para los mismos 10.000 valores; `formatCompactCents` y `formatBytes` para 0, 1234, 1_250_000; `largestRemainderPercents` ([1,1,1], [], [0,0], [5]); guardián: `grep` de `parseFloat|toFixed|toISOString\(|new Date\('` en todo `src/` (incluidos `ui` y `test`) excepto `src/domain/dates.ts` y `e2e/`, sin coincidencias. |
| `dates.test.ts` | Primera línea del archivo: `process.env.TZ = 'Pacific/Kiritimati'` antes de crear ningún `Date` (multiplataforma, sin `cross-env`); `todayLocal` con `Date(2026, 8, 25, 23, 50)` y `Date(2026, 0, 1, 0, 30)`; `isLocalDate` válidas/inválidas; `daysInMonth` bisiestos (2024, 2100, 2000); `addMonths` cruces de año; `addDays` en DST; `lastNMonths('2026-09', 6)` y `lastNMonths('2026-02', 12)` empieza en `'2025-03'`; `formatMonthLabel('2026-09') = 'septiembre 2026'`; `formatDayHeader` Hoy/Ayer/otro y «Ayer» cruzando el año (`today = '2026-01-01'`, `d = '2025-12-31'`); `compareDates`. |
| `ids.test.ts` | Usa `randomUUID` si existe; fallback si se elimina; regex v4; 100k únicos. |
| `text.test.ts` | `normalizeText('  Café ') = 'cafe'`, `'Ócio' = 'ocio'`, `'Ñandú' = 'nandu'`, vacío. |
| `seed.test.ts` | 11 + 4 categorías, ids únicos, exactamente una `builtIn` por tipo, `sortOrder` contiguo, emojis en `EMOJI_CHOICES`, `DEFAULT_SETTINGS` válido; `seedData` pasa `assertInvariants`. |
| `validate.test.ts` | Validadores de formulario (cada mensaje); `validateAppData` asserta **cada fila** de la tabla «Normalización vs rechazo» de §4.4: RECHAZA (null, [], string, `transactions`/`categories`/`budgets` no array, elemento de `transactions` no objeto, importe float/string/negativo/0/> MAX, fecha inválida, `type` desconocido, `id` no string/vacío/duplicado en cada colección, falta `categoryId`); NORMALIZA con aviso (categoría con `type` inválido → descartada y sus movimientos a builtIn; `color` inválido → `gray`; `icon` fuera de `EMOJI_CHOICES` → 📦; nombre vacío → `Categoría {n}` y > 30 recortado; colisión de nombres → « (2)»; `sortOrder` no entero/duplicado → renumerado; `categoryId` inexistente **y** de otro tipo → builtIn del tipo del movimiento; nota > 140 recortada; presupuesto duplicado/de ingreso/`limitCents` ≤ 0 → descartado; settings parciales → defaults por campo; faltan builtIn → recreadas; campos extra descartados sin aviso); `warnings.length` coincide con el número de ajustes; todo resultado `ok` pasa `assertInvariants`. |
| `reducer.test.ts` | Cada `Action` camino feliz; cada `ReducerError`; inmutabilidad (entrada congelada); no-op devuelve misma referencia; `lastUsedCategoryId` se actualiza; `category/add` asigna `sortOrder = max + 1` y `builtIn = false`, rechaza `icon` fuera de `EMOJI_CHOICES` (`invalid-icon`) y `color` fuera de `ColorKey` (`invalid-color`); `category/update` con icono/color inválidos; `category/remove` reasigna N movimientos, borra presupuesto y limpia `lastUsed`; `builtIn` rechazado; `transaction/update` con cambio de tipo exige categoría del tipo; unicidad de nombre sin acentos; `budget/upsert` duplicado/ingreso/0; `settings/update` inválidos; `data/reset` resiembra. (`category/move` en extremos: P1-17.) |
| `queries.test.ts` | Fixture §3.7 (12 movimientos en 3 meses, `today = '2026-09-25'`): `summarizeMonth` con las cifras de §3.7 (y mes vacío), límites de mes (`2026-08-31`/`2026-09-01` y `2026-09-30`/`2026-10-01`), `monthlyTrend` orden y ceros (y ventana que cruza año: end `'2026-02'`, n 12 → empieza `'2025-03'`), `sortTransactions` desempates, `groupByDay`, `filterTransactions` (acentos `cafe` → solo `t-10`, tipo, categoría, combinados, vacío), `expensesByCategory` orden y `percent` 71/13/10/6 = 100, `foldOthers` (9 → 8 + «Otras» con `categoryId: null`/`isOthers: true`; 8; 0 filas; todas < 3 %), `totalBalance` = 147930 con `futureCount` 1, `monthKpis` (futuro/actual/pasado, día 1, último día como `today`, redondeo, `futureExpenseCents` 5000 y proyección 95184, caso «día 10/30 con 100 € pasados y 800 € futuros → proyección 30000, media 1000», `topDay` y su empate → fecha más antigua), `budgetProgress` en 0,79/0,80/1,00/1,01, total primero y fixture (`b-total` warning, `b-ocio` over), `categoriesWithoutBudget` (P1-18, firma), `countTransactionsByCategory`, `recentTransactions`. |
| `csv.test.ts` | (P1-16) BOM, cabecera, `;`, CRLF, entrecomillado, comillas dobladas, guardia de fórmulas, importes planos, `Tipo` en español, orden; conjunto vacío → solo cabecera. |
| `storage/migrations.test.ts` | Runner con cadena sintética 0→1→2; salto ausente → error; versión mayor → `newer`; contigüidad de `MIGRATIONS` y `MIGRATIONS.length === SCHEMA_VERSION − 1`; `schemaVersion` 0, 1.5, `'1'` → `corrupt`/`not-an-envelope`; cada `__fixtures__/v*.json` migra y valida; fixture v1 con campos extra migra, valida y los descarta. |
| `storage/jsonio.test.ts` | `exportJson(data, now)` forma, pretty-print y `savedAt === now`; `parseImport` en cada `ImportError` (salvo `too-large`, que es de la UI); round-trip deep-equal con `warnings: []`; `preview` cuenta bien y trae `warnings` cuando hay normalización. |
| `storage/localStorageRepository.test.ts` | Con `localStorage` real de jsdom y con un `Storage` falso que lanza: `load` empty/ok/corrupt/newer/unavailable y nunca escribe; `probeWrite` → `ok` / `quota` (con `QuotaExceededError`, sin que `load` deje de ser `ok`) / `unavailable`; `save` escribe backup antes de sobrescribir; `save` con `skipBackup` no toca el backup; backup que lanza por cuota no impide la escritura principal; `restoreBackup`; clasificación `QuotaExceededError` (name, code 22, 1014), `SecurityError`, storage `undefined`; `estimateBytes` suma ambas claves; `clear` conserva backup. |
| `storage/store.test.ts` | Arranque vacío → siembra y guarda; dispatch aceptado guarda **una** vez antes de notificar (orden con spy) y pasa `deps.now()` a `save`; rechazado no guarda ni notifica; `getSnapshot` estable; fallo de guardado mantiene estado y fija `persistence.error`; éxito posterior lo limpia; carga migrada re-guarda; carga `corrupt`/`newer` → `mode: 'readonly'`; **dispatch en readonly no guarda**; **recuperación desde corrupt no sobrescribe backup** (`recover('restore-backup')` y `recover('reset')` llaman a `save` con `skipBackup` y el backup sigue igual); `recover('restore-backup')` con backup ilegible mantiene readonly y fija `backupUnreadable`; `reloadFromStorage`. |
| `ui/state/uiReducer.test.ts` | nav resetea filtros y fija `previousScreen`, `month/shift` cruza años y no pasa de los límites `MIN_MONTH`/`MAX_MONTH`, `sheet/open` con hoja abierta se ignora, toast reemplaza. |

### 10.2 Componentes (Vitest + Testing Library + user-event, `src/ui/**/*.test.tsx`)
`renderApp({ data, today })` monta `<App store today>` con `memoryRepository` sembrado (por defecto con el fixture §3.7 y `today = '2026-09-25'`). Consultas por rol y texto en español (`getByRole('button', { name: 'Guardar' })`). Los tests de componentes con debounce/toast usan `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(ms))` (150 ms para la búsqueda, 4 s para el toast).
- **App.test.tsx** (existente, reescrito sobre `renderApp()`): sigue afirmando `getByRole('heading', { name: /mis finanzas/i })` (el `<h1>` de §7.0).
- **TransactionSheet**: foco inicial en Importe; escribir `12,50` muestra «= 12,50 €»; cada mensaje de error deshabilita Guardar; `Enter` envía; cambiar a Ingreso cambia la rejilla; edición prerrellena `1234,56`; eliminar de dos pasos; Escape cierra sin guardar. («+ Nueva» es P1-15.)
- **Flujo alta**: `+` → `12,50` → Guardar en 3 interacciones → fila «−12,50 €» en Movimientos y hero de Inicio actualizado.
- **TransactionsView**: búsqueda con acentos (tras avanzar 150 ms), «×» «Limpiar búsqueda» despacha inmediatamente, chips de tipo, chip de categoría desde drilldown, «Limpiar filtros», estados vacíos, selector de mes y «Hoy».
- **HomeView**: cifras del fixture §3.7 (balance +356,80 €, saldo total 1.479,30 €, sufijo de futuros, KPI 31,73 € / 951,84 € con sufijo, KPI «—» en mes futuro), sección de presupuestos (total primero, luego Ocio), estado de primer uso.
- **BudgetsView/BudgetSheet**: textos de estado por ratio, select sin «Total mensual» cuando ya existe total, botón deshabilitado sin opciones, duplicado rechazado, eliminar con confirmación. («Sin presupuesto» es P1-18.)
- **CategoriesView/CategorySheet**: filas `<li>` sin rol de botón, crear, renombrar con colisión, eliminar con reasignación (texto con N) y builtIn sin botón. (Reordenar es P1-17.)
- **SettingsView**: cambiar moneda reformatea; tema fija `data-theme`; saldo inicial negativo se guarda al perder el foco; saldo inicial inválido no despacha y muestra el error; import con `File` válido / JSON inválido / versión mayor / no envelope / > 10 MB (`too-large`) / con avisos (lista visible); exportar llama a los stubs de `createObjectURL` y `click`; BORRAR habilita el botón.
- **RecoveryView / Banners**: `corrupt` con y sin backup, backup ilegible («La copia automática tampoco se puede leer» y botón oculto), `newer`, `quota`, `unavailable`.
- **Charts**: `ExpenseDonut` y `IncomeExpenseBars` con `size` fijo: existe la tabla/leyenda con las cifras; nada de SVG salvo una aserción: el swatch de leyenda i tiene la misma variable (`--series-{i+1}` / `--series-other`) que la `Cell` i.
- **Shell**: `useMediaQuery` mockeado → tab bar vs sidebar; FAB abre hoja; «Volver» desde Ajustes regresa a la pantalla anterior (y a Inicio si no hay anterior); en Ajustes/Categorías ningún slot tiene `aria-current`. (Atajo `n` es P1-11.)

### 10.3 E2E (Playwright, `e2e/*.spec.ts`, proyectos `chromium` y `mobile`)
Estado sembrado con `page.addInitScript` escribiendo el envelope v1 (§3.7) en `localStorage` antes de `goto`. **Reloj fijo obligatorio**: todo spec que siembre el fixture (3, 4, 5, 6) o cuya aserción dependa del día («Hoy», «Ayer», KPI, «futuro», selector de mes) llama `fixedClock(page, '2026-09-25T12:00:00')` (hora local `Europe/Madrid`, la del proyecto) **ANTES** de `goto`; `fixedClock` reemplaza `Date` mediante `page.clock.setFixedTime` de Playwright (≥ 1.45), no un wrapper manual. Sin reloj fijo los criterios de §2.1 dejarían de cumplirse en cuanto el calendario real pase de 2026-09 (o cualquier día ≠ 25).
1. `quick-add.spec.ts`: app vacía → `+` → `12,50` → Guardar → fila «−12,50 €» y «Gastos 12,50 €» → `reload` → persiste; clave `mis-finanzas` presente.
2. `edit-delete.spec.ts`: abrir fila → cambiar a `20` → «Guardar cambios» → «−20,00 €»; Eliminar → «Sí, eliminar» → fila desaparece y totales bajan → `reload` persiste.
3. `month-and-budget.spec.ts`: fixture §3.7 + reloj fijo; totales por mes con ‹ › (cifras de F3); «Hoy»; Presupuestos en septiembre muestra `b-ocio` «Has superado el presupuesto en 10,00 €» y el total «Te quedan 156,80 €»; crear presupuesto Alimentación 200 € → tarjeta «Te quedan 116,80 €»; Inicio muestra total primero y luego Ocio (2 filas) y «Saldo total 1.479,30 €».
4. `reports.spec.ts`: fixture + reloj fijo; tabla de 6 filas con las cifras de F7; leyenda del donut con 4 filas → clic en «Ocio» → Movimientos filtrado por Ocio en septiembre (1 fila).
5. `categories.spec.ts`: fixture + reloj fijo; crear «Mascotas», usarla, eliminarla → movimiento en «Otros gastos».
6. `backup.spec.ts`: fixture + reloj fijo; «Exportar copia (JSON)» (`waitForEvent('download')`, leer archivo) → Borrar todo (BORRAR) → Importar el archivo (`setInputFiles`) → «Reemplazar» → mismas filas y un segundo export deep-equal **estricto** al primero (mismo `savedAt` por el reloj fijo). (La parte «Exportar CSV» → BOM + `Fecha;Tipo;Categoría;Importe;Nota;Id` es P1-16.)
7. `recovery.spec.ts`: `localStorage['mis-finanzas'] = '{bad'` con backup válido en `mis-finanzas:backup` → tarjeta de recuperación y «Descargar datos en bruto»; «Restaurar copia automática» → la app carga el backup y `mis-finanzas:backup` no ha cambiado; `Storage.prototype.setItem` lanza `QuotaExceededError` tras N llamadas → banner visible y el movimiento sigue en pantalla.
8. `mobile.spec.ts` (solo `mobile`): tab bar y FAB visibles; hoja se abre; `page.setViewportSize({ width: 360, height: 740 })` y después `document.scrollingElement.scrollWidth <= 360`; además `scrollWidth <= innerWidth` en el viewport por defecto del Pixel 7 (412 px); objetivos ≥ 44 px; `emulateMedia({ colorScheme: 'dark' })` cambia el `background-color` de `body`; «Volver» desde Ajustes; flujo de alta solo con teclado (`page.keyboard`).
9. `smoke.spec.ts` existente se mantiene (el `<h1>` «Mis Finanzas» siempre existe, §7.0).

---

## 11. Criterios de «hecho»

1. `npm run check` en verde; `npm run test:e2e` en verde en los dos proyectos; CI de `.github/workflows/ci.yml` en verde. Se añaden a `package.json` los scripts `"test:tz": "vitest run src/domain/dates.test.ts"` (el propio test fija `process.env.TZ = 'Pacific/Kiritimati'` en su primera línea, antes de crear ningún `Date`, para ser multiplataforma; sin `TZ=` inline ni `cross-env`) y `"test:coverage": "vitest run --coverage"`; `check` pasa a `npm run typecheck && npm run lint && npm run test && npm run test:tz && npm run build`; `vite.config.ts` recibe `test.coverage = { provider: 'v8', include: ['src/domain/**'], thresholds: { lines: 95 } }`; `ci.yml` añade los pasos `npm run test:tz` y `npm run test:coverage`. Modificar scripts y configuración está permitido por §11.11 (no se añade ninguna dependencia: `@vitest/coverage-v8` ya está instalado).
2. Cobertura ≥ 95 % líneas en `src/domain/**`, sin umbral por archivo (`test:coverage` falla por debajo).
3. Todas las funcionalidades P0 (F1–F11) cumplen sus criterios de aceptación, calculados sobre el fixture §3.7 con reloj fijo; ninguna P1 es necesaria para usar la app.
4. Ninguna aparición de `parseFloat`, `toFixed`, `toISOString(`, `new Date('` en todo `src/` (incluidos `ui` y `test`) excepto `src/domain/dates.ts` y `e2e/` (test-guardián) y ningún `enum` ni parameter property en `src/`.
5. A 360 × 740 px: sin scroll horizontal, barra inferior + FAB, hojas inferiores, importes sin salto de línea; a 1280 px: barra lateral y contenido centrado.
6. Modo claro y oscuro completos vía tokens, `body` con fondo explícito, selector de tema funcional, `prefers-reduced-motion` respetado.
7. Navegación completa con teclado (añadir, editar, eliminar, cambiar mes, importar) y lectores de pantalla: labels, `aria-label` en iconos, `aria-live` en toasts, diálogos con trampa de foco, tabla bajo cada gráfico, sin botones anidados. Revisión manual con Lighthouse antes de entregar (no bloqueante); las comprobaciones automáticas son las de §10.3.
8. Persistencia robusta demostrada por tests: guardado único por acción, backup previo, recuperación de corrupto sin tocar el backup, versión más reciente no sobrescrita (store `readonly`), quota y modo privado con banner.
9. Exportar → borrar → importar restaura exactamente los datos (deep-equal estricto con reloj fijo). (CSV en Excel es-ES: P1-16.)
10. Todo el copy visible está en `src/ui/copy.ts` y coincide con este documento; no queda texto del template de Vite.
11. Sin dependencias nuevas en `package.json`.
