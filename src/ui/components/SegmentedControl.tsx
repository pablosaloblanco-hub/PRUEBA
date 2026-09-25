import { useId } from 'react'

export type SegmentedOption<T extends string> = { value: T; label: string }

export type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group (visually hidden <legend>). */
  legend: string
  /** Radio group name; must be unique per page. */
  name: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

/** Native radio group styled as segments (§8.2): fieldset + legend + <input type="radio">. */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  const idPrefix = useId()
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend className="segmented__legend">{legend}</legend>
      {options.map((option) => {
        const id = `${idPrefix}-${option.value}`
        return (
          <div key={option.value} className="segmented__option">
            <input
              id={id}
              className="segmented__input"
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <label htmlFor={id} className="segmented__label">
              {option.label}
            </label>
          </div>
        )
      })}
    </fieldset>
  )
}
