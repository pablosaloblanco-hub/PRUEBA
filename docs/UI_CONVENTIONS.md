# UI conventions — Mis Finanzas

How the React layer (`src/ui/**`) is wired, named and tested. The contract is
`docs/SPEC.md`; this file only fixes the mechanics every UI agent shares. Code
identifiers and comments are English; every user-facing string comes from
`src/ui/copy.ts` (add keys if one is missing, never rename existing ones).

## 1. Files and ownership (later phases)

| Owner (agent) | Files |
|---|---|
| Skeleton (done) | `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/styles/base.css`, `src/styles/layout.css`, `src/ui/state/*`, `src/ui/hooks/{useTheme,useDownload,useMediaQuery}.ts`, `src/ui/components/{Shell,TabBar,Sidebar,MonthSelector,ToastRegion,Banner}.tsx`, `src/ui/views/RecoveryView.tsx`, `src/test/{renderApp.tsx,setup.ts}` |
| Shared components | `src/styles/components.css`, `src/ui/components/{Dialog,ConfirmDialog,AmountInput,CategoryPicker,ErrorBoundary,CategoryBadge,Money,TransactionRow,TransactionList,ProgressBar,BudgetCard,EmptyState,SegmentedControl,Chips}.tsx`, `src/ui/components/amountField.ts` (pure `parseAmountField`/`currencySymbol`, kept out of the component file for `react/only-export-components`), `src/ui/components/charts/*` |
| Views / sheets | `src/ui/views/{HomeView,TransactionsView,TransactionSheet,BudgetsView,BudgetSheet,ReportsView,CategoriesView,CategorySheet,SettingsView}.tsx` (+ co-located `*.css` and `*.test.tsx`) |

The stub views/sheets currently in `src/ui/views/` are placeholders: replace the
whole file, keep the exported name and the prop contract below.

Per-view CSS goes in a co-located file (`src/ui/views/home.css`, `budgets.css`,
`transactions.css`, `categories.css`, `reports.css`, `settings.css`, imported by
the view). Styles of shared components (`BudgetCard`, `TransactionList`,
`TransactionRow`, …) live in `src/styles/components.css`, never in a view sheet,
so a view never imports another view's CSS. Do not edit `base.css`/`layout.css`;
ask for a class instead.

## 2. Component contracts

- **Views** (`HomeView`, `TransactionsView`, …): named export, **no props**,
  read everything through hooks. Wrap the content in `<div className="screen">`
  (sections inside use `.section`). **Do not render the screen `<h2>`**: the
  Shell header already renders it (`Inicio`, `Movimientos`, …) so the document
  has exactly one `<h1>` («Mis Finanzas») and one screen-level `<h2>`. Use
  `<h3 className="section__title">` for section titles. A view that needs a
  header action (e.g. «+ Nuevo presupuesto») renders a `.screen__toolbar` row at
  the top of its screen.
- **Sheets** (`TransactionSheet`, `BudgetSheet`, `CategorySheet`): named export,
  **no props**; they are mounted by `SheetHost` (inside `Shell`) only while
  `ui.sheet.kind` matches (`transaction/*`, `budget/*`, `category/*`), so they
  read `useUi().sheet` to know whether they are new/edit and which id, and call
  `closeSheet()` when done. Unmounting happens automatically after
  `closeSheet()`. Use the shared `Dialog` component (built by the shared
  components agent) — it must call `showModal()`, set `aria-labelledby`, close
  on Escape/backdrop/× and fire `onClose`.
- `ReportsView` is loaded statically by the Shell; put the `React.lazy` +
  `ErrorBoundary` split *inside* `ReportsView.tsx` (the chart bundle is the lazy
  part), so the Shell stays untouched.
- `RecoveryView` replaces the content while `persistence.load.kind` is
  `corrupt` or `newer`; nothing else needs to handle those states.

## 3. State and hooks

### Domain data (`src/ui/state/useStore.ts`)
```ts
const data = useAppData()            // AppData snapshot (stable reference); derive with useMemo
const persistence = usePersistence() // { error, load, lastSavedAt, mode, backupUnreadable }
const dispatch = useDispatch()       // store.dispatch → Result<AppData, ReducerError>
const store = useStore()             // recover(), reloadFromStorage(), getSnapshot()
```
`dispatch` returns the reducer `Result`: check `result.ok` and map
`result.error` (a `ReducerError`) to an inline message from `copy.validation`.
Timestamps for actions come from `Date.now()` in the view; ids from
`newId()` (`src/domain/ids.ts`). Derived numbers: `useMemo(() =>
summarizeMonth(data.transactions, month), [data, month])` — never recompute
money/date logic in the UI, always call `src/domain/*`.

