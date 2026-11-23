// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Clock, Copy, Download, FileText, Image as ImageIcon, Monitor, Radio, Rocket, Trash2 } from 'lucide-react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { EllipseNode, ImageNode, NodeLayer, NodeSelection, RectNode, StarNode, type Box } from '../nodes/nodes'
import { CommentPin, ContextMenu, DropTarget, FileChip, Minimap } from '../overlays/overlays'
import { WeaveToolbar } from '../toolbar'
import { EasedSelection } from './action-scenes'
import { Msg } from './comment-scene'
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
const PASTE_AT: Point = { x: 520, y: 300 }
const CP_COPY: Box = { x: PASTE_AT.x, y: PASTE_AT.y, w: 170, h: 110 }

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
    await a.wait(700)
    a.mark('paste')
    await a.move(PASTE_AT, { duration: 1000 })
    await a.wait(500)
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
            <g style={{ opacity: s.pasted ? 1 : 0 }}>
              <RectNode {...box(CP_COPY)} />
            </g>
            <NodeSelection className="wv-instant" {...box(CP_SRC)} show={s.sel && !s.pasted} />
            <NodeSelection className="wv-instant" {...box(CP_COPY)} show={s.pasted} />
          </NodeLayer>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Comments renderer: the plugin paints the pins; the thread window is your UI, and repainting is your code's job ------

type CrS = { open: boolean; typing: boolean; reply: string; posted: boolean; call: boolean }
const CR_PIN: Point = { x: 400, y: 285 }
const CR_PIN2: Point = { x: 640, y: 215 }
const CR_REPLY = 'Done, thanks!'

