import type { ColorKey } from '../../domain/types'

export type CategoryBadgeSize = 'sm' | 'md' | 'lg'

export type CategoryBadgeProps = {
  /** Emoji from EMOJI_CHOICES. */
  icon: string
  /** Resolved to --series-1..8 / --series-other by CSS through data-color (§8.1). */
  color: ColorKey
  /** 28px / 40px (default) / 48px. */
  size?: CategoryBadgeSize
}

/** Coloured circle with the category emoji. Decorative: the parent renders the name. */
export function CategoryBadge({ icon, color, size = 'md' }: CategoryBadgeProps) {
  return (
    <span className={`badge badge--${size}`} data-color={color} aria-hidden="true">
      {icon}
    </span>
  )
}
