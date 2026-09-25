// ============================================================================
// src/ui/components/Shell.tsx — application frame (§7.0): sticky header
// (visually-hidden <h1> on mobile, screen <h2>, month selector, «Volver»/⚙),
// sidebar (≥ 900 px) or tab bar + FAB (mobile), persistence banners, the
// recovery card, the current view, the toast region and the sheet host.
// ============================================================================
import { exportJson } from '../../domain/storage/jsonio'
import { copy } from '../copy'
import { backupFilename, downloadText, JSON_MIME } from '../hooks/useDownload'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useTheme } from '../hooks/useTheme'
import { useAppData, usePersistence } from '../state/useStore'
import { useToday, useUi, useUiActions } from '../state/useUi'
import { isMonthlyScreen } from '../state/uiReducer'
import type { Screen } from '../state/uiReducer'
import { BudgetSheet } from '../views/BudgetSheet'
import { BudgetsView } from '../views/BudgetsView'
import { CategoriesView } from '../views/CategoriesView'
import { CategorySheet } from '../views/CategorySheet'
import { HomeView } from '../views/HomeView'
import { RecoveryView } from '../views/RecoveryView'
import { ReportsView } from '../views/ReportsView'
import { SettingsView } from '../views/SettingsView'
import { TransactionSheet } from '../views/TransactionSheet'
import { TransactionsView } from '../views/TransactionsView'
import { Banner } from './Banner'
import { MonthSelector } from './MonthSelector'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { ToastRegion } from './ToastRegion'

const SCREEN_TITLES: Record<Screen, string> = {
  home: copy.home.title,
  transactions: copy.transactions.title,
  budgets: copy.budgets.title,
  reports: copy.reports.title,
  categories: copy.categories.title,
  settings: copy.settings.title,
}

function CurrentView({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'home':
      return <HomeView />
    case 'transactions':
      return <TransactionsView />
    case 'budgets':
      return <BudgetsView />
    case 'reports':
      return <ReportsView />
    case 'categories':
      return <CategoriesView />
    case 'settings':
      return <SettingsView />
  }
}

/** Renders the sheet component matching `ui.sheet.kind` (one slot, §3.6). */
function SheetHost() {
  const { sheet } = useUi()
  switch (sheet.kind) {
    case 'none':
      return null
    case 'transaction/new':
    case 'transaction/edit':
      return <TransactionSheet />
    case 'budget/new':
    case 'budget/edit':
      return <BudgetSheet />
    case 'category/new':
    case 'category/edit':
      return <CategorySheet />
  }
}

/** §5.5 banners: storage unavailable (memory only) and quota exceeded (with «Exportar copia»). */
function PersistenceBanners() {
  const persistence = usePersistence()
  const data = useAppData()
  const today = useToday()
  const unavailable =
    persistence.load?.kind === 'unavailable' || persistence.error?.kind === 'unavailable'
  const quota = persistence.error?.kind === 'quota'
  if (!unavailable && !quota) return null

  const exportCopy = () => downloadText(backupFilename(today), exportJson(data, Date.now()), JSON_MIME)

  return (
    <div className="banners">
      {unavailable ? <Banner tone="error">{copy.persistence.unavailable}</Banner> : null}
      {quota ? (
        <Banner tone="warning" action={{ label: copy.persistence.quotaAction, onClick: exportCopy }}>
          {copy.persistence.quota}
        </Banner>
      ) : null}
    </div>
  )
}

export function Shell() {
  useTheme()
  const isDesktop = useIsDesktop()
  const { screen, previousScreen } = useUi()
  const { nav } = useUiActions()
  const persistence = usePersistence()

  const needsRecovery = persistence.load?.kind === 'corrupt' || persistence.load?.kind === 'newer'
  const showBack = !isDesktop && (screen === 'settings' || screen === 'categories')
  const goBack = () => nav(screen === 'categories' ? 'settings' : (previousScreen ?? 'home'))

  return (
    <div className={`shell ${isDesktop ? 'shell--desktop' : 'shell--mobile'}`}>
      {isDesktop ? <Sidebar /> : null}
      <div className="shell__main">
        <header className="app-header">
          {!isDesktop ? <h1 className="visually-hidden">{copy.app.title}</h1> : null}
          {showBack ? (
            <button type="button" className="app-header__btn" aria-label={copy.nav.back} onClick={goBack}>
              <span aria-hidden="true">‹</span>
            </button>
          ) : null}
          <h2 className="app-header__title">{SCREEN_TITLES[screen]}</h2>
          {isMonthlyScreen(screen) ? <MonthSelector /> : null}
          {!isDesktop && screen !== 'settings' ? (
            <button
              type="button"
              className="app-header__btn"
              aria-label={copy.nav.settingsIcon}
              onClick={() => nav('settings')}
            >
              <span aria-hidden="true">⚙</span>
            </button>
          ) : null}
        </header>
        <main className="content" id="main">
          <PersistenceBanners />
          {needsRecovery ? <RecoveryView /> : <CurrentView screen={screen} />}
        </main>
      </div>
      {!isDesktop ? <TabBar /> : null}
      <ToastRegion />
      <SheetHost />
    </div>
  )
}
