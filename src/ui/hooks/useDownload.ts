// ============================================================================
// src/ui/hooks/useDownload.ts — file downloads via Blob + <a download> (§9
// «Import/export»): `URL.revokeObjectURL` is deferred. In jsdom the URL and
// anchor click APIs are stubbed by src/test/setup.ts.
// ============================================================================
import type { LocalDate } from '../../domain/types'

export const JSON_MIME = 'application/json'
export const TEXT_MIME = 'text/plain'
/** Filename of the raw-payload download of the recovery card (§5.5). */
export const RAW_DATA_FILENAME = 'mis-finanzas-datos-en-bruto.txt'

/** `mis-finanzas-2026-09-25.json` (F9). */
export function backupFilename(today: LocalDate): string {
  return `mis-finanzas-${today}.json`
}

/** Triggers a browser download of `text`. Safari iOS may open it in a new tab (accepted, §9). */
export function downloadText(filename: string, text: string, mime: string = TEXT_MIME): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Hook form for components that prefer injecting the helper. */
export function useDownload(): typeof downloadText {
  return downloadText
}
