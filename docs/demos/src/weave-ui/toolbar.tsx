// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { LucideIcon } from 'lucide-react'
import { Brush, Circle, Eraser, Frame, Hand, Hexagon, Image, Images, Waypoints, MessageSquare, MousePointer2, MoveUpRight, Pentagon, PenLine, PenTool, Redo2, Ruler, Square, Spline, Star, StickyNote, Type, Undo2, Video } from 'lucide-react'
import type { Rect } from '../../kit'
import './toolbar.css'

export type ToolId =
  | 'move'
  | 'hand'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'regular-polygon'
  | 'star'
  | 'line'
  | 'arrow'
  | 'stroke'
  | 'connector'
  | 'measure'
  | 'brush'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'image'
  | 'images'
  | 'video'
  | 'frame'
  | 'sticky'
  | 'comment'
  | 'undo'
  | 'redo'

// Icons and tooltip texts follow the showcase's tool hooks (use-*-tools.tsx): lucide, 1px strokes.
export const TOOL_INFO: Record<ToolId, { icon: LucideIcon; label: string; key?: string }> = {
  move: { icon: MousePointer2, label: 'Selection tool' },
  hand: { icon: Hand, label: 'Move tool', key: 'M' },
  rectangle: { icon: Square, label: 'Rectangle tool', key: 'R' },
  ellipse: { icon: Circle, label: 'Ellipse tool', key: 'E' },
  polygon: { icon: Pentagon, label: 'Polygon tool', key: 'P' },
  'regular-polygon': { icon: Hexagon, label: 'Regular polygon tool' },
  star: { icon: Star, label: 'Star tool', key: 'J' },
  line: { icon: PenLine, label: 'Line tool', key: 'L' },
  arrow: { icon: MoveUpRight, label: 'Arrow tool' },
  stroke: { icon: Spline, label: 'Stroke tool' },
  connector: { icon: Waypoints, label: 'Connector tool' },
  measure: { icon: Ruler, label: 'Measure tool' },
  brush: { icon: Brush, label: 'Brush tool', key: 'B' },
  pen: { icon: PenTool, label: 'Pen tool' },
  eraser: { icon: Eraser, label: 'Eraser tool' },
  text: { icon: Type, label: 'Text tool', key: 'T' },
  image: { icon: Image, label: 'Image tool', key: 'I' },
  images: { icon: Images, label: 'Images tool', key: 'O' },
  video: { icon: Video, label: 'Video tool' },
  frame: { icon: Frame, label: 'Frame tool' },
  sticky: { icon: StickyNote, label: 'Sticky note tool', key: 'N' },
  comment: { icon: MessageSquare, label: 'Comment tool' },
  undo: { icon: Undo2, label: 'Undo' },
  redo: { icon: Redo2, label: 'Redo' },
}

// The showcase's tool groups, in its order (overlay/tools-overlay.main.tsx).
export const DEFAULT_GROUPS: ToolId[][] = [['move', 'hand'], ['rectangle', 'ellipse', 'text', 'image', 'frame'], ['undo', 'redo']]

export interface WeaveToolbarProps {
  active?: ToolId
  /** The tool under the pointer, drawn with the hover fill (the scene drives hover, not a real pointer). */
  hovered?: ToolId
  /** Tool groups, separated by dividers. Defaults to the showcase's three. */
  groups?: ToolId[][]
  /** Tools drawn dimmed, as the showcase does for unavailable history. */
  disabled?: ToolId[]
  className?: string
}

/** The showcase's vertical tools toolbar: white, square-cornered, 4px padding and gap, 40px buttons, 1px strokes. */
export function WeaveToolbar({ active, hovered, groups = DEFAULT_GROUPS, disabled = ['undo', 'redo'], className }: WeaveToolbarProps) {
  return (
    <div className={`wv-toolbar${className ? ` ${className}` : ''}`} data-target="toolbar">
      {groups.map((group, i) => (
        <div className="wv-toolbar__group" key={i}>
          {i > 0 && <div className="wv-toolbar__divider" />}
          {group.map((id) => {
            const Icon = TOOL_INFO[id].icon
            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                className="wv-toolbar__button"
                data-target={`tool-${id}`}
                data-active={active === id || undefined}
                data-hover={(hovered === id && active !== id) || undefined}
                data-disabled={disabled.includes(id) || undefined}
                aria-label={id}
              >
                <Icon size={40} strokeWidth={1} className="wv-toolbar__icon" />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** The showcase's tooltip: dark, square-cornered, 12px to the right of its button, with the shortcut after the name. */
export function WeaveTooltip({ show, at, children, shortcut }: { show: boolean; at: Rect; children: string; shortcut?: string }) {
  return (
    <span
      className="wv-tooltip"
      role="tooltip"
      data-show={(show && at.width > 0) || undefined}
      style={{ left: at.x + at.width + 12, top: at.y + at.height / 2 }}
    >
      <span>{children}</span>
      {shortcut && <span className="wv-tooltip__key">{shortcut}</span>}
    </span>
  )
}
