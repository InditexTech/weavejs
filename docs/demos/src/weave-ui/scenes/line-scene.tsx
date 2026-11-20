// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { LineHandles, NodeLayer } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'

// Line-like nodes (line, arrow, measure) are defined by two end points. LineToolScene creates one with the
// tool (a press-drag-release, or two clicks for the measure tool); LineNodeScene selects one, moves it and
// drags an end handle. Both draw the node with `render(a, b)`.

type Line = { a: Point; b: Point }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const REST: Point = { x: 790, y: 440 }
const FINAL: Line = { a: { x: 310, y: 380 }, b: { x: 660, y: 190 } }

const ghosts = (
  <>
    <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
    <rect className="wv-scene__ghost" x="96.5" y="392.5" width="210" height="110" />
  </>
)

type ToolS = { tool: ToolId; hover: boolean; line: Line | null; selected: boolean; show: boolean }

export interface LineToolSceneProps extends DemoProps {
  tool: ToolId
  groups: ToolId[][]
  render: (a: Point, b: Point) => ReactNode
  name: string
  /** drag: press, drag and release. clicks: click the start, move, click the end (the measure tool). */
  mode?: 'drag' | 'clicks'
}

export function LineToolScene({ theme, tool, groups, render, name, mode = 'drag' }: LineToolSceneProps) {
  const info = TOOL_INFO[tool]
  const initial: ToolS = { tool: 'move', hover: false, line: null, selected: false, show: false }
  const poster: ToolS = { tool: 'move', hover: false, line: FINAL, selected: true, show: true }

  async function script(a: Act<ToolS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move(`tool-${tool}`)
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: `tool-${tool}` })
    await a.set({ hover: false, tool })
    await a.wait(400)
    a.mark('draw')
    await a.move(FINAL.a)
    await a.wait(250)
    await a.click()
    await a.move(FINAL.b, { duration: 1300, path: STRAIGHT, onMove: (p) => a.put({ line: { a: FINAL.a, b: p }, show: true }) })
    if (mode === 'clicks') await a.click()
    await a.set({ tool: 'move', selected: true })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    await a.move(REST)
    await a.set({ line: null })
    await a.wait(700)
  }

  return (
    <Stage<ToolS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === tool ? 'crosshair' : undefined}>
            <NodeLayer>
              {ghosts}
              {s.line && <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>{render(s.line.a, s.line.b)}</g>}
              {s.line && <LineHandles x1={s.line.a.x} y1={s.line.a.y} x2={s.line.b.x} y2={s.line.b.y} show={s.selected} />}
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

type NodeS = { line: Line; selected: boolean; show: boolean }
const START: Line = { a: { x: 230, y: 330 }, b: { x: 430, y: 250 } }
const SHIFT = { dx: 150, dy: -90 }
const MOVED: Line = { a: { x: START.a.x + SHIFT.dx, y: START.a.y + SHIFT.dy }, b: { x: START.b.x + SHIFT.dx, y: START.b.y + SHIFT.dy } }
const STRETCH = { dx: 150, dy: 130 }
const mid = (l: Line): Point => ({ x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 })

export interface LineNodeSceneProps extends DemoProps {
  render: (a: Point, b: Point) => ReactNode
  name: string
  groups?: ToolId[][]
}

export function LineNodeScene({ theme, render, name, groups }: LineNodeSceneProps) {
  const final: Line = { a: MOVED.a, b: { x: MOVED.b.x + STRETCH.dx, y: MOVED.b.y + STRETCH.dy } }
  const initial: NodeS = { line: START, selected: false, show: true }
  const poster: NodeS = { line: final, selected: true, show: true }

  async function script(a: Act<NodeS>) {
    await a.wait(700)
    a.mark('select')
    await a.move(mid(START))
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)
    a.mark('move')
    const from = mid(START)
    await a.move({ x: from.x + SHIFT.dx, y: from.y + SHIFT.dy }, {
      duration: 1100,
      path: STRAIGHT,
      onMove: (p) => a.put({ line: { a: { x: START.a.x + (p.x - from.x), y: START.a.y + (p.y - from.y) }, b: { x: START.b.x + (p.x - from.x), y: START.b.y + (p.y - from.y) } } }),
    })
    await a.wait(500)
    a.mark('stretch')
    await a.move(MOVED.b, { duration: 700 })
    await a.wait(250)
    await a.move({ x: MOVED.b.x + STRETCH.dx, y: MOVED.b.y + STRETCH.dy }, {
      duration: 1100,
      path: STRAIGHT,
      onMove: (p) => a.put({ line: { a: MOVED.a, b: p } }),
    })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ line: START })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<NodeS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            {ghosts}
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>{render(s.line.a, s.line.b)}</g>
            <LineHandles x1={s.line.a.x} y1={s.line.a.y} x2={s.line.b.x} y2={s.line.b.y} show={s.selected} />
          </NodeLayer>
          <div className="wv-scene__toolbar">
            <WeaveToolbar active="move" groups={groups} />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
