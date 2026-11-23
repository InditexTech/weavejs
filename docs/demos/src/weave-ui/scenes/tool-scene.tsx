// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { NodeLayer, NodeSelection, type Box } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'

// A creation tool, start to finish: pick it in the toolbar (its tooltip shows), drag out the node with the
// crosshair, let go and the node is selected while the tool returns to select. The node is whatever `shape`
// draws inside the dragged box. Wrap this in a demo file; see rectangle-tool for the first one.

type S = { tool: ToolId; hover: boolean; box: Box | null; selected: boolean; show: boolean }

const FINAL: Box = { x: 310, y: 175, w: 340, h: 190 }
const REST: Point = { x: 780, y: 420 }
const START: Point = { x: FINAL.x, y: FINAL.y }
const END: Point = { x: FINAL.x + FINAL.w, y: FINAL.y + FINAL.h }

const boxOf = (a: Point, b: Point, square?: boolean): Box => {
  const w = Math.abs(b.x - a.x)
  const h = Math.abs(b.y - a.y)
  const side = Math.max(w, h)
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: square ? side : w, h: square ? side : h }
}
const straight = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

export interface ToolSceneProps extends DemoProps {
  /** The tool the scene picks; its tooltip text and shortcut come from the showcase's tool table. */
  tool: ToolId
  /** Toolbar groups; must contain `tool`. */
  groups: ToolId[][]
  /** Draws the node inside the dragged box. */
  shape: (box: Box) => ReactNode
  /** The dragged box is a square (a regular shape). */
  square?: boolean
  /** The registry key, used as the scene's class so its styles never clash. */
  name: string
}

export function ToolScene({ theme, tool, groups, shape, name, square }: ToolSceneProps) {
  const info = TOOL_INFO[tool]
  const initial: S = { tool: 'move', hover: false, box: null, selected: false, show: false }
  const end = square ? { x: START.x + FINAL.h, y: START.y + FINAL.h } : END
  const poster: S = { tool: 'move', hover: false, box: boxOf(START, end, square), selected: true, show: true }

  async function script(a: Act<S>) {
    await a.wait(600)
    a.mark('pick')
    await a.move(`tool-${tool}`)
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: `tool-${tool}` })
    await a.set({ hover: false, tool })
    await a.wait(400)
    a.mark('draw')
    await a.move(START)
    await a.wait(250)
    // A straight drag with the button down: the ripple marks the press, and the corner of the
    // node rides the tip of the crosshair the whole way
    await a.click()
    await a.move(end, { duration: 1300, path: straight, onMove: (p) => a.put({ box: boxOf(START, p, square), show: true }) })
    await a.set({ tool: 'move', selected: true })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    await a.move(REST)
    await a.set({ box: null })
    await a.wait(700)
  }

  return (
    <Stage<S> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === tool ? 'crosshair' : undefined}>
            <NodeLayer>
              <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
              <rect className="wv-scene__ghost" x="96.5" y="392.5" width="210" height="110" />
              {s.box && (
                <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                  {shape(s.box)}
                </g>
              )}
              {s.box && <NodeSelection {...s.box} show={s.selected} />}
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? tool : undefined} groups={groups} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect(`tool-${tool}`)} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}
