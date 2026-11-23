// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { FrameNode, NodeLayer, NodeSelection, RectNode, StickyNode, type Box } from '../nodes/nodes'
import { Copy, Group as GroupIcon, Trash2, Ungroup } from 'lucide-react'
import { ContextMenu } from '../overlays/overlays'
import { WeaveToolbar } from '../toolbar'
import './scenes.css'
import './frame-scene.css'

const REST: Point = { x: 790, y: 460 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

// ---- Frame node: drag an element into the frame, then select the frame by its title or by its border -------------------

type FrameS = { el: Point; fd: Point; over: boolean; hov: boolean; selected: boolean; show: boolean }
const FMOVE = { dx: -90, dy: -30 }
const FRAME: Box = { x: 420, y: 150, w: 380, h: 260 }
const EL = { w: 130, h: 110 }
const EL0: Point = { x: 190, y: 290 }
const EL1: Point = { x: 480, y: 230 }

export function FrameNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: FrameS = { el: EL0, fd: { x: 0, y: 0 }, over: false, hov: false, selected: false, show: true }
  const poster: FrameS = { el: EL1, fd: { x: FMOVE.dx, y: FMOVE.dy }, over: false, hov: false, selected: true, show: true }

  async function script(a: Act<FrameS>) {
    await a.wait(700)
    a.mark('move')
    const from: Point = { x: EL0.x + EL.w / 2, y: EL0.y + EL.h / 2 }
    await a.move(from)
    await a.wait(300)
    await a.move({ x: EL1.x + EL.w / 2, y: EL1.y + EL.h / 2 }, {
      duration: 1400,
      path: STRAIGHT,
      onMove: (p) => {
        const inside = p.x > FRAME.x && p.x < FRAME.x + FRAME.w && p.y > FRAME.y && p.y < FRAME.y + FRAME.h
        a.put({ el: { x: EL0.x + (p.x - from.x), y: EL0.y + (p.y - from.y) }, over: inside })
      },
    })
    await a.wait(700)
    await a.set({ over: false })
    await a.wait(900)
    a.mark('title')
    const title: Point = { x: FRAME.x + 28, y: FRAME.y - 8 }
    await a.move(title, { duration: 800 })
    await a.set({ hov: true })
    await a.wait(400)
    await a.click()
    await a.set({ selected: true, hov: false })
    await a.wait(1400)
    a.mark('deselect')
    await a.move({ x: 300, y: 190 }, { duration: 800 })
    await a.click()
    await a.set({ selected: false })
    await a.wait(800)
    a.mark('border')
    const border: Point = { x: FRAME.x + FRAME.w, y: FRAME.y + 170 }
    await a.move(border, { duration: 900 })
    await a.set({ hov: true })
    await a.wait(400)
    await a.click()
    await a.set({ selected: true, hov: false })
    await a.wait(800)
    a.mark('carry')
    await a.drag({ x: border.x + FMOVE.dx, y: border.y + FMOVE.dy }, (p) => a.put({ fd: { x: p.x - border.x, y: p.y - border.y } }), { duration: 1300 })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ el: EL0, fd: { x: 0, y: 0 } })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<FrameS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        const fr: Box = { ...FRAME, x: FRAME.x + s.fd.x, y: FRAME.y + s.fd.y }
        return (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <FrameNode {...fr} title="Frame 1" />
              <StickyNode x={s.el.x + s.fd.x} y={s.el.y + s.fd.y} w={EL.w} h={EL.h} text="Idea" />
            </g>
            <rect className="wv-frame__edge" data-show={s.hov || s.over || undefined} x={fr.x} y={fr.y} width={fr.w} height={fr.h} fill="none" />
            <NodeSelection {...fr} show={s.selected} />
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

type GroupS = { marquee: Box | null; picked: boolean; grouped: boolean; dx: number; dy: number; show: boolean; menu: boolean; hov: boolean }
const A: Box = { x: 240, y: 210, w: 150, h: 100 }
const B: Box = { x: 430, y: 280, w: 150, h: 100 }
const BOUNDS: Box = { x: 240, y: 210, w: 340, h: 170 }
const GMOVE = { dx: 150, dy: -60 }

export function GroupNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: GroupS = { marquee: null, picked: false, grouped: false, dx: 0, dy: 0, show: true, menu: false, hov: false }
  const poster: GroupS = { marquee: null, picked: false, grouped: true, dx: GMOVE.dx, dy: GMOVE.dy, show: true, menu: false, hov: false }

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
    const press: Point = { x: A.x + 110, y: A.y + 60 }
    await a.move(press, { duration: 800 })
    await a.wait(300)
    await a.click(undefined, { right: true })
    await a.set({ menu: true })
    await a.wait(900)
    await a.move('menu-group', { duration: 700 })
    await a.set({ hov: true })
    await a.wait(600)
    await a.click({ at: 'menu-group' })
    await a.set({ menu: false, hov: false, grouped: true, picked: false })
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
    <Stage<GroupS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
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
            <ContextMenu
              show={s.menu}
              at={{ x: A.x + 118, y: A.y + 68 }}
              items={[
                { label: 'Copy', icon: Copy, shortcut: 'Ctrl C' },
                { label: 'Group', icon: GroupIcon, shortcut: 'Ctrl G', hovered: s.hov },
                { label: 'Ungroup', icon: Ungroup, shortcut: 'Ctrl Shift G', disabled: true },
                { label: 'Delete', icon: Trash2, shortcut: 'Del', divider: true },
              ]}
            />
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" />
            </div>
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}
