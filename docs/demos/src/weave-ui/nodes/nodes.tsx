// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode, SVGProps } from 'react'
import '../fill.css'
import '../selection.css'
import './nodes.css'

// Weave nodes as the canvas paints them: SVG, in canvas coordinates, with the SDK's default
// look (white fill, 1px black stroke). Put them inside <NodeLayer>, which fills its positioned
// parent; `x, y, w, h` is the node's box. None of these reads state: the scene passes geometry.

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Paint {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  className?: string
}

const paint = ({ fill = '#fff', stroke = '#000', strokeWidth = 1, opacity, className }: Paint) => ({ fill, stroke, strokeWidth, opacity, className: `wv-node${className ? ` ${className}` : ''}` })

/** The svg every node sits in. Fills its positioned parent; ignores the pointer. */
export function NodeLayer({ children, className, ...rest }: { children?: ReactNode; className?: string } & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg {...rest} className={`wv-fill wv-node-layer${className ? ` ${className}` : ''}`} width="100%" height="100%" aria-hidden>
      {children}
    </svg>
  )
}

export function RectNode({ x, y, w, h, ...p }: Box & Paint) {
  return <rect {...paint(p)} x={x + 0.5} y={y + 0.5} width={Math.max(0, w - 1)} height={Math.max(0, h - 1)} />
}

export function EllipseNode({ x, y, w, h, ...p }: Box & Paint) {
  return <ellipse {...paint(p)} cx={x + w / 2} cy={y + h / 2} rx={Math.max(0, w / 2 - 0.5)} ry={Math.max(0, h / 2 - 0.5)} />
}

/** Any polygon inside the box; `points` are fractions (0 to 1) of the box. */
export function PolygonNode({ x, y, w, h, points, ...p }: Box & Paint & { points: Array<[number, number]> }) {
  return <polygon {...paint(p)} strokeLinejoin="round" points={points.map(([px, py]) => `${x + px * w},${y + py * h}`).join(' ')} />
}

/** The SDK's pentagon preset (nodes/polygon/presets.ts), as fractions of the box. */
export const PENTAGON: Array<[number, number]> = [[0.5, 0], [0.975528, 0.345492], [0.793893, 0.904508], [0.206107, 0.904508], [0.024472, 0.345492]]

/** A regular polygon with `sides` sides inscribed in the box's ellipse, first vertex at the top. */
export function regularPoints(sides: number): Array<[number, number]> {
  return Array.from({ length: sides }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides
    return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)] as [number, number]
  })
}

export function RegularPolygonNode({ sides = 6, ...rest }: Box & Paint & { sides?: number }) {
  return <PolygonNode {...rest} points={regularPoints(sides)} />
}

/** A star with `points` tips; `inner` is the inner radius as a fraction of the outer one. */
export function starPoints(tips: number, inner: number): Array<[number, number]> {
  return Array.from({ length: tips * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 0.5 : 0.5 * inner
    const a = -Math.PI / 2 + (i * Math.PI) / tips
    return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)] as [number, number]
  })
}

export function StarNode({ tips = 5, inner = 0.5, ...rest }: Box & Paint & { tips?: number; inner?: number }) {
  return <PolygonNode {...rest} points={starPoints(tips, inner)} />
}

const INK = 'var(--wv-ink)'

