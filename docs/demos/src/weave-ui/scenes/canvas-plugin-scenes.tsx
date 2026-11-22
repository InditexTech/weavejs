// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { EllipseNode, ImageNode, NodeLayer, RectNode, StarNode, type Box } from '../nodes/nodes'
import { CommentPin, ContextMenu, DropTarget, FileChip, Minimap } from '../overlays/overlays'
import { WeaveToolbar } from '../toolbar'
import { EasedSelection } from './action-scenes'
import './scenes.css'
import './viewport-scene.css'
import './comment-scene.css'
import './canvas-plugin-scenes.css'

const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const box = (b: Box) => ({ x: b.x, y: b.y, w: b.w, h: b.h })
const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const REST: Point = { x: 790, y: 470 }
const MAYA = '#d1478a'
const JON = '#2f9e8f'
const Toolbar = ({ groups }: { groups?: Parameters<typeof WeaveToolbar>[0]['groups'] }) => (
  <div className="wv-scene__toolbar">
    <WeaveToolbar active="move" groups={groups} />
  </div>
)
const stage = (theme: DemoProps['theme'], name: string) => ({ width: 960, height: 540, theme, tokens: weaveTokens(theme), className: `wv-scene ${name}` })

// ---- Context menu: right-click a node, pick an action from the menu ----------------------------------------------------

type CmS = { sel: boolean; menu: boolean; hov: string | null; gone: boolean }
const CM_NODE: Box = { x: 300, y: 190, w: 220, h: 140 }
const CM_AT: Point = { x: 430, y: 270 }

