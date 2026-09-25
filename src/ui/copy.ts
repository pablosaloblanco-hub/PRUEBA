/**
 * All user-facing text of Mis Finanzas (es-ES), centralised so the UI never
 * hard-codes strings and a future locale is a mechanical change.
 * Keys mirror docs/SPEC.md §7 (screens) and §5.5 (persistence errors). The
 * §4.4 validation messages are owned by src/domain/validate.ts (the validators
 * return them directly) and re-exposed here, so there is a single source.
 */
import { VALIDATION_MESSAGES } from '../domain/validate'

/** "1 movimiento" / "3 movimientos" style pluralisation. */
export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

export const copy = {
  app: {
    title: 'Mis Finanzas',
    version: 'Mis Finanzas v1',
    localOnly: 'Tus datos se guardan solo en este navegador',
    usage: (used: string) => `Uso: ${used} de ~5 MB`,
  },

  nav: {
    home: 'Inicio',
    transactions: 'Movimientos',
    budgets: 'Presupuestos',
    reports: 'Informes',
    categories: 'Categorías',
    settings: 'Ajustes',
    /** aria-label of the FAB (mobile). */
    addTransaction: 'Añadir movimiento',
    /** Primary button in the desktop sidebar. */
    newTransaction: '+ Nuevo movimiento',
    /** aria-label of the «‹» header button on Ajustes/Categorías (mobile). */
    back: 'Volver',
    /** aria-label of the ⚙ header button (mobile). */
    settingsIcon: 'Ajustes',
    /** aria-label of the <nav> (tab bar and sidebar). */
    mainNavLabel: 'Navegación principal',
  },

  month: {
    previous: 'Mes anterior',
    next: 'Mes siguiente',
    today: 'Hoy',
  },

  common: {
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    retry: 'Reintentar',
    /** Shown when a KPI does not apply. */
    notApplicable: '—',
    /** Label of the keyword input of a destructive ConfirmDialog (e.g. «Escribe BORRAR»). */
    typeToConfirm: (keyword: string) => `Escribe ${keyword}`,
  },

  transactionSheet: {
    newTitle: 'Nuevo movimiento',
    editTitle: 'Editar movimiento',
    expense: 'Gasto',
    income: 'Ingreso',
    typeLegend: 'Tipo',
    amount: 'Importe',
    amountPlaceholder: '0,00',
    /** Live preview under the amount field. */
    preview: (formatted: string) => `= ${formatted}`,
    date: 'Fecha',
    today: 'Hoy',
    yesterday: 'Ayer',
    category: 'Categoría',
    note: 'Nota (opcional)',
    notePlaceholder: 'Ej.: café con Ana',
    save: 'Guardar',
    saveChanges: 'Guardar cambios',
    delete: 'Eliminar',
    confirmDelete: '¿Eliminar este movimiento?',
    confirmDeleteYes: 'Sí, eliminar',
    toastExpenseSaved: 'Gasto guardado',
    toastIncomeSaved: 'Ingreso guardado',
    toastChangesSaved: 'Cambios guardados',
    toastDeleted: 'Movimiento eliminado',
  },

  transactions: {
    title: 'Movimientos',
    searchPlaceholder: 'Buscar por nota o categoría',
    searchLabel: 'Buscar por nota o categoría',
    clearSearch: 'Limpiar búsqueda',
    all: 'Todos',
    expenses: 'Gastos',
    incomes: 'Ingresos',
    removeCategoryFilter: 'Quitar filtro de categoría',
    clearFilters: 'Limpiar filtros',
    totals: (income: string, expense: string, balance: string) =>
      `Ingresos ${income} · Gastos ${expense} · Balance ${balance}`,
    emptyMonth: (monthLabel: string) => `No hay movimientos en ${monthLabel}`,
    emptyMonthCta: 'Añadir movimiento',
    emptyFiltered: 'Ningún movimiento coincide con los filtros',
    emptyFilteredCta: 'Limpiar filtros',
  },

  home: {
    title: 'Inicio',
    monthBalance: 'Balance del mes',
    income: 'Ingresos',
    expense: 'Gastos',
    totalBalance: 'Saldo total',
    totalBalanceHelp: 'Saldo inicial + ingresos − gastos hasta hoy',
    futureSuffix: (n: number) =>
      `(sin contar ${n} ${n === 1 ? 'movimiento futuro' : 'movimientos futuros'})`,
    avgDaily: 'Gasto medio por día',
    projection: 'Proyección a fin de mes',
    dayOf: (day: number, total: number) => `día ${day} de ${total}`,
    kpiFutureSuffix: (n: number) => `(sin contar ${n} ${n === 1 ? 'futuro' : 'futuros'})`,
    budgets: 'Presupuestos',
    seeAllBudgets: 'Ver todos',
    noBudgets: 'Crea un presupuesto para controlar tus gastos',
    createBudget: 'Crear presupuesto',
    byCategory: 'Gastos por categoría',
    seeReport: 'Ver informe',
    recent: 'Últimos movimientos',
    seeAllTransactions: 'Ver todos',
    emptyMonth: (monthLabel: string) => `Todavía no hay movimientos en ${monthLabel}`,
    firstUseTitle: 'Empieza registrando tu primer gasto',
    firstUseCta: 'Añadir movimiento',
    firstUseImport: 'Importar copia de seguridad',
  },

  budgets: {
    title: 'Presupuestos',
    newBudget: '+ Nuevo presupuesto',
    newBudgetShort: 'Nuevo presupuesto',
    allHaveBudget: 'Todas las categorías tienen presupuesto',
    total: 'Presupuesto total',
    spentOf: (spent: string, limit: string) => `Gastado ${spent} de ${limit}`,
    remaining: (amount: string) => `Te quedan ${amount}`,
    exceeded: (amount: string) => `Has superado el presupuesto en ${amount}`,
    edit: 'Editar',
    delete: 'Eliminar',
    confirmDeleteCategory: (categoryName: string) => `¿Eliminar el presupuesto de ${categoryName}?`,
    confirmDeleteTotal: '¿Eliminar el presupuesto total?',
    sheetNewTitle: 'Nuevo presupuesto',
    sheetEditTitle: 'Editar presupuesto',
    category: 'Categoría',
    totalOption: 'Total mensual',
    limit: 'Límite mensual',
    limitHelp: 'Se aplica a todos los meses',
    emptyTitle: 'Aún no tienes presupuestos',
    emptyText: 'Fija un límite mensual por categoría y verás cuánto te queda',
    emptyCta: 'Crear presupuesto',
    duplicate: VALIDATION_MESSAGES.budgetDuplicate,
    toastSaved: 'Presupuesto guardado',
    toastDeleted: 'Presupuesto eliminado',
  },

  reports: {
    title: 'Informes',
    byCategory: 'Gastos por categoría',
    others: 'Otras',
    emptyCategories: 'Aún no hay gastos en este mes',
    incomeVsExpense: 'Ingresos frente a gastos',
    emptyTrend: 'Aún no hay datos para este periodo',
    tableMonth: 'Mes',
    tableIncome: 'Ingresos',
    tableExpense: 'Gastos',
    tableBalance: 'Balance',
    seriesIncome: 'Ingresos',
    seriesExpense: 'Gastos',
    chartAriaLabel: (monthLabel: string, expense: string, income: string) =>
      `Gastos de ${monthLabel}: ${expense}; ingresos: ${income}`,
    loadError: 'No se ha podido cargar el informe',
    /** Suspense fallback while the lazy chart bundle loads. */
    loading: 'Cargando informe…',
    /** aria-label of the donut chart wrapper. */
    byCategoryAriaLabel: (monthLabel: string, total: string) => `Gastos por categoría de ${monthLabel}: ${total}`,
    /** «71 %» (es-ES keeps a space before the percent sign). */
    percent: (n: number) => `${n} %`,
    /** Accessible name of the total shown in the donut centre. */
    total: 'Total',
  },

  categories: {
    title: 'Categorías',
    expenses: 'Gastos',
    incomes: 'Ingresos',
    newCategory: '+ Nueva categoría',
    transactionCount: (n: number) => plural(n, 'movimiento', 'movimientos'),
    editAria: (name: string) => `Editar ${name}`,
    sheetNewTitle: 'Nueva categoría',
    sheetEditTitle: 'Editar categoría',
    name: 'Nombre',
    icon: 'Icono',
    color: 'Color',
    type: 'Tipo',
    save: 'Guardar',
    delete: 'Eliminar',
    confirmDelete: (name: string) => `¿Eliminar la categoría ${name}?`,
    confirmDeleteWithTransactions: (n: number, othersName: string) =>
      `Sus ${n} movimientos pasarán a "${othersName}". Se eliminará también su presupuesto.`,
    cannotDelete: 'Esta categoría no se puede eliminar',
    nameRequired: VALIDATION_MESSAGES.categoryNameRequired,
    nameDuplicate: VALIDATION_MESSAGES.categoryNameDuplicate,
    toastSaved: 'Categoría guardada',
    toastDeleted: 'Categoría eliminada',
    colorNames: {
      blue: 'Azul',
      orange: 'Naranja',
      teal: 'Verde azulado',
      amber: 'Ámbar',
      pink: 'Rosa',
      green: 'Verde',
      violet: 'Violeta',
      red: 'Rojo',
      gray: 'Gris',
    },
  },

  settings: {
    title: 'Ajustes',
    general: 'General',
    currency: 'Moneda',
    currencyHelp: 'Solo cambia el formato; los importes no se convierten',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    initialBalance: 'Saldo inicial',
    initialBalanceHelp: 'Saldo con el que empiezas a contar',
    organisation: 'Organización',
    categories: 'Categorías',
    backup: 'Copia de seguridad',
    exportJson: 'Exportar copia (JSON)',
    importJson: 'Importar copia',
    importPreview: (transactions: number, categories: number, budgets: number) =>
      `Se importarán ${transactions} movimientos, ${categories} categorías y ${budgets} presupuestos`,
    importWarnings: (n: number, list: string) => `Se han ajustado ${n} elementos: ${list}`,
    importConfirm: '¿Reemplazar los datos actuales?',
    importReplace: 'Reemplazar',
    importErrorInvalidJson: 'El archivo no es un JSON válido',
    importErrorNewer: 'El archivo es de una versión más nueva de la app',
    importErrorNotBackup: 'El archivo no es una copia válida de Mis Finanzas',
    importErrorTooLarge: 'El archivo es demasiado grande',
    toastImported: 'Datos importados correctamente',
    toastExported: 'Copia exportada',
    dangerZone: 'Zona peligrosa',
    deleteAll: 'Borrar todos los datos',
    deleteAllConfirmText: 'Esta acción no se puede deshacer. Escribe BORRAR para confirmar',
    deleteAllKeyword: 'BORRAR',
    deleteAllButton: 'Borrar',
    toastDeleted: 'Datos borrados',
  },

  persistence: {
    unavailable:
      'No se puede guardar en este navegador. Los datos se perderán al cerrar esta pestaña.',
    quota:
      'No se ha podido guardar: el almacenamiento está lleno. Exporta una copia y elimina movimientos antiguos.',
    quotaAction: 'Exportar copia',
    corruptTitle: 'No se han podido leer tus datos guardados.',
    restoreBackup: 'Restaurar copia automática',
    backupUnreadable: 'La copia automática tampoco se puede leer',
    downloadRaw: 'Descargar datos en bruto',
    startOver: 'Empezar de cero',
    newerTitle:
      'Estos datos son de una versión más reciente de Mis Finanzas. Actualiza la app o descarga los datos.',
  },

  /** Form validation messages (docs/SPEC.md §4.4): the domain's own strings plus the generic fallback. */
  validation: {
    ...VALIDATION_MESSAGES,
    /** Generic inline message when the reducer rejects an action the form could not predict. */
    saveFailed: 'No se ha podido guardar. Revisa los datos e inténtalo de nuevo',
  },
} as const

export type Copy = typeof copy