### UI state (`src/ui/state/useUi.ts`, reducer in `uiReducer.ts`, §3.6)
```ts
const { screen, previousScreen, month, sheet, filter, toast } = useUi()
const today = useToday()             // LocalDate from the injected clock (fixed in tests)
const { openSheet, closeSheet, nav, showToast, setMonth, shiftMonth, setFilter, clearFilter } = useUiActions()
const uiDispatch = useUiDispatch()   // raw UiAction dispatch, rarely needed
```
- `openSheet({ kind: 'transaction/new' })`, `openSheet({ kind: 'transaction/edit', id })`,
  `openSheet({ kind: 'budget/new', presetCategoryId })`, `openSheet({ kind: 'category/new', type })` …
  Opening while a sheet is open is ignored (single slot). While the recovery card
  is shown (§5.5) `SheetHost` renders nothing and the FAB / «+ Nuevo movimiento»
  are disabled.
- Initial focus inside a `Dialog`: mark the first field with `data-autofocus`
  (`AmountInput` does it through its `autoFocus` prop). React's `autoFocus`
  alone runs while the `<dialog>` is still closed and is a no-op there.
- `nav('transactions', { categoryId })` — sets `previousScreen`, resets the
  filter and applies the given patch (drilldown from Informes/Inicio).
- `showToast('Gasto guardado')` — replaces the current toast; hidden after 4 s
  by `UiProvider`. Only one toast at a time.
- `setFilter({ query })` for the debounced search (150 ms; local input state,
  dispatch after the debounce), `clearFilter()` for «Limpiar filtros».
- Helper constants: `MONTHLY_SCREENS`, `isMonthlyScreen()`, `EMPTY_FILTER`,
  `NO_SHEET`, `initialUiState(today, overrides)`.
- `previousScreen`: set by `nav` to the screen being left, except that moving
  between Ajustes and Categorías keeps it (Categorías is a sub-screen of Ajustes),
  so «Volver» on Ajustes returns to where the user came from.

### Other hooks
- `useIsDesktop()` / `useMediaQuery(query)` — `src/ui/hooks/useMediaQuery.ts`
  (900 px breakpoint; mock the module in tests, see §6).
- `downloadText(filename, text, mime)`, `backupFilename(today)`,
  `RAW_DATA_FILENAME`, `JSON_MIME`, `TEXT_MIME` — `src/ui/hooks/useDownload.ts`.
  Export JSON: `downloadText(backupFilename(today), exportJson(data, Date.now()), JSON_MIME)`.
- `useTheme()` is called once by the Shell; Settings only dispatches
  `settings/update { theme }`.

## 4. Class names (BEM-ish, tokens only)

Defined in `base.css`/`layout.css` (Skeleton):

| Class | Use |
|---|---|
| `.visually-hidden`, `.tabular-nums`, `.nowrap`, `.truncate`, `.text-muted`, `.text-secondary`, `.text-income`, `.text-expense` | utilities |
| `.screen`, `.screen__toolbar` | view wrapper (column, gap 16) and its optional top action row |
| `.section`, `.section__header`, `.section__title` | card-like section inside a screen |
| `.grid-2`, `.grid-3` | 1 column on mobile, 2/3 columns ≥ 900 px |
| `.stack`, `.row`, `.row--between`, `.row--wrap` | flex helpers |
| `.banners` | column wrapper for the persistence banners |
| `.recovery`, `.recovery__actions`, `.recovery__note`, `.recovery__confirm` | `RecoveryView` |
| `.app-header`, `.app-header__title`, `.app-header__btn` (+ `__back` / `__settings`), `.month-selector*`, `.tabbar*`, `.fab`, `.sidebar*`, `.content`, `.shell*` | shell chrome (do not reuse in views). Below 900 px the header is a 3-column grid: row 1 = [‹ Volver] title [⚙], row 2 = the month selector (a single row truncated both at 360 px) |

Defined in `components.css` (shared components agent) and used by name across
the app (the authoritative list is the file itself):

| Class | Use |
|---|---|
| `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--danger`, `.btn--icon`, `.btn--block`, `.btn--sm` | buttons (min 44 px targets; `.btn--sm` and the segmented labels are compact only at `(min-width: 900px) and (pointer: fine)`; `.btn--icon` is 44×44 with `aria-label`) |
| `.field`, `.field__label`, `.field__input`, `.field__help`, `.field__error`, `.field__preview` | labelled inputs/selects (`aria-describedby` → help/error, `aria-invalid`) |
| `.amount`, `.amount__input`, `.amount__suffix` | `AmountInput` |
| `.segmented`, `.segmented__legend`, `.segmented__option`, `.segmented__input`, `.segmented__label` | `SegmentedControl` (`fieldset` + radios) |
| `.chip`, `.chip__remove`, `.chip-row`, `.chip-group` | `Chips` (`button aria-pressed`, horizontal scroll row) |
| `.tile`, `.tile__name`, `.tile-grid` | `CategoryPicker` (3 columns below 400 px, 4 on mobile, 5 in the desktop dialog) |
| `.card`, `.card__title`, `.card__body`, `.card__footer`, `.kpi`, `.kpi-grid`, `.kpi__label`, `.kpi__value`, `.kpi__hint` | Home/Budgets cards and KPI tiles |
| `.list`, `.list-header`, `.list-row`, `.list-row__main`, `.list-row__title`, `.list-row__subtitle`, `.list-row__amount`, `.list-row__trailing`, `.list-row__actions`, `.transaction-list*`, `.transaction-row`, `.list-header__*`, `.budget-card*` | `TransactionList`/`TransactionRow`, `BudgetCard`, Categories rows |
| `.badge`, `.badge--sm`, `.badge--lg` | `CategoryBadge` (`ColorKey` → `--series-N`/`--series-other`) |
| `.money`, `.money--income`, `.money--expense`, `.money--neutral` | `Money` |
| `.progress`, `.progress__fill`, `.progress-row`, `.progress-row__meta` | `ProgressBar` |
| `.dialog`, `.dialog--sheet`, `.dialog--modal`, `.dialog__panel`, `.dialog__handle`, `.dialog__header`, `.dialog__title`, `.dialog__close`, `.dialog__body`, `.dialog__text`, `.dialog__footer` | `Dialog` (bottom sheet on mobile, centred 480 px modal ≥ 900 px) |
| `.empty`, `.empty__title`, `.empty__text`, `.empty__actions` | `EmptyState` |
| `.banner`, `.banner--warning`, `.banner--error`, `.banner__text`, `.banner__actions` | `Banner` (component in Skeleton, styles in components.css) |
| `.toast-region`, `.toast` | `ToastRegion` (idem) |
| `.table`, `.table-wrap` | tables under charts |

