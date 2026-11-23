// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { EllipseNode, NodeLayer, NodeSelection, RectNode, type Box } from '../nodes/nodes'
import { Peer } from '../peer'
import { MovingSelection } from './action-scenes'
import { SnapGuides } from '../overlays/overlays'
import { WeaveToolbar } from '../toolbar'
import './scenes.css'
import './media-scene.css'
import './collab-scenes.css'

const MAYA = '#d1478a'
const JON = '#2f9e8f'
const ANA = '#e8912d'
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const box = (b: Box) => ({ x: b.x, y: b.y, w: b.w, h: b.h })
const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const REST: Point = { x: 790, y: 460 }

const Toolbar = () => (
  <div className="wv-scene__toolbar">
    <WeaveToolbar active="move" />
  </div>
)

// ---- Users presence: what a remote user does is shown while they do it, not just its result -----------------------------

type PresS = { jon: 'rest' | 'grab' | 'drop'; maya: 'rest' | 'grab' | 'drop'; carry: boolean; grown: boolean; jsel: boolean; msel: boolean }
const NODE0: Box = { x: 260, y: 170, w: 170, h: 110 }
const DROP = { dx: 170, dy: 80 }
const ELL0: Box = { x: 640, y: 300, w: 130, h: 90 }
const ELL1: Box = { x: 640, y: 300, w: 200, h: 140 }
const EASE = '1.1s cubic-bezier(0.45, 0, 0.25, 1)'

export function PresenceScene({ theme, name }: DemoProps & { name: string }) {
  const initial: PresS = { jon: 'rest', maya: 'rest', carry: false, grown: false, jsel: false, msel: false }
  const poster: PresS = { jon: 'drop', maya: 'drop', carry: true, grown: true, jsel: true, msel: true }
  const jon = (s: PresS['jon']): Point => (s === 'rest' ? { x: 790, y: 120 } : s === 'grab' ? { x: NODE0.x + 120, y: NODE0.y + 60 } : { x: NODE0.x + 120 + DROP.dx, y: NODE0.y + 60 + DROP.dy })
  const maya = (s: PresS['maya']): Point => (s === 'rest' ? { x: 220, y: 470 } : s === 'grab' ? { x: ELL0.x + ELL0.w, y: ELL0.y + ELL0.h } : { x: ELL1.x + ELL1.w, y: ELL1.y + ELL1.h })

  async function script(a: Act<PresS>) {
    await a.wait(800)
    a.mark('arrive')
    a.put({ jon: 'grab', maya: 'grab' })
    await a.wait(1300)
    a.put({ jsel: true, msel: true })
    await a.wait(700)
    a.mark('act')
    a.put({ jon: 'drop', maya: 'drop', carry: true, grown: true })
    await a.wait(1700)
    await a.wait(2400)
    a.mark('reset')
    a.put({ jsel: false, msel: false })
    await a.wait(300)
    a.put({ jon: 'rest', maya: 'rest' })
    await a.wait(1200)
    a.put({ carry: false, grown: false })
    await a.wait(900)
  }

  return (
    <Stage<PresS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className={`wv-scene ${name}`}>
      {(s) => {
        const e = s.grown ? ELL1 : ELL0
        const moved: Box = { ...NODE0, x: NODE0.x + (s.carry ? DROP.dx : 0), y: NODE0.y + (s.carry ? DROP.dy : 0) }
        return (
          <>
            <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
              <NodeLayer>
                <g className="wv-follow" data-slow style={{ transform: s.carry ? `translate(${DROP.dx}px, ${DROP.dy}px)` : 'none' }}>
                  <RectNode {...box(NODE0)} />
                </g>
                <ellipse className="wv-node" cx={0.5} cy={0.5} rx={0.5} ry={0.5} fill="#fff" stroke="#000" strokeWidth={1} style={{ transform: `translate(${e.x}px, ${e.y}px) scale(${e.w}, ${e.h})`, transformOrigin: '0 0', vectorEffect: 'non-scaling-stroke', transition: `transform ${EASE}` }} />
                <MovingSelection {...moved} show={s.jsel} color={JON} />
                <MovingSelection {...e} show={s.msel} color={MAYA} />
              </NodeLayer>
              <Toolbar />
            </WeaveCanvas>
            <Peer name="Jon" color={JON} at={jon(s.jon)} slow />
            <Peer name="Maya" color={MAYA} at={maya(s.maya)} slow />
          </>
        )
      }}
    </Stage>
  )
}

