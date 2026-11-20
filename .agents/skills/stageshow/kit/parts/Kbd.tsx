import type { HTMLAttributes } from 'react'
import './Kbd.css'

/**
 * A keyboard shortcut as a product prints it beside a menu item or in a
 * search field: `keys={['⌘', 'K']}` draws one keycap per key, side by side.
 * `plain` drops the caps for the flat style (⌘K in gray text).
 */
export function Kbd({ keys, plain, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { keys: string[]; plain?: boolean }) {
  return (
    <span {...rest} className={`ss-kbd${className ? ` ${className}` : ''}`} data-plain={plain || undefined} aria-label={keys.join(' ')}>
      {keys.map((k, i) => <kbd key={i} className="ss-kbd__key">{k}</kbd>)}
    </span>
  )
}
