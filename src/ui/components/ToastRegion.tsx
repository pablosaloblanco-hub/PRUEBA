// ============================================================================
// src/ui/components/ToastRegion.tsx — aria-live="polite" region with at most
// one toast (§7.0). The 4 s timer lives in UiProvider.
// ============================================================================
import { useUi } from '../state/useUi'

export function ToastRegion() {
  const { toast } = useUi()
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast !== null ? (
        <div className="toast" key={toast.id}>
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}