// ---- Users pointers: everyone's cursor, with their name, moving on its own ----------------------------------------------

type PtrS = { step: 0 | 1 | 2 }
const PATHS: Record<'maya' | 'jon' | 'ana', Point[]> = {
  maya: [{ x: 250, y: 200 }, { x: 430, y: 330 }, { x: 330, y: 430 }],
  jon: [{ x: 700, y: 180 }, { x: 560, y: 260 }, { x: 640, y: 400 }],
  ana: [{ x: 480, y: 440 }, { x: 760, y: 360 }, { x: 520, y: 150 }],
}

export function PointersScene({ theme, name }: DemoProps & { name: string }) {
  const initial: PtrS = { step: 0 }
  const poster: PtrS = { step: 1 }

  async function script(a: Act<PtrS>) {
    await a.wait(900)
    a.mark('move')
    await a.set({ step: 1 })
    await a.wait(2400)
    await a.set({ step: 2 })
    await a.wait(2400)
    a.mark('reset')
    await a.set({ step: 0 })
    await a.wait(1800)
  }

  return (
    <Stage<PtrS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className={`wv-scene ${name}`}>
      {(s) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <RectNode x={330} y={190} w={160} h={100} />
              <EllipseNode x={560} y={290} w={170} h={110} />
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
          <Peer name="Maya" color={MAYA} at={PATHS.maya[s.step]} />
          <Peer name="Jon" color={JON} at={PATHS.jon[s.step]} slow />
          <Peer name="Ana" color={ANA} at={PATHS.ana[s.step]} />
        </>
      )}
    </Stage>
  )
}

// ---- Users selector: each remote user's selection in their own color, with their name ----------------------------------

type SelS = { jat: number; jsel: number; mat: number; msel: number }
const NODES: Box[] = [
  { x: 270, y: 190, w: 150, h: 100 },
  { x: 480, y: 190, w: 150, h: 100 },
  { x: 270, y: 340, w: 150, h: 100 },
  { x: 480, y: 340, w: 150, h: 100 },
]

function UserSel({ at, color, who, show }: { at: Box; color: string; who: string; show: boolean }) {
  return (
    <g className="wv-usersel" data-show={show || undefined} style={{ '--ss-accent': color } as CSSProperties}>
      <NodeSelection {...box(at)} show />
      <rect className="wv-usersel__flag" x={at.x - 1} y={at.y - 24} width={who.length * 7 + 14} height={20} />
      <text className="wv-usersel__name" x={at.x + 6} y={at.y - 10}>
        {who}
      </text>
    </g>
  )
}