Visual QA: `budget-card__status` wraps (compact cards at 360 px), warning text uses
`color-mix(var(--color-warning), var(--color-text))` for ≥ 4.5:1, `.trend-table` drops
to `--font-size-xs` and 4 px cell padding below 900 px, `.tile__name` hyphenates
(`hyphens: auto`, `lang="es"`) before breaking mid-word.

Rules: mobile-first, only `var(--…)` from `tokens.css`, no inline style objects
except runtime values (`style={{ width: \`${pct}%\` }}`, series colours),
amounts `white-space: nowrap` + `tabular-nums`, no horizontal overflow at 360 px
(`min-width: 0` on flex/grid children, `.truncate` for text).

## 5. Accessibility checklist (§8.2)

Every input has a `<label htmlFor>`; icon buttons have `aria-label` (use the
`copy.*` keys); `<dialog>` opened with `showModal()` and `aria-labelledby`;
segmented controls are `fieldset` + `radio`; chips/tiles are `button
aria-pressed`; list rows are buttons only when they contain no other control;
toasts live in the Shell's `aria-live="polite"` region; charts get `role="img"`
+ `aria-label` and an HTML table below; focus ring via `:focus-visible` (already
global); targets ≥ 44 px.

## 6. Tests

```ts
import { renderApp } from '../../test/renderApp'
const { user, store, repo, today } = renderApp({
  data?: AppData,                 // default: §3.7 fixture (fixtureData())
  today?: LocalDate,              // default '2026-09-25' (FIXTURE_TODAY)
  now?: Timestamp,                // default FIXTURE_NOW (fixture savedAt)
  repo?: StorageRepository,       // e.g. createMemoryRepository() for first use, or raw corrupt text
  store?: Store,                  // a prebuilt store (overrides data/repo/now)
  ui?: Partial<UiState>,          // start on a screen / month / with a sheet open
  userEventOptions?,              // e.g. { advanceTimers: vi.advanceTimersByTime }
})
```
`renderApp` mounts the full `<App store today initialUi>` (Shell included), so
navigate like a user: `user.click(screen.getByRole('button', { name:
'Añadir movimiento' }))`, or start directly with `ui: { screen: 'budgets' }` /
`ui: { sheet: { kind: 'transaction/new' } }`.

- Query by role and exact Spanish text from `copy.ts`.
- Mobile is the default (`matchMedia` stub → `matches: false`). For desktop,
  mock the hook module:
  ```ts
  const media = vi.hoisted(() => ({ desktop: false }))
  vi.mock('../hooks/useMediaQuery', () => ({
    DESKTOP_QUERY: '(min-width: 900px)',
    useMediaQuery: () => media.desktop,
    useIsDesktop: () => media.desktop,
  }))
  ```
- Debounce/toast: `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in
  `afterEach`, `renderApp({ userEventOptions: { advanceTimers:
  vi.advanceTimersByTime } })`, then `act(() => vi.advanceTimersByTime(150))`
  (search) / `4000` (toast). `setup.ts` installs a `jest.advanceTimersByTime`
  shim so Testing Library's async wrapper does not hang under Vitest fake timers.
- `setup.ts` polyfills `HTMLDialogElement.showModal/show/close` (sets `open`,
  dispatches `close`), stubs `ResizeObserver`, `matchMedia`,
  `URL.createObjectURL/revokeObjectURL` and `HTMLAnchorElement.prototype.click`
  (spy on them: `vi.spyOn(URL, 'createObjectURL')`). It also clears
  `localStorage` and `<html data-theme>` after each test.
- Corrupt/raw storage in tests: `createMemoryRepository('{bad')`, or set keys on
  `repo.entries` (cast to `Map`) — see `RecoveryView.test.tsx`.
- Never write the tokens `parseFloat`, `toFixed`, `toISOString(`, `new Date('`
  anywhere under `src/` (guardian test), not even in comments.
