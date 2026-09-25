import type { Category, Id } from '../../domain/types'
import { CategoryBadge } from './CategoryBadge'

export type CategoryPickerProps = {
  /** Already filtered by type and sorted by sortOrder. */
  categories: readonly Category[]
  value: Id | null
  onChange: (id: Id) => void
  /** Accessible name of the group («Categoría»). */
  label: string
}

/** Grid of category tiles (button aria-pressed inside a labelled group); 4 columns on mobile, 6 on desktop. */
export function CategoryPicker({ categories, value, onChange, label }: CategoryPickerProps) {
  return (
    <div role="group" aria-label={label} className="tile-grid">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className="tile"
          aria-pressed={category.id === value}
          onClick={() => onChange(category.id)}
        >
          <CategoryBadge icon={category.icon} color={category.color} />
          <span className="tile__name">{category.name}</span>
        </button>
      ))}
    </div>
  )
}
