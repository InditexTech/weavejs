import type { HTMLAttributes } from 'react'
import './Draft.css'

export interface DraftProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The words typed so far. Drive it with act.type(). */
  value: string
  /** The finished comment. Its height is held from the first keystroke, so
   * the card never grows a line mid-typing. */
  full?: string
  /** Typing: the box and caret show. Off: the words sit as the posted comment. */
  editing: boolean
  placeholder?: string
}

/**
 * A comment being written that becomes the posted comment in place: a reply
 * box in a thread, a note on a doc, a message before it sends. Put it in the
 * column the comment's words belong to (under the name, beside the avatar);
 * it fills that column, so while typing the box's edges sit on it (the
 * name's left edge, the buttons' right), never hanging past it.
 *
 * While editing, the words sit padded inside the box. It takes that shape at
 * once (a card arriving in its typing state doesn't ease into it); on post the
 * box fades and the padding eases away, so the words glide onto the column
 * and the height closes with them. Nothing changes that can't animate. The
 * caret sits solid while typing and blinks once it rests.
 */
export function Draft({ value, full, editing, placeholder, className, ...rest }: DraftProps) {
  return (
    <div {...rest} className={`ss-draft${className ? ` ${className}` : ''}`} data-editing={editing || undefined} data-empty={!value || undefined}>
      {/* The box is the kit's own element, so a transition or padding set on
          the Draft (its margins, its font) can't make it ease in on its own */}
      <span className="ss-draft__box">
        <span className="ss-draft__words">
          {full != null && <span className="ss-draft__size" aria-hidden>{full}</span>}
          <span className="ss-draft__typed">
            {value}
            {editing && <span key={value.length} className="ss-draft__caret" />}
          </span>
          {placeholder && <span className="ss-draft__ph" aria-hidden>{placeholder}</span>}
        </span>
      </span>
    </div>
  )
}