export function CommentsRendererScene({ theme, name }: DemoProps & { name: string }) {
  const initial: CrS = { open: false, typing: false, reply: '', posted: false, call: false }
  const poster: CrS = { open: true, typing: false, reply: CR_REPLY, posted: true, call: true }

  async function script(a: Act<CrS>) {
    await a.wait(900)
    a.mark('open')
    await a.move({ x: CR_PIN.x + 14, y: CR_PIN.y - 14 }, { duration: 900 })
    await a.wait(250)
    await a.click()
    await a.set({ open: true })
    await a.wait(1300)
    a.mark('reply')
    await a.move({ x: CR_PIN.x + 120, y: CR_PIN.y + 52 }, { duration: 800 })
    await a.click()
    await a.set({ typing: true })
    await a.wait(300)
    await a.type('reply', CR_REPLY, { interval: 90 })
    await a.wait(400)
    await a.key('Enter')
    await a.set({ typing: false, posted: true })
    await a.wait(1800)
    a.mark('render')
    await a.set({ call: true })
    await a.wait(3000)
    a.mark('reset')
    await a.move(REST)
    await a.set({ open: false, call: false })
    await a.wait(300)
    a.put({ reply: '', posted: false })
    await a.wait(700)
  }

  return (
    <Stage<CrS> {...stage(theme, name)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode x={300} y={300} w={230} h={130} />
            <EllipseNode x={600} y={230} w={170} h={110} />
          </NodeLayer>
          <CommentPin at={CR_PIN} color={MAYA} count={s.call ? 3 : 2} />
          <CommentPin at={CR_PIN2} color={JON} count={1} />
          <div className="wv-thread" data-show={s.open || undefined} data-editing={s.typing || undefined} style={{ left: CR_PIN.x + 36, top: CR_PIN.y - 120 }}>
            <Msg who="Maya" color={MAYA} initials="MC">Can we shorten the title?</Msg>
            <Msg who="Jon" color={JON} initials="JP">On it.</Msg>
            <Msg who="Maya" color={MAYA} initials="MC" hidden={!s.posted}>{CR_REPLY}</Msg>
            <div className="wv-thread__field" style={{ opacity: s.posted ? 0 : 1, transition: 'opacity 0.2s ease' }}>
              <span className="wv-thread__line">
                <span className="wv-thread__placeholder" data-hide={s.reply.length > 0 || s.typing || undefined}>Reply</span>
                <span className="wv-thread__typed">{s.reply}</span>
                <span className="wv-thread__rest">{CR_REPLY.slice(s.reply.length)}</span>
              </span>
            </div>
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

// ---- Stage resize: the stage fills its window, so resizing the window resizes the stage -------------------------------

type RsS = { w: number; h: number }
const WIN = { x: 60, y: 60, bar: 36 }
const WIN_BIG: RsS = { w: 840, h: 420 }
const WIN_SMALL: RsS = { w: 520, h: 340 }

export function StageResizeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: RsS = WIN_BIG
  const poster: RsS = WIN_SMALL

  async function script(a: Act<RsS>) {
    await a.wait(1200)
    a.mark('shrink')
    await a.move('win-corner', { duration: 900 })
    await a.wait(300)
    const from: Point = { x: WIN.x + WIN_BIG.w, y: WIN.y + WIN_BIG.h }
    await a.drag({ x: WIN.x + WIN_SMALL.w, y: WIN.y + WIN_SMALL.h }, (p) => a.put({ w: p.x - WIN.x, h: p.y - WIN.y }), { duration: 1500 })
    await a.wait(2000)
    a.mark('grow')
    await a.drag(from, (p) => a.put({ w: p.x - WIN.x, h: p.y - WIN.y }), { duration: 1500 })
    await a.wait(1400)
    await a.move(REST, { duration: 800 })
    await a.wait(600)
  }

  return (
    <Stage<RsS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <div className="wv-desk" data-target="canvas">
          <div className="wv-win" style={{ left: WIN.x, top: WIN.y, width: s.w, height: s.h }}>
            <div className="wv-win__bar" style={{ height: WIN.bar }}>
              <span className="wv-win__dot" />
              <span className="wv-win__dot" />
              <span className="wv-win__dot" />
              <span className="wv-win__title">Weave app</span>
            </div>
            <div className="wv-win__body">
              <WeaveCanvas className="wv-win__canvas">
                <svg className="wv-fill" width="100%" height="100%" aria-hidden>
                  <g className="wv-win__nodes" style={{ transform: `translate(${s.w / 2}px, ${(s.h - WIN.bar) / 2}px)` }}>
                    <RectNode x={-150} y={-60} w={140} h={90} />
                    <EllipseNode x={20} y={-10} w={120} h={80} />
                  </g>
                </svg>
                <span className="wv-win__size">
                  {Math.round(s.w)} x {Math.round(s.h - WIN.bar)}
                </span>
              </WeaveCanvas>
            </div>
            <span className="wv-win__corner" data-target="win-corner" data-cursor="resize-nwse" />
          </div>
        </div>
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
              <NodeSelection className="wv-instant" {...b} show={s.sel} />
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Stage drop area: drag a file from the Finder onto the canvas ---------------------------------------------------------

type DrS = { at: Point; chip: boolean; over: boolean; dropped: boolean; sel: boolean }
const DROP_AT: Point = { x: 290, y: 230 }
const FINDER = { right: 40, bottom: 40, w: 480, h: 290 }
const FINDER_LEFT = 960 - FINDER.right - FINDER.w

const SIDEBAR = [
  { label: 'AirDrop', icon: Radio },
  { label: 'Recents', icon: Clock },
  { label: 'Applications', icon: Rocket },
  { label: 'Desktop', icon: Monitor },
  { label: 'Documents', icon: FileText },
  { label: 'Downloads', icon: Download, on: true },
]

function PageIcon({ children, kind }: { children?: ReactNode; kind: 'image' | 'pdf' }) {
  return (
    <span className="wv-finder__page" data-kind={kind}>
      {children}
    </span>
  )
}

export function DropAreaScene({ theme, name }: DemoProps & { name: string }) {
  const initial: DrS = { at: { x: 0, y: 0 }, chip: false, over: false, dropped: false, sel: false }
  const poster: DrS = { at: DROP_AT, chip: false, over: false, dropped: true, sel: false }

  async function script(a: Act<DrS>) {
    await a.wait(900)
    a.mark('pick')
    await a.move('file-photo', { duration: 900 })
    await a.wait(300)
    await a.set({ sel: true })
    await a.wait(400)
    a.mark('drag')
    await a.drag(DROP_AT, (p) => a.put({ at: { x: p.x + 10, y: p.y + 10 }, chip: true, over: p.x < FINDER_LEFT }), { duration: 1900 })
    await a.wait(900)
    a.mark('drop')
    await a.set({ chip: false, over: false, dropped: true, sel: false })
    await a.wait(2800)
    a.mark('reset')
    await a.move(REST)
    await a.set({ dropped: false })
    await a.wait(900)
  }

  return (
    <Stage<DrS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode x={150} y={380} w={150} h={90} />
            <g style={{ opacity: s.dropped ? 1 : 0, transition: 'opacity 0.25s ease' }}>
              <ImageNode x={DROP_AT.x - 90} y={DROP_AT.y - 60} w={180} h={120} />
            </g>
          </NodeLayer>
          <DropTarget show={s.over}>Drop to add</DropTarget>
          <Toolbar />
          <div className="wv-finder" style={{ right: FINDER.right, bottom: FINDER.bottom, width: FINDER.w, height: FINDER.h }}>
            <div className="wv-finder__bar">
              <span className="wv-finder__lights">
                <i style={{ background: '#ff5f57' }} />
                <i style={{ background: '#febc2e' }} />
                <i style={{ background: '#28c840' }} />
              </span>
              <span className="wv-finder__nav">
                <ChevronLeft size={16} strokeWidth={1.5} />
                <ChevronRight size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-finder__title">
                <Download size={14} strokeWidth={1.5} />
                Downloads
              </span>
            </div>
            <div className="wv-finder__body">
              <div className="wv-finder__side">
                <span className="wv-finder__group">Favorites</span>
                {SIDEBAR.map(({ label, icon: Icon, on }) => (
                  <span key={label} className="wv-finder__item" data-on={on || undefined}>
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="wv-finder__grid">
                <span className="wv-finder__file" data-sel={s.sel || undefined} data-target="file-photo">
                  <PageIcon kind="image">
                    <ImageIcon size={26} strokeWidth={1.2} />
                  </PageIcon>
                  <span className="wv-finder__name">photo.png</span>
                </span>
                <span className="wv-finder__file">
                  <PageIcon kind="pdf">
                    <span className="wv-finder__ext">PDF</span>
                  </PageIcon>
                  <span className="wv-finder__name">notes.pdf</span>
                </span>
                <span className="wv-finder__file">
                  <span className="wv-finder__folder" />
                  <span className="wv-finder__name">Projects</span>
                </span>
              </div>
            </div>
          </div>
          <FileChip name="photo.png" at={s.at} show={s.chip} />
        </WeaveCanvas>
      )}
    </Stage>
  )
}
