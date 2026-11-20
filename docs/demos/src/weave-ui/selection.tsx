// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import './fill.css'
import './selection.css'

// Each anchor carries the cursor the real canvas shows over it, for scenes that drag one
const CORNERS: Array<[x: string, y: string, cursor: string]> = [['0%', '0%', 'resize-nwse'], ['100%', '0%', 'resize-nesw'], ['0%', '100%', 'resize-nesw'], ['100%', '100%', 'resize-nwse']]
// Side anchors are pills: wide on the top and bottom edges, tall on the left and right
const SIDES: Array<[x: string, y: string, w: number, h: number]> = [['50%', '0%', 18, 6], ['50%', '100%', 18, 6], ['0%', '50%', 6, 18], ['100%', '50%', 6, 18]]

/** The SDK's selection box, drawn the way the canvas draws it: a 1px blue outline, round corner anchors and pill side anchors. Fills its positioned parent. */
export function Selection({ show, style, className }: { show: boolean; style?: CSSProperties; className?: string }) {
  return (
    <svg className={`wv-fill wv-selection${className ? ` ${className}` : ''}`} data-show={show || undefined} style={style} width="100%" height="100%" aria-hidden>
      <rect className="wv-selection__box" x="0" y="0" width="100%" height="100%" />
      {SIDES.map(([x, y, w, h]) => (
        <rect className="wv-selection__anchor" key={`${x}${y}`} x={x} y={y} width={w} height={h} rx="3" style={{ transform: `translate(${-w / 2}px, ${-h / 2}px)` }} />
      ))}
      {CORNERS.map(([x, y, cursor]) => (
        <circle className="wv-selection__anchor" key={`${x}${y}`} cx={x} cy={y} r="4.5" data-cursor={cursor} />
      ))}
    </svg>
  )
}
