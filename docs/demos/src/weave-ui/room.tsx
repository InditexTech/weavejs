// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { ChevronDown, Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import './room.css'

/** The room name card at the top left of the showcase. */
export function RoomCard({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`wv-card wv-room${className ? ` ${className}` : ''}`} style={style}>
      <span className="wv-room__mark" aria-hidden />
      <span className="wv-room__name">{name}</span>
    </div>
  )
}

/** The status card at the top right: connection, the people in the room, zoom. */
export function StatusCard({ people, zoom, connecting, className, style }: { people: Array<{ initials: string; color: string; off?: boolean }>; zoom: string; connecting?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div className={`wv-card wv-status${className ? ` ${className}` : ''}`} style={style}>
      <span className="wv-status__connected" data-connecting={connecting || undefined}>
        {connecting ? 'Connecting' : 'Connected'}
      </span>
      <span className="wv-status__people">
        {people.map((p) => (
          <span className="wv-status__person" key={p.initials} data-off={p.off || undefined} style={{ '--who': p.color } as CSSProperties}>
            {p.initials}
          </span>
        ))}
      </span>
      <span className="wv-status__divider" />
      <ZoomIn size={16} strokeWidth={1.25} data-target="status-zoom-in" />
      <ZoomOut size={16} strokeWidth={1.25} data-target="status-zoom-out" />
      <Maximize size={16} strokeWidth={1.25} />
      <span className="wv-status__zoom">{zoom}</span>
    </div>
  )
}


/** The room card of the showcase's room page: the logo with its menu, a rule, then the room name. */
export function RoomHeader({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`wv-card wv-room${className ? ` ${className}` : ''}`} style={style}>
      <span className="wv-room__mark" aria-hidden />
      <ChevronDown size={14} strokeWidth={1.25} />
      <span className="wv-room__rule" />
      <span className="wv-room__name">{name}</span>
    </div>
  )
}
