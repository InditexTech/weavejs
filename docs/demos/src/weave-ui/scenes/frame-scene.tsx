// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { FrameNode, NodeLayer, NodeSelection, RectNode, StickyNode, type Box } from '../nodes/nodes'
import { WeaveToolbar } from '../toolbar'
import './scenes.css'
import './frame-scene.css'

const REST: Point = { x: 790, y: 460 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

// ---- Frame node: a click inside the frame leaves it alone, a click on its edge selects it -----------------------------

type FrameS = { dx: number; dy: number; selected: boolean; edge: boolean; show: boolean }
const FRAME: Box = { x: 250, y: 170, w: 420, h: 260 }
const CHILD: Box = { x: 320, y: 250, w: 130, h: 120 }
const MOVE = { dx: 110, dy: -50 }

export function FrameNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: FrameS = { dx: 0, dy: 0, selected: false, edge: false, show: true }
  const poster: FrameS = { dx: MOVE.dx, dy: MOVE.dy, selected: true, edge: false, show: true }

  async function script(a: Act<FrameS>) {
    await a.wait(700)
    a.mark('inside')
    await a.move({ x: FRAME.x + 300, y: FRAME.y + 120 })
    await a.wait(300)
    await a.click()
    await a.wait(900)
    a.mark('edge')
    const edge: Point = { x: FRAME.x + 220, y: FRAME.y }
    await a.move(edge, { duration: 800 })
    await a.set({ edge: true })
    await a.wait(400)
    await a.click()
    await a.set({ selected: true })
    await a.wait(700)
    a.mark('move')
    await a.move({ x: edge.x + MOVE.dx, y: edge.y + MOVE.dy }, {
      duration: 1200,
      path: STRAIGHT,
      onMove: (p) => a.put({ dx: p.x - edge.x, dy: p.y - edge.y }),
    })
    await a.set({ edge: false })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ dx: 0, dy: 0 })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<FrameS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        const f: Box = { ...FRAME, x: FRAME.x + s.dx, y: FRAME.y + s.dy }
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                <FrameNode {...f} title="Frame 1" />
                <StickyNode x={CHILD.x + s.dx} y={CHILD.y + s.dy} w={CHILD.w} h={CHILD.h} text="Idea" />
                <RectNode x={CHILD.x + s.dx + 170} y={CHILD.y + s.dy + 20} w={90} h={70} />
              </g>
              <line className="wv-frame__edge" data-show={s.edge || undefined} x1={f.x} y1={f.y} x2={f.x + f.w} y2={f.y} />
              <NodeSelection {...f} show={s.selected} />
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" />
            </div>
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Group node: select two nodes, group them, move them as one -------------------------------------------------

type GroupS = { marquee: Box | null; picked: boolean; grouped: boolean; dx: number; dy: number; show: boolean }
const A: Box = { x: 240, y: 210, w: 150, h: 100 }
const B: Box = { x: 430, y: 280, w: 150, h: 100 }
const BOUNDS: Box = { x: 240, y: 210, w: 340, h: 170 }
const GMOVE = { dx: 150, dy: -60 }

export function GroupNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: GroupS = { marquee: null, picked: false, grouped: false, dx: 0, dy: 0, show: true }
  const poster: GroupS = { marquee: null, picked: false, grouped: true, dx: GMOVE.dx, dy: GMOVE.dy, show: true }

  async function script(a: Act<GroupS>) {
    await a.wait(700)
    a.mark('select')
    const s0: Point = { x: 210, y: 180 }
    const s1: Point = { x: 610, y: 410 }
    await a.move(s0)
    await a.wait(250)
    await a.click()
    await a.move(s1, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ marquee: { x: s0.x, y: s0.y, w: p.x - s0.x, h: p.y - s0.y } }) })
    await a.set({ marquee: null, picked: true })
    await a.wait(700)
    a.mark('group')
    await a.key('Ctrl G')
    await a.set({ grouped: true, picked: false })
    await a.wait(900)
    a.mark('move')
    const from: Point = { x: BOUNDS.x + 80, y: BOUNDS.y + 40 }
    await a.move(from, { duration: 700 })
    await a.wait(250)
    await a.move({ x: from.x + GMOVE.dx, y: from.y + GMOVE.dy }, {
      duration: 1200,
      path: STRAIGHT,
      onMove: (p) => a.put({ dx: p.x - from.x, dy: p.y - from.y }),
    })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ grouped: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ dx: 0, dy: 0 })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<GroupS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        const b: Box = { ...BOUNDS, x: BOUNDS.x + s.dx, y: BOUNDS.y + s.dy }
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                <RectNode x={A.x + s.dx} y={A.y + s.dy} w={A.w} h={A.h} />
                <RectNode x={B.x + s.dx} y={B.y + s.dy} w={B.w} h={B.h} />
              </g>
              {s.marquee && <rect className="wv-frame__marquee" x={s.marquee.x} y={s.marquee.y} width={Math.max(0, s.marquee.w)} height={Math.max(0, s.marquee.h)} />}
              <g className="wv-node-selection" data-show={s.picked || undefined}>
                <rect className="wv-selection__box" x={A.x} y={A.y} width={A.w} height={A.h} />
                <rect className="wv-selection__box" x={B.x} y={B.y} width={B.w} height={B.h} />
              </g>
              <NodeSelection {...b} show={s.grouped} />
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" />
            </div>
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}
