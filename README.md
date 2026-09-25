# Mis Finanzas

Aplicación web para llevar el control de tus gastos y finanzas personales. Funciona íntegramente en tu navegador: no hay servidor, ni cuentas, ni red. Tus datos se guardan en `localStorage` y puedes exportarlos e importarlos en un toque.

## Qué puedes hacer

- **Registrar un gasto en 3 toques**: «+» → importe → Guardar. El tipo (gasto), la fecha (hoy) y la última categoría usada vienen prerrellenados. Los importes se escriben como en España (`12,50`, `1.234,56`) y se guardan en céntimos enteros, nunca en decimales flotantes.
- **Movimientos**: lista mensual agrupada por día, búsqueda sin acentos, filtros por tipo y categoría, edición y eliminación con confirmación.
- **Inicio**: balance del mes, ingresos, gastos, saldo total, gasto medio por día, proyección a fin de mes, presupuestos con mayor consumo, gastos por categoría y últimos movimientos.
- **Presupuestos**: límite mensual por categoría de gasto y presupuesto total opcional, con barra de progreso y estado (ok / aviso a partir del 80 % / superado).
- **Informes**: donut de gastos por categoría y barras de ingresos frente a gastos de los últimos 6 meses, siempre con una tabla accesible debajo.
- **Categorías**: 11 de gasto y 4 de ingreso por defecto, con emoji y color; crea, renombra y elimina las tuyas (los movimientos pasan a «Otros»).
- **Ajustes**: moneda (solo formato), tema claro/oscuro/sistema, saldo inicial, copia de seguridad (exportar/importar JSON) y borrado total.
- **Datos que no se pierden**: esquema versionado con migraciones, copia automática previa a cada guardado y pantalla de recuperación si el almacenamiento está corrupto o lleno.
- **Móvil y escritorio**: barra inferior con botón «+» en móvil (desde 360 px), barra lateral en escritorio; modo oscuro; navegación completa con teclado y lectores de pantalla.

## Cómo ejecutarla

Necesitas Node.js 22 o superior.

```bash
npm install
npm run dev        # abre http://localhost:5173
```

Para generar la versión de producción (carpeta `dist/`, archivos estáticos que puedes abrir con cualquier servidor web):

```bash
npm run build
npm run preview    # sirve dist/ en http://localhost:4173
```

## Calidad

```bash
npm run check      # typecheck + lint + tests unitarios + tests de zona horaria + build
npm run test:coverage   # cobertura de src/domain (umbral: 95 % de líneas)
npm run test:e2e   # pruebas end-to-end con Playwright (escritorio y móvil)
```

La primera vez que ejecutes las pruebas end-to-end fuera del contenedor de desarrollo, instala el navegador con `npx playwright install chromium`.

## Estructura

```
src/domain/     Lógica pura en TypeScript (dinero, fechas, validación, reducer, consultas, persistencia). Sin React.
src/ui/         Interfaz React: estado, componentes compartidos, vistas y textos (copy.ts).
src/styles/     Tokens de diseño (tema claro/oscuro) y hojas de estilo.
e2e/            Pruebas end-to-end (Playwright).
docs/SPEC.md    Especificación funcional y técnica completa.
```

## Decisiones de diseño

- **Céntimos enteros y fechas locales**: los importes son enteros y las fechas cadenas `AAAA-MM-DD`, así los totales son exactos y no hay saltos de día por zona horaria. Un test guardián prohíbe `parseFloat`, `toFixed`, `toISOString` y `new Date('…')` en todo `src/`.
- **Dominio separado de la interfaz**: `src/domain` no importa React ni el DOM y concentra la mayoría de las pruebas.
- **Guardado síncrono y único por acción**: el store persiste dentro de `dispatch`, antes de notificar a React, y mantiene una copia previa en `mis-finanzas:backup`.
- **Sin dependencias innecesarias**: React, Recharts y nada más en tiempo de ejecución.

## Privacidad

Todo se guarda en tu navegador. Si borras los datos del sitio, se pierden: exporta una copia desde Ajustes de vez en cuando.
