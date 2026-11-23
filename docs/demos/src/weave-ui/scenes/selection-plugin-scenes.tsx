// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { NodeLayer, NodeSelection, RectNode, type Box } from '../nodes/nodes'
import { SnapGuides } from '../overlays/overlays'
import { WeaveToolbar } from '../toolbar'
import './scenes.css'
import './frame-scene.css'
import './collab-scenes.css'

const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const box = (b: Box) => ({ x: b.x, y: b.y, w: b.w, h: b.h })
const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const REST: Point = { x: 790, y: 460 }
const Toolbar = () => (
  <div className="wv-scene__toolbar">
    <WeaveToolbar active="move" />
  </div>
)

// ---- Nodes selection: the foundation for moving and deleting; marquee two nodes, move them, delete them ------------

type SelS = { marquee: Box | null; picked: boolean; dx: number; dy: number; gone: boolean }
const A: Box = { x: 280, y: 200, w: 150, h: 100 }
const B: Box = { x: 480, y: 270, w: 150, h: 100 }
const C: Box = { x: 340, y: 400, w: 150, h: 70 }
const BOUNDS: Box = { x: 280, y: 200, w: 350, h: 170 }
const MOVE = { dx: 120, dy: -50 }

export function NodesSelectionScene({ theme, name }: DemoProps & { name: string }) {
  const initial: SelS = { marquee: null, picked: false, dx: 0, dy: 0, gone: false }
  const poster: SelS = { marquee: null, picked: true, dx: MOVE.dx, dy: MOVE.dy, gone: false }

  async function script(a: Act<SelS>) {
    await a.wait(700)
    a.mark('marquee')
    const s0: Point = { x: 250, y: 170 }
    const s1: Point = { x: 660, y: 390 }
    await a.move(s0)
    await a.wait(250)
    await a.click()
    await a.move(s1, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ marquee: { x: s0.x, y: s0.y, w: p.x - s0.x, h: p.y - s0.y } }) })
    await a.set({ marquee: null, picked: true })
    await a.wait(700)
    a.mark('move')
    const from: Point = { x: 330, y: 240 }
    await a.move(from, { duration: 700 })
    await a.wait(250)
    await a.move({ x: from.x + MOVE.dx, y: from.y + MOVE.dy }, { duration: 1100, path: STRAIGHT, onMove: (p) => a.put({ dx: p.x - from.x, dy: p.y - from.y }) })
    await a.wait(900)
    a.mark('delete')
    await a.key('Delete')
    await a.set({ gone: true, picked: false })
    await a.wait(2000)
    a.mark('reset')
    await a.move(REST)
    await a.set({ gone: false })
    await a.wait(300)
    a.put({ dx: 0, dy: 0 })
    await a.wait(700)
  }

  const shift = (b: Box, s: SelS): Box => ({ ...b, x: b.x + s.dx, y: b.y + s.dy })
  return (
    <Stage<SelS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <g style={{ opacity: s.gone ? 0 : 1, transition: 'opacity 0.3s ease' }}>
              <RectNode {...box(shift(A, s))} />
              <RectNode {...box(shift(B, s))} />
            </g>
            <RectNode {...box(C)} />
            {s.marquee && <rect className="wv-frame__marquee" x={s.marquee.x} y={s.marquee.y} width={Math.max(0, s.marquee.w)} height={Math.max(0, s.marquee.h)} />}
            <NodeSelection {...box(shift(BOUNDS, s))} show={s.picked} />
          </NodeLayer>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Multi-selection feedback: with several nodes selected, each one gets its own outline -------------------------------

type MultiS = { sel: string[] }
const M: Record<string, Box> = { a: { x: 260, y: 190, w: 140, h: 90 }, b: { x: 460, y: 250, w: 140, h: 90 }, c: { x: 330, y: 380, w: 140, h: 90 } }

export function MultiSelectionFeedbackScene({ theme, name }: DemoProps & { name: string }) {
  const initial: MultiS = { sel: [] }
  const poster: MultiS = { sel: ['a', 'b', 'c'] }

  async function script(a: Act<MultiS>) {
    await a.wait(700)
    a.mark('one')
    await a.move(center(M.a))
    await a.click()
    await a.set({ sel: ['a'] })
    await a.wait(1100)
    a.mark('two')
    await a.move(center(M.b))
    await a.key('Shift')
    await a.click()
    await a.set({ sel: ['a', 'b'] })
    await a.wait(1100)
    a.mark('three')
    await a.move(center(M.c))
    await a.key('Shift')
    await a.click()
    await a.set({ sel: ['a', 'b', 'c'] })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ sel: [] })
    await a.wait(700)
  }

  const bounds = (ids: string[]): Box => {
    const bs = ids.map((i) => M[i])
    const x = Math.min(...bs.map((b) => b.x))
    const y = Math.min(...bs.map((b) => b.y))
    return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y }
  }
  return (
    <Stage<MultiS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        const multi = s.sel.length > 1
        const last = s.sel.length ? bounds(s.sel) : null
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              {Object.entries(M).map(([id, b]) => (
                <g key={id}>
                  <RectNode {...box(b)} />
                  <rect className="wv-multi" data-show={(multi && s.sel.includes(id)) || undefined} x={b.x} y={b.y} width={b.w} height={b.h} />
                </g>
              ))}
              {last && <NodeSelection className="wv-instant" {...box(last)} show />}
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Nodes snapping: edge alignment guides across the whole stage, then equal spacing between three nodes -------------

type SnapS = { act: 1 | 2; dx: number; dy: number; guide: boolean; cx: number; space: boolean; show: boolean }
const FIX: Box = { x: 300, y: 110, w: 170, h: 100 }
const DRAG0: Box = { x: 620, y: 340, w: 170, h: 100 }
const THRESH = 14
const SA: Box = { x: 230, y: 230, w: 120, h: 90 }
const SB: Box = { x: 410, y: 230, w: 120, h: 90 }
const SC_Y = 230
const SC0 = 720
const SC_SNAP = 590 // the same 60px gap as between A and B

export function SnappingScene({ theme, name }: DemoProps & { name: string }) {
  const initial: SnapS = { act: 1, dx: DRAG0.x, dy: DRAG0.y, guide: false, cx: SC0, space: false, show: true }
  const poster: SnapS = { act: 2, dx: DRAG0.x, dy: DRAG0.y, guide: false, cx: SC_SNAP, space: true, show: true }

  async function script(a: Act<SnapS>) {
    await a.wait(700)
    a.mark('align')
    const grab: Point = { x: DRAG0.x + 85, y: DRAG0.y + 50 }
    await a.move(grab)
    await a.wait(300)
    await a.click()
    // The pointer ends 9px past the guide: the node snaps onto it, and a guide runs across the whole stage
    const end: Point = { x: FIX.x + 9 + 85, y: DRAG0.y + 50 }
    await a.move(end, {
      duration: 1800,
      path: STRAIGHT,
      onMove: (p) => {
        const nx = p.x - 85
        const near = Math.abs(nx - FIX.x) < THRESH
        a.put({ dx: near ? FIX.x : nx, guide: near })
      },
    })
    await a.wait(1100)
    await a.set({ guide: false })
    await a.wait(1400)
    a.mark('spacing')
    await a.set({ show: false })
    await a.wait(300)
    await a.set({ act: 2 })
    await a.set({ show: true })
    await a.wait(700)
    const grabC: Point = { x: SC0 + 60, y: SC_Y + 45 }
    await a.move(grabC, { duration: 900 })
    await a.wait(300)
    await a.click()
    // Dragged toward B: when the gap matches the one between A and B, C snaps and both gaps show the same distance
    const endC: Point = { x: SC_SNAP - 8 + 60, y: SC_Y + 45 }
    await a.move(endC, {
      duration: 1800,
      path: STRAIGHT,
      onMove: (p) => {
        const nx = p.x - 60
        const near = Math.abs(nx - SC_SNAP) < THRESH
        a.put({ cx: near ? SC_SNAP : nx, space: near })
      },
    })
    await a.wait(2800)
    a.mark('reset')
    await a.move(REST)
    await a.set({ show: false, space: false })
    await a.wait(300)
    a.put({ act: 1, dx: DRAG0.x, dy: DRAG0.y, cx: SC0 })
    await a.set({ show: true })
    await a.wait(700)
  }

  const mid = SA.y + SA.h / 2
  return (
    <Stage<SnapS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              {s.act === 1 ? (
                <>
                  <RectNode {...box(FIX)} />
                  <RectNode x={s.dx} y={s.dy} w={DRAG0.w} h={DRAG0.h} />
                </>
              ) : (
                <>
                  <RectNode {...box(SA)} />
                  <RectNode {...box(SB)} />
                  <RectNode x={s.cx} y={SC_Y} w={SB.w} h={SB.h} />
                </>
              )}
            </g>
          </NodeLayer>
          <div style={{ position: 'absolute', inset: 0, opacity: s.act === 1 && s.guide ? 1 : 0 }}>
            <SnapGuides lines={[{ x1: FIX.x, y1: 0, x2: FIX.x, y2: 540 }]} />
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: s.act === 2 && s.space ? 1 : 0 }}>
            <SnapGuides
              lines={[
                { x1: SA.x + SA.w, y1: mid, x2: SB.x, y2: mid },
                { x1: SB.x + SB.w, y1: mid, x2: SC_SNAP, y2: mid },
                { x1: SA.x + SA.w, y1: mid - 8, x2: SA.x + SA.w, y2: mid + 8 },
                { x1: SB.x, y1: mid - 8, x2: SB.x, y2: mid + 8 },
                { x1: SB.x + SB.w, y1: mid - 8, x2: SB.x + SB.w, y2: mid + 8 },
                { x1: SC_SNAP, y1: mid - 8, x2: SC_SNAP, y2: mid + 8 },
              ]}
              tags={[
                { x: (SA.x + SA.w + SB.x) / 2, y: mid, text: '60' },
                { x: (SB.x + SB.w + SC_SNAP) / 2 + 0.01, y: mid, text: '60' },
              ]}
            />
          </div>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}
