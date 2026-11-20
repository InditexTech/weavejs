// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import './peer.css'

export interface PeerProps {
  name: string
  color: string
  at: { x: number; y: number }
  /** A drawing tool is active over the canvas: the cursor is a crosshair. */
  crosshair?: boolean
  /** Moves a little slower, so two peers never move in step. */
  slow?: boolean
}

/** A collaborator's cursor: their color, their name riding below the tip. It eases like a hand. */
export function Peer({ name, color, at, crosshair, slow }: PeerProps) {
  return (
    <span className="wv-peer" data-slow={slow || undefined} style={{ transform: `translate(${at.x}px, ${at.y}px)`, '--who': color } as CSSProperties}>
      <svg className="wv-peer__arrow" width="16" height="18" viewBox="0 0 16 18" aria-hidden data-hidden={crosshair || undefined}>
        <path d="M1.5 1.5v13.2l3.6-3.3 2.4 5.4 2.4-1-2.4-5.3h5.1Z" fill="var(--who)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <svg className="wv-peer__cross" width="18" height="18" viewBox="0 0 18 18" aria-hidden data-hidden={!crosshair || undefined}>
        <path d="M9 1.5v15M1.5 9h15" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M9 1.5v15M1.5 9h15" stroke="var(--who)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="wv-peer__flag">{name}</span>
    </span>
  )
}
