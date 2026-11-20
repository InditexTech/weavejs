import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import './Collapse.css'

/**
 * Opens and closes its content's height, so what comes after moves with it:
 * a row leaving a list, a log panel opening under a status. Closing dims the
 * content fast and dissolves it over the whole of the height's travel, so a
 * row is faint by the time the edge reaches it and the space is never seen
 * empty; opening brings the content with its height. Children can have any height or
 * padding. The inner box is a deliberate crop (film.mjs skips it) and clips
 * 3px wide, so rings and shadows on the content aren't shaved.
 *
 * Closing, it holds its children as they were open until the height has
 * settled, so a state reset in the same beat (a thread's rows going back to
 * their empty draft as the thread folds) never shows mid-fold. The flip side:
 * a change made in the same set as `open: false` won't show either; make it
 * in one set and close in the next.
 */
export function Collapse({ open, reveal = 'clip', from = 'above', solid = false, children, className, ...rest }: HTMLAttributes<HTMLDivElement> & {
  open: boolean
  /**
   * clip: the opening space uncovers the content, for rows and text. The
   * content is faint while the edge passes it, so nothing is ever seen sliced.
   * drop: the space opens and the content arrives whole, gliding into place.
   * For cards and messages: a notification, a toast, a chat message.
   */
  reveal?: 'clip' | 'drop'
  /** Where drop content comes from: 'above' (a notification), or 'below' (a chat message landing at the bottom of a feed). */
  from?: 'above' | 'below'
  /**
   * Opaque throughout: the height opens and closes over the content without
   * fading it. For a surface unlike the ground (a dark log panel on a light
   * window), which would otherwise pass through gray. Its content is there
   * from the first frame: open it with what it shows, never empty.
   */
  solid?: boolean
  children: ReactNode
}) {
  // Marked moving from the frame open changes until the height settles
  const [moving, setMoving] = useState(false)
  // Taller than a row: unfolding from the middle would cut its first line
  // while it's already visible, so it reveals from the top and fades in late
  const [tall, setTall] = useState(false)
  const inner = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  // What it showed while open, held through the close (decided while
  // rendering, so the first closing frame already shows it)
  const held = useRef<ReactNode>(children)
  const [released, setReleased] = useState(true)
  if (open) held.current = children
  useLayoutEffect(() => {
    const h = inner.current?.scrollHeight ?? 0
    if (h) setTall(h > 44)
    if (first.current) return void (first.current = false)
    setMoving(true)
    if (!open) setReleased(false)
    // No transitionend without a transition (reduced motion): never leave it moving
    const t = setTimeout(() => { setMoving(false); setReleased(true) }, 900)
    return () => clearTimeout(t)
  }, [open])
  return (
    <div
      {...rest}
      className={`ss-collapse${className ? ` ${className}` : ''}`}
      data-open={open || undefined}
      data-reveal={reveal}
      data-solid={solid || undefined}
      data-from={reveal === 'drop' ? from : undefined}
      data-moving={moving || undefined}
      data-tall={tall || undefined}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows') { setMoving(false); setReleased(true) }
        rest.onTransitionEnd?.(e)
      }}
    >
      <div ref={inner} className="ss-collapse__inner" data-crop={reveal === 'clip' || undefined}>
        {reveal === 'drop'
          ? <div className="ss-collapse__glide">{open || released ? children : held.current}</div>
          : open || released ? children : held.current}
      </div>
    </div>
  )
}