export function LineNode({ x1, y1, x2, y2, stroke = INK, strokeWidth = 1, className }: { x1: number; y1: number; x2: number; y2: number } & Paint) {
  return <line className={`wv-node wv-node--line${className ? ` ${className}` : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke }} strokeWidth={strokeWidth} strokeLinecap="round" />
}

export function ArrowNode({ x1, y1, x2, y2, stroke = INK, strokeWidth = 1, head = 12, className }: { x1: number; y1: number; x2: number; y2: number; head?: number } & Paint) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const wing = (d: number) => `${x2 - head * Math.cos(a + d)},${y2 - head * Math.sin(a + d)}`
  return (
    <g className={`wv-node wv-node--arrow${className ? ` ${className}` : ''}`} style={{ stroke }} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={`${wing(0.45)} ${x2},${y2} ${wing(-0.45)}`} />
    </g>
  )
}

/** A text node: the words as one run in the showcase's sans. `fontSize` is in canvas px. */
export function TextNode({ x, y, children, fontSize = 20, fill = INK, anchor = 'start', weight = 400, className }: { x: number; y: number; children: string; fontSize?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; className?: string }) {
  return (
    <text className={`wv-node wv-node--text${className ? ` ${className}` : ''}`} x={x} y={y} fontSize={fontSize} style={{ fill }} textAnchor={anchor} fontWeight={weight} dominantBaseline="hanging">
      {children}
    </text>
  )
}

/** An image node's placeholder: a quiet well with a mountain-and-sun glyph. Never a made-up photo. */
export function ImageNode({ x, y, w, h, className }: Box & { className?: string }) {
  const s = Math.min(w, h) * 0.28
  const cx = x + w / 2
  const cy = y + h / 2
  return (
    <g className={`wv-node wv-node--image${className ? ` ${className}` : ''}`}>
      <rect className="wv-node__well" x={x + 0.5} y={y + 0.5} width={Math.max(0, w - 1)} height={Math.max(0, h - 1)} />
      <circle className="wv-node__glyph" cx={cx + s * 0.45} cy={cy - s * 0.35} r={s * 0.16} />
      <path className="wv-node__glyph" d={`M${cx - s * 0.9} ${cy + s * 0.6} L${cx - s * 0.25} ${cy - s * 0.25} L${cx + s * 0.15} ${cy + s * 0.25} L${cx + s * 0.4} ${cy - s * 0.02} L${cx + s * 0.9} ${cy + s * 0.6} Z`} />
    </g>
  )
}

/** A frame: a white board with its title above it, as the SDK draws it (Arial 20, black). */
export function FrameNode({ x, y, w, h, title = 'Frame', fill = '#fff', className }: Box & { title?: string; fill?: string; className?: string }) {
  return (
    <g className={`wv-node wv-node--frame${className ? ` ${className}` : ''}`}>
      <text className="wv-node__title" x={x} y={y - 8} fontSize={14} style={{ fill: INK }}>
        {title}
      </text>
      <rect x={x + 0.5} y={y + 0.5} width={Math.max(0, w - 1)} height={Math.max(0, h - 1)} fill={fill} stroke="#000" strokeWidth={1} />
    </g>
  )
}

/** A sticky note: a pastel square with a soft shadow and a faint fold. `text` sits inside, top left. */
export function StickyNode({ x, y, w, h, color = '#FEF08A', text, className }: Box & { color?: string; text?: string; className?: string }) {
  return (
    <g className={`wv-node wv-node--sticky${className ? ` ${className}` : ''}`}>
      <rect className="wv-node__sticky" x={x} y={y} width={w} height={h} rx={2} fill={color} />
      <path className="wv-node__fold" d={`M${x + w} ${y + h - 18} L${x + w - 18} ${y + h} L${x + w} ${y + h} Z`} />
      {text && (
        <text x={x + 14} y={y + 14} fontSize={16} fill="#1F2937" dominantBaseline="hanging">
          {text}
        </text>
      )}
    </g>
  )
}

/** A connector between two points: an elbow path with round anchor dots at both ends, as the SDK draws it. */
export function ConnectorNode({ x1, y1, x2, y2, arrow = true, className }: { x1: number; y1: number; x2: number; y2: number; arrow?: boolean; className?: string }) {
  const mid = (x1 + x2) / 2
  return (
    <g className={`wv-node wv-node--connector${className ? ` ${className}` : ''}`}>
      <path d={`M${x1} ${y1} H${mid} V${y2} H${x2}`} fill="none" style={{ stroke: INK }} strokeWidth={1} strokeLinejoin="round" />
      {arrow && <path d={`M${x2 - 9} ${y2 - 5} L${x2} ${y2} L${x2 - 9} ${y2 + 5}`} fill="none" style={{ stroke: INK }} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />}
      <circle className="wv-node__anchor" cx={x1} cy={y1} r={3.5} />
      <circle className="wv-node__anchor" cx={x2} cy={y2} r={3.5} />
    </g>
  )
}

/** A measure node: a dimension line with end ticks and its length in the SDK's #FF3366 monospace. */
export function MeasureNode({ x1, y1, x2, y2, label, className }: { x1: number; y1: number; x2: number; y2: number; label: string; className?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const nx = -Math.sin(a) * 6
  const ny = Math.cos(a) * 6
  return (
    <g className={`wv-node wv-node--measure${className ? ` ${className}` : ''}`} stroke="#FF3366" strokeWidth={1} fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 - nx} y1={y1 - ny} x2={x1 + nx} y2={y1 + ny} />
      <line x1={x2 - nx} y1={y2 - ny} x2={x2 + nx} y2={y2 + ny} />
      <text className="wv-node__measure" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} fontSize={14} fill="#FF3366" stroke="none" textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

/** A freehand stroke through `points`, drawn as one smooth round-capped path. */
export function StrokeNode({ points, stroke = INK, strokeWidth = 3, className }: { points: Array<[number, number]> } & Paint) {
  const d = points.length < 2 ? '' : points.reduce((acc, [px, py], i) => {
    if (i === 0) return `M${px} ${py}`
    const [qx, qy] = points[i - 1]
    return `${acc} Q${qx} ${qy} ${(qx + px) / 2} ${(qy + py) / 2}`
  }, '') + ` T${points[points.length - 1][0]} ${points[points.length - 1][1]}`
  return <path className={`wv-node wv-node--stroke${className ? ` ${className}` : ''}`} d={d} fill="none" style={{ stroke }} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
}

/** The SDK's selection box around a node, in canvas coordinates: 1px blue outline, round corner anchors, pill side anchors. */
export function NodeSelection({ x, y, w, h, show = true, className }: Box & { show?: boolean; className?: string }) {
  const side = (cx: number, cy: number, sw: number, sh: number) => <rect className="wv-selection__anchor" key={`${cx}${cy}`} x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} rx={3} />
  return (
    <g className={`wv-node-selection${className ? ` ${className}` : ''}`} data-show={show || undefined}>
      <rect className="wv-selection__box" x={x} y={y} width={w} height={h} />
      {side(x + w / 2, y, 18, 6)}
      {side(x + w / 2, y + h, 18, 6)}
      {side(x, y + h / 2, 6, 18)}
      {side(x + w, y + h / 2, 6, 18)}
      {[
        [x, y, 'resize-nwse'],
        [x + w, y, 'resize-nesw'],
        [x, y + h, 'resize-nesw'],
        [x + w, y + h, 'resize-nwse'],
      ].map(([cx, cy, cursor]) => (
        <circle className="wv-selection__anchor" key={`${cx}${cy}`} cx={cx as number} cy={cy as number} r={4.5} data-cursor={cursor as string} />
      ))}
    </g>
  )
}

/** End handles of a line-like node (line, arrow, measure), drawn as the SDK does: white dots with a 1px black stroke. */
export function LineHandles({ x1, y1, x2, y2, show = true, className }: { x1: number; y1: number; x2: number; y2: number; show?: boolean; className?: string }) {
  return (
    <g className={`wv-node-selection${className ? ` ${className}` : ''}`} data-show={show || undefined}>
      <circle className="wv-node__anchor wv-node__anchor--end" cx={x1} cy={y1} r={5} />
      <circle className="wv-node__anchor wv-node__anchor--end" cx={x2} cy={y2} r={5} />
    </g>
  )
}

/** A video node's placeholder: a quiet well with a play (or pause) glyph and, when \`progress\` is set, a thin progress line along the bottom. */
export function VideoNode({ x, y, w, h, playing = false, progress, className }: Box & { playing?: boolean; progress?: number; className?: string }) {
  const cx = x + w / 2
  const cy = y + h / 2
  const r = Math.min(w, h) * 0.16
  return (
    <g className={`wv-node wv-node--video${className ? ` ${className}` : ''}`}>
      <rect className="wv-node__well" x={x + 0.5} y={y + 0.5} width={Math.max(0, w - 1)} height={Math.max(0, h - 1)} />
      <circle className="wv-node__play" cx={cx} cy={cy} r={r} />
      {playing ? (
        <g className="wv-node__glyph-solid">
          <rect x={cx - r * 0.38} y={cy - r * 0.45} width={r * 0.26} height={r * 0.9} />
          <rect x={cx + r * 0.12} y={cy - r * 0.45} width={r * 0.26} height={r * 0.9} />
        </g>
      ) : (
        <path className="wv-node__glyph-solid" d={`M${cx - r * 0.3} ${cy - r * 0.48} L${cx + r * 0.52} ${cy} L${cx - r * 0.3} ${cy + r * 0.48} Z`} />
      )}
      {progress !== undefined && (
        <g>
          <rect className="wv-node__track" x={x + 12} y={y + h - 14} width={Math.max(0, w - 24)} height={3} />
          <rect className="wv-node__bar" x={x + 12} y={y + h - 14} width={Math.max(0, (w - 24) * progress)} height={3} />
        </g>
      )}
    </g>
  )
}