export function ContextMenuScene({ theme, name }: DemoProps & { name: string }) {
  const initial: CmS = { sel: false, menu: false, hov: null, gone: false }
  const poster: CmS = { sel: true, menu: true, hov: 'Delete', gone: false }

  async function script(a: Act<CmS>) {
    await a.wait(800)
    a.mark('open')
    await a.move(CM_AT)
    await a.wait(300)
    await a.click(undefined, { right: true })
    await a.set({ sel: true, menu: true })
    await a.wait(1000)
    a.mark('pick')
    await a.move('menu-delete')
    await a.set({ hov: 'Delete' })
    await a.wait(800)
    await a.click({ at: 'menu-delete' })
    await a.set({ menu: false, hov: null, sel: false, gone: true })
    await a.wait(2200)
    a.mark('reset')
    await a.move(REST)
    await a.set({ gone: false })
    await a.wait(900)
  }

  return (
    <Stage<CmS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <g style={{ opacity: s.gone ? 0 : 1, transition: 'opacity 0.3s ease' }}>
              <RectNode {...box(CM_NODE)} />
            </g>
            <EllipseNode x={600} y={330} w={150} h={100} />
            <EasedSelection {...box(CM_NODE)} show={s.sel} />
          </NodeLayer>
          <ContextMenu
            show={s.menu}
            at={{ x: CM_AT.x + 8, y: CM_AT.y + 8 }}
            items={[
              { label: 'Copy', icon: Copy, shortcut: 'Ctrl C' },
              { label: 'Paste', shortcut: 'Ctrl V', disabled: true },
              { label: 'Delete', icon: Trash2, shortcut: 'Del', divider: true, hovered: s.hov === 'Delete' },
            ]}
          />
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Copy and paste: Ctrl C, Ctrl V, and the copy lands in the middle of the view --------------------------------------

type CpS = { sel: boolean; pasted: boolean }
const CP_SRC: Box = { x: 230, y: 200, w: 170, h: 110 }
const CP_COPY: Box = { x: 435, y: 215, w: 170, h: 110 }

export function CopyPasteScene({ theme, name }: DemoProps & { name: string }) {
  const initial: CpS = { sel: false, pasted: false }
  const poster: CpS = { sel: false, pasted: true }

  async function script(a: Act<CpS>) {
    await a.wait(800)
    a.mark('select')
    await a.move(center(CP_SRC))
    await a.click()
    await a.set({ sel: true })
    await a.wait(800)
    a.mark('copy')
    await a.key('ctrl+c')
    await a.wait(900)
    a.mark('paste')
    await a.key('ctrl+v')
    await a.set({ pasted: true })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ sel: false, pasted: false })
    await a.wait(900)
  }

  return (
    <Stage<CpS> {...stage(theme, name)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode {...box(CP_SRC)} />
            <g style={{ opacity: s.pasted ? 1 : 0, transition: 'opacity 0.25s ease' }}>
              <RectNode {...box(CP_COPY)} />
            </g>
            <EasedSelection {...box(CP_SRC)} show={s.sel && !s.pasted} />
            <EasedSelection {...box(CP_COPY)} show={s.pasted} />
          </NodeLayer>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Comments renderer: the app hands over a model; nothing paints until render() runs ----------------------------------

type CrS = { added: boolean; rendered: boolean }
const PINS: Array<{ at: Point; color: string }> = [
  { at: { x: 330, y: 230 }, color: MAYA },
  { at: { x: 640, y: 330 }, color: JON },
]
const NEW_PIN = { at: { x: 500, y: 410 }, color: MAYA }

export function CommentsRendererScene({ theme, name }: DemoProps & { name: string }) {
  const initial: CrS = { added: false, rendered: true }
  const poster: CrS = { added: true, rendered: true }

  async function script(a: Act<CrS>) {
    await a.wait(1200)
    a.mark('model')
    await a.set({ added: true, rendered: false })
    await a.wait(2000)
    a.mark('render')
    await a.set({ rendered: true })
    await a.wait(3000)
    a.mark('reset')
    await a.set({ added: false })
    await a.wait(1200)
  }

  return (
    <Stage<CrS> {...stage(theme, name)} initial={initial} poster={poster} script={script}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode x={260} y={240} w={170} h={110} />
            <EllipseNode x={560} y={200} w={180} h={120} />
          </NodeLayer>
          {PINS.map((p, i) => (
            <CommentPin key={i} at={p.at} color={p.color} count={1} />
          ))}
          <CommentPin at={NEW_PIN.at} color={NEW_PIN.color} count={1} show={s.added && s.rendered} />
          <div className="wv-model">
            <div className="wv-model__row">comments: {s.added ? 3 : 2}</div>
            <div className="wv-model__row" data-new={s.added || undefined}>
              {s.added ? '+ Maya: "Check this edge"' : 'Maya, Jon'}
            </div>
            <span className="wv-model__call" data-on={(s.added && s.rendered) || undefined}>
              render()
            </span>
          </div>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Stage grid: none, lines, dots --------------------------------------------------------------------------------------

type GrS = { mode: 'off' | 'lines' | 'dots'; hov: string | null }
const MODES: Array<{ id: GrS['mode']; label: string }> = [
  { id: 'off', label: 'None' },
  { id: 'lines', label: 'Lines' },
  { id: 'dots', label: 'Dots' },
]

export function StageGridScene({ theme, name }: DemoProps & { name: string }) {
  const initial: GrS = { mode: 'off', hov: null }
  const poster: GrS = { mode: 'dots', hov: null }

  async function script(a: Act<GrS>) {
    await a.wait(1000)
    a.mark('lines')
    await a.move('seg-lines')
    await a.click({ at: 'seg-lines' })
    await a.set({ mode: 'lines' })
    await a.wait(1800)
    a.mark('dots')
    await a.move('seg-dots')
    await a.click({ at: 'seg-dots' })
    await a.set({ mode: 'dots' })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ mode: 'off' })
    await a.wait(900)
  }

  return (
    <Stage<GrS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-grid={s.mode}>
          <NodeLayer>
            <RectNode x={300} y={200} w={180} h={120} />
            <EllipseNode x={540} y={280} w={160} h={100} />
          </NodeLayer>
          <div className="wv-seg">
            {MODES.map((m) => (
              <span key={m.id} className="wv-seg__item" role="button" data-target={`seg-${m.id}`} data-on={s.mode === m.id || undefined}>
                {m.label}
              </span>
            ))}
          </div>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Stage resize: the stage follows its container ----------------------------------------------------------------------

type RsS = { w: number; h: number }
const HOST_BIG: RsS = { w: 760, h: 540 }
const HOST_SMALL: RsS = { w: 460, h: 540 }

export function StageResizeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: RsS = HOST_BIG
  const poster: RsS = HOST_SMALL

  async function script(a: Act<RsS>) {
    await a.wait(1400)
    a.mark('shrink')
    await a.set(HOST_SMALL)
    await a.wait(2800)
    a.mark('grow')
    await a.set(HOST_BIG)
    await a.wait(2400)
  }

  return (
    <Stage<RsS> {...stage(theme, name)} initial={initial} poster={poster} script={script}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <div className="wv-host" style={{ width: s.w, height: s.h }}>
            <svg className="wv-fill" width="100%" height="100%" aria-hidden>
              <g className="wv-follow" style={{ transform: `translate(${s.w / 2}px, ${s.h / 2}px)`, transition: 'transform 0.9s cubic-bezier(0.45, 0, 0.25, 1)' }}>
                <RectNode x={-90} y={-60} w={180} h={120} />
              </g>
            </svg>
            <span className="wv-host__size">
              {s.w} x {s.h}
            </span>
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Stage minimap: the whole room in miniature, with the visible region outlined --------------------------------------

type MmS = { vx: number; vy: number; animate: boolean }
const WORLD_W = 1920
const WORLD_H = 1200
const MM_NODES: Array<{ x: number; y: number; w: number; h: number; kind: 'rect' | 'ellipse' | 'star' }> = [
  { x: 180, y: 160, w: 200, h: 120, kind: 'rect' },
  { x: 520, y: 260, w: 170, h: 110, kind: 'ellipse' },
  { x: 900, y: 140, w: 200, h: 130, kind: 'star' },
  { x: 1180, y: 640, w: 210, h: 120, kind: 'rect' },
  { x: 1480, y: 800, w: 180, h: 120, kind: 'ellipse' },
  { x: 760, y: 700, w: 190, h: 120, kind: 'rect' },
]

export function StageMinimapScene({ theme, name }: DemoProps & { name: string }) {
  const initial: MmS = { vx: 0, vy: 0, animate: true }
  const poster: MmS = { vx: 760, vy: 420, animate: true }

  async function script(a: Act<MmS>) {
    await a.wait(1000)
    a.mark('pan')
    const from: Point = { x: 600, y: 330 }
    await a.move(from)
    await a.wait(250)
    await a.drag({ x: from.x - 760, y: from.y - 420 }, (p) => a.put({ vx: from.x - p.x, vy: from.y - p.y, animate: false }), { duration: 2000 })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ animate: true, vx: 0, vy: 0 })
    await a.wait(1200)
  }

  return (
    <Stage<MmS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => {
        const ease = s.animate ? '0.9s cubic-bezier(0.4, 0, 0.2, 1)' : '0s'
        const grid: CSSProperties = { backgroundPosition: `${-s.vx}px ${-s.vy}px`, transition: `background-position ${ease}` }
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" style={{ position: 'absolute', inset: 0, ...grid }}>
            <NodeLayer>
              <g className="wv-viewport__world" style={{ transform: `translate(${-s.vx}px, ${-s.vy}px)`, transition: `transform ${ease}` }}>
                {MM_NODES.map((n, i) =>
                  n.kind === 'rect' ? <RectNode key={i} {...n} /> : n.kind === 'ellipse' ? <EllipseNode key={i} {...n} /> : <StarNode key={i} {...n} tips={5} inner={0.4} />,
                )}
              </g>
            </NodeLayer>
            <Toolbar />
            <Minimap
              style={{ right: 0, bottom: 0 }}
              nodes={MM_NODES.map((n) => ({ x: n.x / WORLD_W, y: n.y / WORLD_H, w: n.w / WORLD_W, h: n.h / WORLD_H }))}
              viewport={{ x: s.vx / WORLD_W, y: s.vy / WORLD_H, w: 960 / WORLD_W, h: 540 / WORLD_H }}
            />
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Stage keyboard move: Shift and the arrow keys nudge the selection ---------------------------------------------------

type KmS = { dx: number; dy: number; sel: boolean }
const KM: Box = { x: 330, y: 220, w: 190, h: 120 }
const STEP = 10

export function KeyboardMoveScene({ theme, name }: DemoProps & { name: string }) {
  const initial: KmS = { dx: 0, dy: 0, sel: false }
  const poster: KmS = { dx: STEP * 6, dy: STEP * 3, sel: true }

  async function script(a: Act<KmS>) {
    await a.wait(800)
    a.mark('select')
    await a.move(center(KM))
    await a.click()
    await a.set({ sel: true })
    await a.wait(700)
    a.mark('right')
    for (let i = 1; i <= 6; i++) {
      await a.key('shift+right')
      a.put({ dx: STEP * i })
      await a.wait(250)
    }
    a.mark('down')
    for (let i = 1; i <= 3; i++) {
      await a.key('shift+down')
      a.put({ dy: STEP * i })
      await a.wait(250)
    }
    await a.wait(2200)
    a.mark('reset')
    await a.move(REST)
    await a.set({ sel: false })
    await a.wait(300)
    a.put({ dx: 0, dy: 0 })
    await a.wait(700)
  }

  return (
    <Stage<KmS> {...stage(theme, name)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => {
        const b = { ...box(KM), x: KM.x + s.dx, y: KM.y + s.dy }
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <EllipseNode x={620} y={300} w={150} h={100} />
              <RectNode {...b} />
              <EasedSelection {...b} show={s.sel} />
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Stage drop area: drag a file in from the desktop and drop it on the canvas -----------------------------------------

type DrS = { at: Point; chip: boolean; over: boolean; dropped: boolean }
const DROP_AT: Point = { x: 470, y: 250 }
const CHIP_FROM: Point = { x: 820, y: 130 }

export function DropAreaScene({ theme, name }: DemoProps & { name: string }) {
  const initial: DrS = { at: CHIP_FROM, chip: false, over: false, dropped: false }
  const poster: DrS = { at: DROP_AT, chip: false, over: false, dropped: true }

  async function script(a: Act<DrS>) {
    await a.wait(900)
    a.mark('drag')
    a.put({ chip: true })
    await a.wait(300)
    await a.move(CHIP_FROM, { duration: 10 })
    await a.set({ over: true })
    await a.move(DROP_AT, { duration: 1600, path: STRAIGHT, onMove: (p) => a.put({ at: { x: p.x + 8, y: p.y + 8 } }) })
    await a.wait(700)
    a.mark('drop')
    await a.set({ chip: false, over: false, dropped: true })
    await a.wait(2800)
    a.mark('reset')
    await a.move(REST)
    await a.set({ dropped: false })
    await a.wait(300)
    a.put({ at: CHIP_FROM })
    await a.wait(700)
  }

  return (
    <Stage<DrS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: CHIP_FROM, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode x={230} y={330} w={160} h={100} />
            <g style={{ opacity: s.dropped ? 1 : 0, transition: 'opacity 0.25s ease' }}>
              <ImageNode x={DROP_AT.x - 90} y={DROP_AT.y - 60} w={180} h={120} />
            </g>
          </NodeLayer>
          <DropTarget show={s.over}>Drop to add</DropTarget>
          <FileChip name="photo.png" at={s.at} show={s.chip} />
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}
