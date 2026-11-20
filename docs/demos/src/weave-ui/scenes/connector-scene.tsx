// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { ConnectorNode, NodeLayer, NodeSelection, RectNode, type Box } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'

// The connector tool links two nodes: hover a node to see its anchors, click an anchor on the first, then
// one on the second. ConnectorNodeScene shows the result following its nodes when one is moved.

const REST: Point = { x: 790, y: 440 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const A: Box = { x: 170, y: 230, w: 150, h: 90 }
const B: Box = { x: 600, y: 140, w: 170, h: 90 }
const right = (b: Box): Point => ({ x: b.x + b.w, y: b.y + b.h / 2 })
const left = (b: Box): Point => ({ x: b.x, y: b.y + b.h / 2 })
const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

const ghost = <rect className="wv-scene__ghost" x="700.5" y="340.5" width="200" height="110" />

/** The four anchors a hovered node shows on its edges; `picked` fills the one already chosen. */
function Anchors({ box, show, picked }: { box: Box; show: boolean; picked?: 'right' | 'left' }) {
  const pts: Array<['top' | 'right' | 'bottom' | 'left', number, number]> = [
    ['top', box.x + box.w / 2, box.y],
    ['right', box.x + box.w, box.y + box.h / 2],
    ['bottom', box.x + box.w / 2, box.y + box.h],
    ['left', box.x, box.y + box.h / 2],
  ]
  return (
    <g className="wv-node-selection" data-show={show || undefined}>
      {pts.map(([side, x, y]) => (
        <circle key={side} className="wv-node__anchor" cx={x} cy={y} r={4.5} style={picked === side ? { fill: 'var(--ss-accent)' } : undefined} />
      ))}
    </g>
  )
}

type ToolS = { tool: ToolId; hover: boolean; near: 'a' | 'b' | null; from: boolean; linked: boolean; selected: boolean }

export function ConnectorToolScene({ theme, groups, name }: DemoProps & { groups: ToolId[][]; name: string }) {
  const info = TOOL_INFO.connector
  const initial: ToolS = { tool: 'move', hover: false, near: null, from: false, linked: false, selected: false }
  const poster: ToolS = { tool: 'move', hover: false, near: null, from: false, linked: true, selected: true }

  async function script(a: Act<ToolS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-connector')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-connector' })
    await a.set({ hover: false, tool: 'connector' })
    await a.wait(400)
    a.mark('from')
    await a.move(center(A))
    await a.set({ near: 'a' })
    await a.wait(400)
    await a.move(right(A), { duration: 600 })
    await a.click()
    await a.set({ from: true })
    await a.wait(300)
    a.mark('to')
    await a.move(center(B), { duration: 1000 })
    await a.set({ near: 'b' })
    await a.wait(400)
    await a.move(left(B), { duration: 600 })
    await a.click()
    await a.set({ linked: true, near: null, from: false, tool: 'move', selected: true })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ linked: false })
    await a.move(REST)
    await a.wait(700)
  }

  return (
    <Stage<ToolS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              {ghost}
              <RectNode {...A} />
              <RectNode {...B} />
              <g style={{ opacity: s.linked ? 1 : 0, transition: 'opacity 0.25s ease' }}>
                <ConnectorNode x1={right(A).x} y1={right(A).y} x2={left(B).x} y2={left(B).y} />
              </g>
              <Anchors box={A} show={s.near === 'a' || s.from} picked={s.from ? 'right' : undefined} />
              <Anchors box={B} show={s.near === 'b'} />
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? 'connector' : undefined} groups={groups} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-connector')} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}

type NodeS = { b: Box; selected: boolean; show: boolean }
const B_MOVED: Box = { ...B, x: 540, y: 330 }
const initialNode: NodeS = { b: B, selected: false, show: true }
const posterNode: NodeS = { b: B_MOVED, selected: true, show: true }

export function ConnectorNodeScene({ theme, groups, name }: DemoProps & { groups?: ToolId[][]; name: string }) {
  async function script(a: Act<NodeS>) {
    await a.wait(700)
    a.mark('select')
    await a.move(center(B))
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)
    a.mark('move')
    const from = center(B)
    await a.move(center(B_MOVED), {
      duration: 1400,
      path: STRAIGHT,
      onMove: (p) => a.put({ b: { ...B, x: B.x + (p.x - from.x), y: B.y + (p.y - from.y) } }),
    })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ b: B })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<NodeS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initialNode} poster={posterNode} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            {ghost}
            <RectNode {...A} />
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <RectNode {...s.b} />
              <ConnectorNode x1={right(A).x} y1={right(A).y} x2={left(s.b).x} y2={left(s.b).y} />
            </g>
            <NodeSelection {...s.b} show={s.selected} />
          </NodeLayer>
          <div className="wv-scene__toolbar">
            <WeaveToolbar active="move" groups={groups} />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