export function SelectorScene({ theme, name }: DemoProps & { name: string }) {
  const initial: SelS = { jat: -1, jsel: -1, mat: -1, msel: -1 }
  const poster: SelS = { jat: 0, jsel: 0, mat: 3, msel: 3 }

  // Each person's cursor arrives first; the selection only shows once they have clicked
  async function script(a: Act<SelS>) {
    await a.wait(900)
    a.mark('jon')
    await a.set({ jat: 1 })
    await a.wait(1300)
    await a.set({ jsel: 1 })
    await a.wait(1500)
    a.mark('maya')
    await a.set({ mat: 3 })
    await a.wait(1100)
    await a.set({ msel: 3 })
    await a.wait(1500)
    a.mark('change')
    await a.set({ jat: 0 })
    await a.wait(1300)
    await a.set({ jsel: 0 })
    await a.wait(2400)
    a.mark('reset')
    await a.set({ jsel: -1, msel: -1 })
    await a.wait(300)
    await a.set({ jat: -1, mat: -1 })
    await a.wait(1400)
  }

  return (
    <Stage<SelS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className={`wv-scene ${name}`}>
      {(s) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              {NODES.map((n, i) => (
                <RectNode key={i} {...box(n)} />
              ))}
              {NODES.map((n, i) => (
                <UserSel key={`j${i}`} at={n} color={JON} who="Jon" show={s.jsel === i} />
              ))}
              {NODES.map((n, i) => (
                <UserSel key={`m${i}`} at={n} color={MAYA} who="Maya" show={s.msel === i} />
              ))}
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
          <Peer name="Jon" color={JON} at={s.jat >= 0 ? center(NODES[s.jat]) : { x: 760, y: 150 }} slow />
          <Peer name="Maya" color={MAYA} at={s.mat >= 0 ? center(NODES[s.mat]) : { x: 120, y: 480 }} />
        </>
      )}
    </Stage>
  )
}

// ---- Connected users: the plugin returns who is in the session; the UI shows them -------------------------------------

type ConnS = { n: 1 | 2 | 3 }
const CURSORS: Point[][] = [
  [{ x: 260, y: 215 }, { x: 330, y: 330 }, { x: 230, y: 430 }],
  [{ x: 450, y: 250 }, { x: 450, y: 250 }, { x: 500, y: 390 }],
  [{ x: 330, y: 190 }, { x: 330, y: 190 }, { x: 330, y: 190 }],
]
const USERS = [
  { initials: 'MC', name: 'Maya Chen', mail: 'maya@example.com', color: MAYA },
  { initials: 'JP', name: 'Jon Park', mail: 'jon@example.com', color: JON },
  { initials: 'AR', name: 'Ana Ruiz', mail: 'ana@example.com', color: ANA },
]

export function ConnectedUsersScene({ theme, name }: DemoProps & { name: string }) {
  const initial: ConnS = { n: 1 }
  const poster: ConnS = { n: 3 }

  async function script(a: Act<ConnS>) {
    await a.wait(1100)
    a.mark('jon')
    await a.set({ n: 2 })
    await a.wait(1800)
    a.mark('ana')
    await a.set({ n: 3 })
    await a.wait(3000)
    a.mark('reset')
    await a.set({ n: 1 })
    await a.wait(1400)
  }

  return (
    <Stage<ConnS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className={`wv-scene ${name}`}>
      {(s) => (
        <>
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode x={230} y={250} w={170} h={110} />
            <EllipseNode x={430} y={300} w={150} h={100} />
          </NodeLayer>
          <div className="wv-people">
            {USERS.map((u, i) => (
              <span key={u.initials} className="wv-people__avatar" data-on={s.n > i || undefined} style={{ '--who': u.color } as CSSProperties}>
                {u.initials}
              </span>
            ))}
            <span className="wv-people__count">{s.n}</span>
          </div>
          <div className="wv-roster">
            {USERS.map((u, i) => (
              <div key={u.initials} className="wv-roster__row" data-on={s.n > i || undefined}>
                <span className="wv-people__avatar" data-on style={{ '--who': u.color, marginLeft: 0 } as CSSProperties}>
                  {u.initials}
                </span>
                <span className="wv-roster__text">
                  <span>{u.name}</span>
                  <span className="wv-roster__mail">{u.mail}</span>
                </span>
              </div>
            ))}
          </div>
          <Toolbar />
        </WeaveCanvas>
        {USERS.map((u, i) => (
          <div key={u.initials} style={{ opacity: s.n > i ? 1 : 0, transition: 'opacity 0.25s ease' }}>
            <Peer name={u.name.split(' ')[0]} color={u.color} at={CURSORS[i][s.n - 1] ?? CURSORS[i][CURSORS[i].length - 1]} slow={i === 1} />
          </div>
        ))}
        </>
      )}
    </Stage>
  )
}
