// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ChevronUp } from 'lucide-react'
import { TOOL_INFO, type ToolId } from './toolbar'
import './bottom-toolbar.css'

const GROUPS: ToolId[][] = [['hand', 'move', 'eraser'], ['rectangle', 'brush', 'image', 'video', 'text', 'frame', 'sticky', 'comment'], ['undo', 'redo']]

/** The room page's tool bar: a rounded pill at the bottom of the canvas, tool groups split by rules, with folding tabs above the groups. */
export function BottomToolbar({ active, hovered, className }: { active: ToolId; hovered?: ToolId; className?: string }) {
  return (
    <div className={`wv-bottom${className ? ` ${className}` : ''}`} data-target="toolbar">
      <div className="wv-bottom__tabs">
        {[0, 1, 2].map((i) => (
          <span className="wv-bottom__tab" key={i}>
            <ChevronUp size={12} strokeWidth={1.25} />
          </span>
        ))}
      </div>
      <div className="wv-bottom__pill">
        {GROUPS.map((group, gi) => (
          <div className="wv-bottom__group" key={gi}>
            {gi > 0 && <span className="wv-bottom__rule" />}
            {group.map((id) => {
              const Icon = TOOL_INFO[id].icon
              return (
                <span key={id} className="wv-bottom__button" data-target={`bt-${id}`} data-active={active === id || undefined} data-hover={(hovered === id && active !== id) || undefined} data-disabled={id === 'redo' || id === 'undo' || undefined}>
                  <Icon size={20} strokeWidth={1.25} />
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
