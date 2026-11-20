// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import './flow.css'

/** A box in a system flow: an icon, a name and an optional second line (a client, a server, a transport). `target` names it for the kit's Connector and cursor. */
export function FlowBox({ icon: Icon, title, sub, target, tone = 'default', children, className, style }: { icon: LucideIcon; title: string; sub?: string; target: string; tone?: 'default' | 'accent'; children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`wv-flow__box${className ? ` ${className}` : ''}`} data-tone={tone} data-target={target} style={style}>
      <span className="wv-flow__icon">
        <Icon size={20} strokeWidth={1.25} />
      </span>
      <span className="wv-flow__text">
        <span className="wv-flow__title">{title}</span>
        {sub && <span className="wv-flow__sub">{sub}</span>}
      </span>
      {children}
    </div>
  )
}

/** A mini canvas a client shows: a faint grid with a little shape that the scene draws or moves. */
export function MiniCanvas({ children, className, style }: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`wv-flow__canvas${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  )
}

/** A state-diff chip that rides a connector: the scene moves it with `at` (stage px, its center). */
export function MessageChip({ at, show = true, tone = 'accent', children }: { at: { x: number; y: number }; show?: boolean; tone?: 'accent' | 'neutral'; children: string }) {
  return (
    <span className="wv-chip" data-show={show || undefined} data-tone={tone} style={{ transform: `translate(${at.x}px, ${at.y}px) translate(-50%, -50%)` }}>
      {children}
    </span>
  )
}
