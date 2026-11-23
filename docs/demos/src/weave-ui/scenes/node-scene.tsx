// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { NodeLayer, NodeSelection, type Box } from '../nodes/nodes'
import { WeaveToolbar, type ToolId } from '../toolbar'
import './scenes.css'

// A node on the canvas responds like any node: click selects it, dragging moves it, dragging a corner
// anchor resizes it. The node is whatever `shape` draws in its box. See rectangle-node for the first one.

type S = { box: Box; selected: boolean; show: boolean }

const REST: Point = { x: 790, y: 440 }

interface Cfg {
  start: Box
  move: { dx: number; dy: number }
  grow: { dx: number; dy: number }
}
// A square node resizes from a corner without changing its aspect ratio
const FREE: Cfg = { start: { x: 190, y: 210, w: 210, h: 120 }, move: { dx: 140, dy: -60 }, grow: { dx: 130, dy: 80 } }
const SQUARE: Cfg = { start: { x: 220, y: 230, w: 170, h: 170 }, move: { dx: 150, dy: -70 }, grow: { dx: 90, dy: 90 } }

const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const corner = (b: Box): Point => ({ x: b.x + b.w, y: b.y + b.h })
const straight = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

function make(c: Cfg) {
  const START = c.start
  const MOVE = c.move
  const GROW = c.grow
  const MOVED: Box = { ...START, x: START.x + MOVE.dx, y: START.y + MOVE.dy }
  const FINAL: Box = { ...MOVED, w: MOVED.w + GROW.dx, h: MOVED.h + GROW.dy }
  const initial: S = { box: START, selected: false, show: true }
  const poster: S = { box: FINAL, selected: true, show: true }

  async function script(a: Act<S>) {
    await a.wait(700)
    a.mark('select')
    await a.move(center(START))
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)

    a.mark('move')
    const from = center(START)
    await a.move({ x: from.x + MOVE.dx, y: from.y + MOVE.dy }, {
      duration: 1100,
      path: straight,
      onMove: (p) => a.put({ box: { ...START, x: START.x + (p.x - from.x), y: START.y + (p.y - from.y) } }),
    })
    await a.wait(500)

    a.mark('resize')
    const anchor = corner(MOVED)
    await a.move(anchor, { duration: 700 })
    await a.wait(250)
    await a.move({ x: anchor.x + GROW.dx, y: anchor.y + GROW.dy }, {
      duration: 1100,
      path: straight,
      onMove: (p) => a.put({ box: { ...MOVED, w: MOVED.w + (p.x - anchor.x), h: MOVED.h + (p.y - anchor.y) } }),
    })
    await a.wait(2400)

    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ box: START })
    await a.set({ show: true })
    await a.wait(700)
  }
  return { initial, poster, script }
}

export interface NodeSceneProps extends DemoProps {
  shape: (box: Box) => ReactNode
  /** Toolbar groups; the move tool is active. */
  groups?: ToolId[][]
  /** A square box that keeps its aspect ratio while it resizes. */
  square?: boolean
  /** The registry key, used as the scene's class so its styles never clash. */
  name: string
}

export function NodeScene({ theme, shape, groups, name, square }: NodeSceneProps) {
  const { initial, poster, script } = make(square ? SQUARE : FREE)
  return (
    <Stage<S> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
            <rect className="wv-scene__ghost" x="96.5" y="400.5" width="210" height="100" />
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>{shape(s.box)}</g>
            <NodeSelection {...s.box} show={s.selected} />
          </NodeLayer>
          <div className="wv-scene__toolbar">
            <WeaveToolbar active="move" groups={groups} />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
