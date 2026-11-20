import type { HTMLAttributes } from 'react'
import './Divider.css'

/**
 * A hairline between groups. Horizontal by default; `vertical` for a rule
 * between toolbar buttons (it takes the row's height less 4px each end).
 * `inset` indents a horizontal rule from both sides, in px.
 */
export function Divider({ vertical, inset = 0, className, style, ...rest }: HTMLAttributes<HTMLSpanElement> & { vertical?: boolean; inset?: number }) {
  return (
    <span
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      {...rest}
      className={`ss-divider${className ? ` ${className}` : ''}`}
      data-vertical={vertical || undefined}
      style={inset ? { ...style, marginInline: inset } : style}
    />
  )
}
