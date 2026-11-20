// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Cloud, Maximize, Minus, Plus, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import '../fill.css'
import '../room.css'
import './overlays.css'

const cx = (base: string, extra?: string) => (extra ? `${base} ${extra}` : base)

export interface MenuItem {
  label: string
  icon?: LucideIcon
  shortcut?: string
  /** Draws a divider above the item. */
  divider?: boolean
  /** The scene drives hover: the highlighted item shows its hover fill. */
  hovered?: boolean
  disabled?: boolean
}

/** The showcase's context menu: a square white card of rows with an icon, a label and a shortcut. `at` is its top-left corner. */
export function ContextMenu({ items, at, show, className }: { items: MenuItem[]; at: { x: number; y: number }; show: boolean; className?: string }) {
  return (
    <div className={cx('wv-menu', className)} data-show={show || undefined} style={{ left: at.x, top: at.y }} role="menu">
      {items.map(({ label, icon: Icon, shortcut, divider, hovered, disabled }) => (
        <div key={label}>
          {divider && <div className="wv-menu__divider" />}
          <div className="wv-menu__item" role="menuitem" data-hover={hovered || undefined} data-disabled={disabled || undefined} data-target={`menu-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            {Icon ? <Icon size={16} strokeWidth={1.5} /> : <span className="wv-menu__blank" />}
            <span className="wv-menu__label">{label}</span>
            {shortcut && <span className="wv-menu__shortcut">{shortcut}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Zoom controls as a small card: out, the level, in, fit. */
export function ZoomBar({ zoom, className, style }: { zoom: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('wv-card wv-zoom', className)} style={style}>
      <ZoomOut size={16} strokeWidth={1.25} data-target="zoom-out" />
      <span className="wv-zoom__level">{zoom}</span>
      <ZoomIn size={16} strokeWidth={1.25} data-target="zoom-in" />
      <Maximize size={16} strokeWidth={1.25} data-target="zoom-fit" />
    </div>
  )
}

/**
 * The stage minimap: a small card showing the whole room, with the visible viewport as the SDK draws
 * it (translucent black fill, #e12d3c outline). `nodes` and `viewport` are in world fractions (0 to 1).
 */
export function Minimap({ nodes, viewport, className, style }: { nodes: Array<{ x: number; y: number; w: number; h: number }>; viewport: { x: number; y: number; w: number; h: number }; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('wv-minimap', className)} style={style} data-target="minimap">
      <svg className="wv-fill" width="100%" height="100%" viewBox="0 0 100 62.5" preserveAspectRatio="none" aria-hidden>
        {nodes.map((n, i) => (
          <rect className="wv-minimap__node" key={i} x={n.x * 100} y={n.y * 62.5} width={n.w * 100} height={n.h * 62.5} />
        ))}
        <rect className="wv-minimap__view" x={viewport.x * 100} y={viewport.y * 62.5} width={viewport.w * 100} height={viewport.h * 62.5} />
      </svg>
    </div>
  )
}

/** A comment on the canvas: a pin in a collaborator's color showing its message count. `at` is the pin's bottom-left tip. */
export function CommentPin({ at, color, count = 1, show = true, className }: { at: { x: number; y: number }; color: string; count?: number; show?: boolean; className?: string }) {
  return (
    <span className={cx('wv-pin', className)} data-show={show || undefined} style={{ left: at.x, top: at.y, '--who': color } as CSSProperties}>
      {count}
    </span>
  )
}

/** Snap guides as the nodes-snapping plugin draws them: red alignment lines, a blue line when edges meet, and a distance tag. */
export function SnapGuides({ lines, tags }: { lines: Array<{ x1: number; y1: number; x2: number; y2: number; tone?: 'red' | 'blue' }>; tags?: Array<{ x: number; y: number; text: string }> }) {
  return (
    <svg className="wv-fill wv-guides" width="100%" height="100%" aria-hidden>
      {lines.map((l, i) => (
        <line key={i} className={`wv-guides__line wv-guides__line--${l.tone ?? 'red'}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
      ))}
      {tags?.map((t) => (
        <g key={t.text + t.x} transform={`translate(${t.x} ${t.y})`}>
          <rect className="wv-guides__tag" x={-18} y={-9} width={36} height={18} rx={2} />
          <text className="wv-guides__text" textAnchor="middle" dominantBaseline="central">
            {t.text}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** The marquee a drag on empty canvas draws: the SDK's #1a1aff outline with its 7% fill. */
export function Marquee({ x, y, w, h, show = true }: { x: number; y: number; w: number; h: number; show?: boolean }) {
  return (
    <svg className="wv-fill wv-marquee" width="100%" height="100%" data-show={show || undefined} aria-hidden>
      <rect x={x} y={y} width={w} height={h} />
    </svg>
  )
}

/** The overlay the stage shows while files are dragged over it. */
export function DropTarget({ show, children, className }: { show: boolean; children?: ReactNode; className?: string }) {
  return (
    <div className={cx('wv-drop', className)} data-show={show || undefined}>
      <div className="wv-drop__box">
        <Upload size={28} strokeWidth={1.25} />
        {children && <span>{children}</span>}
      </div>
    </div>
  )
}

/** A small file chip (a file being dragged in from the desktop). Positioned by `at`, its top-left. */
export function FileChip({ name, at, show = true }: { name: string; at: { x: number; y: number }; show?: boolean }) {
  return (
    <span className="wv-file" data-show={show || undefined} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>
      <Cloud size={14} strokeWidth={1.5} />
      {name}
    </span>
  )
}

/** Plus and minus buttons used by zoom scenes. */
export const ZoomGlyphs = { Plus, Minus }
