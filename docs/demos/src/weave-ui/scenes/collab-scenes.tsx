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

type PresS = { jon: 'rest' | 'grab' | 'drop'; carry: boolean }
const NODE0: Box = { x: 300, y: 200, w: 170, h: 110 }
const DROP = { dx: 260, dy: 140 }

export function PresenceScene({ theme, name }: DemoProps & { name: string }) {
  const initial: PresS = { jon: 'rest', carry: false }
  const poster: PresS = { jon: 'drop', carry: true }
  const spot = (s: PresS['jon']): Point => (s === 'rest' ? { x: 760, y: 150 } : s === 'grab' ? { x: NODE0.x + 120, y: NODE0.y + 60 } : { x: NODE0.x + 120 + DROP.dx, y: NODE0.y + 60 + DROP.dy })

  async function script(a: Act<PresS>) {
    await a.wait(800)
    a.mark('arrive')
    a.put({ jon: 'grab' })
    await a.wait(1400)
    a.mark('drag')
    a.put({ jon: 'drop', carry: true })
    await a.wait(1600)
    await a.wait(2200)
    a.mark('reset')
    a.put({ jon: 'rest' })
    await a.wait(1200)
    a.put({ carry: false })
    await a.wait(900)
  }

  return (
    <Stage<PresS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} className={`wv-scene ${name}`}>
      {(s) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <EllipseNode x={640} y={340} w={160} h={100} />
              <g className="wv-follow" data-slow style={{ transform: s.carry ? `translate(${DROP.dx}px, ${DROP.dy}px)` : 'none' }}>
                <RectNode {...box(NODE0)} />
              </g>
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
          <Peer name="Jon" color={JON} at={spot(s.jon)} slow />
        </>
      )}
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

type SelS = { jon: number; maya: number | null }
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
  const initial: SelS = { jon: -1, maya: null }
  const poster: SelS = { jon: 0, maya: 3 }

  async function script(a: Act<SelS>) {
    await a.wait(900)
    a.mark('jon')
    await a.set({ jon: 1 })
    await a.wait(1800)
    a.mark('maya')
    await a.set({ maya: 3 })
    await a.wait(1800)
    a.mark('change')
    await a.set({ jon: 0 })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ jon: -1, maya: null })
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
                <UserSel key={`j${i}`} at={n} color={JON} who="Jon" show={s.jon === i} />
              ))}
              {NODES.map((n, i) => (
                <UserSel key={`m${i}`} at={n} color={MAYA} who="Maya" show={s.maya === i} />
              ))}
            </NodeLayer>
            <Toolbar />
          </WeaveCanvas>
          <Peer name="Jon" color={JON} at={s.jon >= 0 ? center(NODES[s.jon]) : { x: 760, y: 150 }} slow />
          <Peer name="Maya" color={MAYA} at={s.maya !== null ? center(NODES[s.maya]) : { x: 120, y: 480 }} />
        </>
      )}
    </Stage>
  )
}

// ---- Connected users: the plugin returns who is in the session; the UI shows them -------------------------------------

type ConnS = { n: 1 | 2 | 3 }
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
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode x={300} y={250} w={170} h={110} />
            <EllipseNode x={530} y={300} w={160} h={100} />
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
      )}
    </Stage>
  )
}
