// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { ArrowLeftRight, Cloud, Database, FileJson, Image as ImageIcon, Monitor, Server } from 'lucide-react'
import { Connector, Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { FlowBox, MessageChip, MiniCanvas } from '../flow/flow'
import './scenes.css'
import '../flow/flow.css'
import './store-scenes.css'
import './canvas-plugin-scenes.css'

const W = 240
const BOX_H = 62
const CANVAS_H = 150
const SHAPE = { w: 60, h: 40 }
const FROM = { x: 30, y: 60 }
const TO = { x: 150, y: 70 }
const REST: Point = { x: 480, y: 505 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const stage = (theme: DemoProps['theme'], name: string) => ({ width: 960, height: 540, theme, tokens: weaveTokens(theme), className: `wv-scene wv-store ${name}` })
const abs = (x: number, y: number, w?: number): CSSProperties => ({ left: x, top: y, width: w, boxSizing: 'border-box' })

// A client card: a header (what it is, its connection state) over a mini canvas holding one rectangle
function Client({ x, y, title, sub, at, target, hide }: { x: number; y: number; title: string; sub: string; at: Point; target: string; hide?: boolean }) {
  return (
    <>
      <FlowBox icon={Monitor} title={title} sub={sub} target={`${target}-box`} style={abs(x, y, W)} />
      <MiniCanvas style={{ position: 'absolute', left: x, top: y + BOX_H, width: W, height: CANVAS_H, boxSizing: 'border-box' }}>
        <svg className="wv-fill" width="100%" height="100%" aria-hidden>
          <rect className="wv-store__shape" data-hide={hide || undefined} x={0} y={0} width={SHAPE.w} height={SHAPE.h} style={{ transform: `translate(${at.x}px, ${at.y}px)` }} />
        </svg>
      </MiniCanvas>
    </>
  )
}

// A two-way link: one line with an arrowhead at each end
function Bi({ from, to, show }: { from: Point; to: Point; show: boolean }) {
  return (
    <>
      <Connector from={from} to={to} route="straight" arrow show={show} />
      <Connector from={to} to={from} route="straight" arrow show={show} />
    </>
  )
}

const Ground = () => <div className="wv-store__ground" data-target="canvas" />

// ---- WebSockets: a change made by one client reaches the other through the server -----------------------------------------

type SyncS = { conn: boolean; chip: Point; chipOn: boolean; a: Point; b: Point }

export function StoreSyncScene({ theme, name }: DemoProps & { name: string; variant?: 'websockets' }) {
  const top = 162
  const ax = 60
  const bx = 660
  const hubX = 360
  const hubW = 240
  const cy = top + BOX_H + CANVAS_H / 2
  const hubY = cy - BOX_H / 2
  const aEdge: Point = { x: ax + W, y: cy }
  const hubL: Point = { x: hubX, y: cy }
  const hubR: Point = { x: hubX + hubW, y: cy }
  const bEdge: Point = { x: bx, y: cy }
  const hubC: Point = { x: hubX + hubW / 2, y: cy }
  const origin = { x: ax, y: top + BOX_H }
  const grab: Point = { x: origin.x + FROM.x + SHAPE.w / 2, y: origin.y + FROM.y + SHAPE.h / 2 }
  const drop: Point = { x: origin.x + TO.x + SHAPE.w / 2, y: origin.y + TO.y + SHAPE.h / 2 }
  const initial: SyncS = { conn: false, chip: aEdge, chipOn: false, a: FROM, b: FROM }
  const poster: SyncS = { conn: true, chip: hubC, chipOn: true, a: TO, b: FROM }

  async function script(a: Act<SyncS>) {
    await a.wait(900)
    a.mark('connect')
    await a.set({ conn: true })
    await a.wait(1800)
    a.mark('draw')
    await a.move(grab)
    await a.wait(300)
    await a.move(drop, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ a: { x: FROM.x + (p.x - grab.x), y: FROM.y + (p.y - grab.y) } }) })
    await a.wait(400)
    a.mark('send')
    a.put({ chip: aEdge })
    await a.set({ chipOn: true })
    await a.wait(300)
    await a.set({ chip: hubC })
    await a.wait(1000)
    await a.set({ chip: bEdge })
    await a.wait(900)
    await a.set({ chipOn: false, b: TO })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ conn: false, a: FROM, b: FROM })
    await a.wait(1000)
  }

  const status = (s: SyncS) => (s.conn ? 'connected' : 'connecting')
  return (
    <Stage<SyncS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <>
          <Ground />
          <Client x={ax} y={top} title="Client A" sub={status(s)} at={s.a} target="a" />
          <Client x={bx} y={top} title="Client B" sub={status(s)} at={s.b} target="b" />
          <FlowBox className="wv-store__center" icon={Server} title="WebSocket server" sub="Express" target="hub" tone="accent" style={abs(hubX, hubY, hubW)} />
          <Bi from={aEdge} to={hubL} show={s.conn} />
          <Bi from={hubR} to={bEdge} show={s.conn} />
          <MessageChip at={s.chip} show={s.chipOn}>
            update
          </MessageChip>
        </>
      )}
    </Stage>
  )
}

// ---- Azure Web PubSub: the update goes to the service (the queue), to your server that persists it, and is broadcast back ---

type AzS = { conn: boolean; chip: Point; chipOn: boolean; chip2: Point; chip2On: boolean; label: string; a: Point; b: Point; db: boolean }

export function AzureSyncScene({ theme, name }: DemoProps & { name: string }) {
  const top = 100
  const ax = 60
  const bx = 660
  const hubX = 360
  const hubW = 240
  const cy = top + BOX_H + CANVAS_H / 2
  const hubY = cy - BOX_H / 2
  const backY = 340
  const backCy = backY + BOX_H / 2
  const aEdge: Point = { x: ax + W, y: cy }
  const hubL: Point = { x: hubX, y: cy }
  const hubR: Point = { x: hubX + hubW, y: cy }
  const bEdge: Point = { x: bx, y: cy }
  const down = hubX + hubW / 2 - 16
  const up = hubX + hubW / 2 + 16
  const origin = { x: ax, y: top + BOX_H }
  const grab: Point = { x: origin.x + FROM.x + SHAPE.w / 2, y: origin.y + FROM.y + SHAPE.h / 2 }
  const drop: Point = { x: origin.x + TO.x + SHAPE.w / 2, y: origin.y + TO.y + SHAPE.h / 2 }
  const dbL: Point = { x: bx, y: backCy }
  const initial: AzS = { conn: false, chip: aEdge, chipOn: false, chip2: { x: up, y: cy }, chip2On: false, label: 'update', a: FROM, b: FROM, db: false }
  const poster: AzS = { conn: true, chip: { x: up, y: cy }, chipOn: true, chip2: { x: up, y: cy }, chip2On: true, label: 'broadcast', a: TO, b: FROM, db: true }

  async function script(a: Act<AzS>) {
    await a.wait(900)
    a.mark('connect')
    await a.set({ conn: true })
    await a.wait(1800)
    a.mark('draw')
    await a.move(grab)
    await a.wait(300)
    await a.move(drop, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ a: { x: FROM.x + (p.x - grab.x), y: FROM.y + (p.y - grab.y) } }) })
    await a.wait(400)
    a.mark('queue')
    a.put({ chip: aEdge, label: 'update' })
    await a.set({ chipOn: true })
    await a.wait(300)
    await a.set({ chip: { x: down, y: cy } })
    await a.wait(1000)
    a.mark('server')
    await a.set({ label: 'event', chip: { x: down, y: backCy } })
    await a.wait(1100)
    a.mark('persist')
    await a.set({ label: 'persist', chip: { x: (hubX + hubW + bx) / 2, y: backCy } })
    await a.wait(1000)
    await a.set({ chipOn: false, db: true })
    await a.wait(700)
    a.mark('broadcast')
    a.put({ chip: { x: up, y: backCy }, label: 'broadcast' })
    await a.wait(900)
    await a.set({ chipOn: true })
    await a.wait(250)
    await a.set({ chip: { x: up, y: cy } })
    await a.wait(1000)
    a.put({ chip2: { x: up, y: cy } })
    await a.set({ label: 'update', chip2On: true })
    await a.wait(250)
    await a.set({ chip: aEdge, chip2: bEdge })
    await a.wait(950)
    await a.set({ chipOn: false, chip2On: false, b: TO })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ conn: false, a: FROM, b: FROM, db: false })
    await a.wait(1000)
  }

  const status = (s: AzS) => (s.conn ? 'connected' : 'connecting')
  return (
    <Stage<AzS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <>
          <Ground />
          <Client x={ax} y={top} title="Client A" sub={status(s)} at={s.a} target="a" />
          <Client x={bx} y={top} title="Client B" sub={status(s)} at={s.b} target="b" />
          <FlowBox className="wv-store__center" icon={Cloud} title="Azure Web PubSub" sub="the queue" target="hub" tone="accent" style={abs(hubX, hubY, hubW)} />
          <FlowBox className="wv-store__center" icon={Server} title="Express backend" sub="your server" target="back" style={abs(hubX, backY, hubW)} />
          <FlowBox className="wv-store__center wv-store__file" icon={Database} title="Database" sub={s.db ? 'persisted' : 'storage'} target="db" style={{ ...abs(bx, backY, W), opacity: s.db ? 1 : 0.45 }} />
          <Bi from={aEdge} to={hubL} show={s.conn} />
          <Bi from={hubR} to={bEdge} show={s.conn} />
          <Connector from={{ x: down, y: hubY + BOX_H }} to={{ x: down, y: backY }} route="straight" arrow show={s.conn} />
          <Connector from={{ x: up, y: backY }} to={{ x: up, y: hubY + BOX_H }} route="straight" arrow show={s.conn} />
          <Connector from={{ x: hubX + hubW, y: backCy }} to={dbL} route="straight" arrow show={s.conn} />
          <MessageChip at={s.chip} show={s.chipOn}>
            {s.label}
          </MessageChip>
          <MessageChip at={s.chip2} show={s.chip2On}>
            update
          </MessageChip>
        </>
      )}
    </Stage>
  )
}

// ---- Standalone: room data goes in, the store renders it, an image comes out -------------------------------------------

type StS = { chip: Point; chipOn: boolean; label: string; rendered: boolean; done: boolean }

export function StandaloneScene({ theme, name }: DemoProps & { name: string }) {
  const top = 162
  const left = 60
  const right = 660
  const cx = 380
  const cy = top + BOX_H + CANVAS_H / 2
  const dataBox: Point = { x: left + 200, y: cy }
  const storeL: Point = { x: cx, y: cy }
  const storeR: Point = { x: cx + W, y: cy }
  const imgL: Point = { x: right + 40, y: cy }
  const initial: StS = { chip: dataBox, chipOn: false, label: 'room data', rendered: false, done: false }
  const poster: StS = { chip: imgL, chipOn: false, label: 'png', rendered: true, done: true }

  async function script(a: Act<StS>) {
    await a.wait(1000)
    a.mark('data')
    await a.set({ chipOn: true })
    await a.wait(300)
    await a.set({ chip: storeL })
    await a.wait(1100)
    await a.set({ chipOn: false })
    a.mark('render')
    await a.set({ rendered: true })
    await a.wait(1400)
    a.mark('export')
    a.put({ chip: storeR, label: 'png' })
    await a.set({ chipOn: true })
    await a.wait(300)
    await a.set({ chip: imgL })
    await a.wait(1000)
    await a.set({ chipOn: false, done: true })
    await a.wait(2800)
    a.mark('reset')
    await a.set({ rendered: false, done: false })
    await a.wait(900)
    a.put({ chip: dataBox, label: 'room data' })
    await a.wait(300)
  }

  return (
    <Stage<StS> {...stage(theme, name)} initial={initial} poster={poster} script={script}>
      {(s) => (
        <>
          <Ground />
          <FlowBox className="wv-store__center" icon={FileJson} title="Room data" sub="from your app" target="data" style={abs(left, cy - BOX_H / 2, 200)} />
          <FlowBox className="wv-store__center" icon={Server} title="Standalone store" sub="renders the room" target="store" tone="accent" style={abs(cx, top, W)} />
          <MiniCanvas style={{ position: 'absolute', left: cx, top: top + BOX_H, width: W, height: CANVAS_H, boxSizing: 'border-box' }}>
            <svg className="wv-fill" width="100%" height="100%" aria-hidden>
              <rect className="wv-store__shape" data-hide={!s.rendered || undefined} x={30} y={30} width={SHAPE.w} height={SHAPE.h} />
              <ellipse className="wv-store__shape" data-hide={!s.rendered || undefined} cx={160} cy={95} rx={36} ry={24} />
            </svg>
          </MiniCanvas>
          <FlowBox className="wv-store__file" style={{ ...abs(right + 40, cy - BOX_H / 2, 200), opacity: s.done ? 1 : 0.35 }} icon={ImageIcon} title="Image" sub="room.png" target="img" />
          <Connector from={{ x: left + 200, y: cy }} to={storeL} route="straight" arrow show />
          <Connector from={storeR} to={{ x: right + 40, y: cy }} route="straight" arrow show={s.rendered} />
          <MessageChip at={s.chip} show={s.chipOn}>
            {s.label}
          </MessageChip>
        </>
      )}
    </Stage>
  )
}

// ---- Stores overview: the Store is installed on every client; the Transport carries each change to the Store backend and back ---

const STEPS = ["A client's Store applies the change to its own model.", 'The Transport carries it to the Store backend.', "The backend sends it back, and every other client's Store applies it."]

// Two elements, a rectangle and an ellipse, each with a start and a moved position (px inside a 240 x 96 canvas)
const COMPACT = 96
const MODEL_H = 112
const R0: Point = { x: 16, y: 12 }
const R1: Point = { x: 84, y: 26 }
const E0: Point = { x: 150, y: 46 }
const E1: Point = { x: 156, y: 8 }
const ELL = { w: 60, h: 40 }
type Room = { r: Point; e: Point }
const ROOM0: Room = { r: R0, e: E0 }

// One client: its canvas (what the user sees) over the Store installed on it, which holds the model as JSON
function ClientStore({ x, y, title, room, hl, target }: { x: number; y: number; title: string; room: Room; hl: 'r' | 'e' | null; target: string }) {
  return (
    <>
      <FlowBox icon={Monitor} title={title} sub="connected" target={`${target}-box`} style={abs(x, y, W)} />
      <MiniCanvas style={{ position: 'absolute', left: x, top: y + BOX_H, width: W, height: COMPACT, boxSizing: 'border-box' }}>
        <svg className="wv-fill" width={W - 2} height={COMPACT - 2} aria-hidden>
          <rect className="wv-store__shape" x={0} y={0} width={SHAPE.w} height={SHAPE.h} style={{ transform: `translate(${room.r.x}px, ${room.r.y}px)` }} />
          <ellipse className="wv-store__shape" cx={ELL.w / 2} cy={ELL.h / 2} rx={ELL.w / 2} ry={ELL.h / 2} style={{ transform: `translate(${room.e.x}px, ${room.e.y}px)` }} />
        </svg>
      </MiniCanvas>
      <div className="wv-model-card" style={{ left: x, top: y + BOX_H + COMPACT, width: W, height: MODEL_H }}>
        <span className="wv-model-card__title">
          <Database size={12} strokeWidth={1.5} />
          Store
        </span>
        <span className="wv-model-card__line">{'{'}</span>
        <span className="wv-model-card__line wv-model-card__line--in" data-hl={hl === 'r' || undefined}>
          {`"rect": {"x": ${Math.round(room.r.x)}, "y": ${Math.round(room.r.y)}},`}
        </span>
        <span className="wv-model-card__line wv-model-card__line--in" data-hl={hl === 'e' || undefined}>
          {`"ellipse": {"x": ${Math.round(room.e.x)}, "y": ${Math.round(room.e.y)}}`}
        </span>
        <span className="wv-model-card__line">{'}'}</span>
      </div>
    </>
  )
}

type IxS = { step: 0 | 1 | 2; chip: Point; chipOn: boolean; a: Room; b: Room; ha: 'r' | 'e' | null; hb: 'r' | 'e' | null; bk: boolean }

export function StoresIndexScene({ theme, name }: DemoProps & { name: string }) {
  const top = 90
  const ax = 60
  const bx = 660
  const hubX = 380
  const hubW = 200
  const total = BOX_H + COMPACT + MODEL_H
  const cy = top + total / 2
  const hubY = cy - BOX_H / 2
  const backY = 318
  const backCy = backY + BOX_H / 2
  const aEdge: Point = { x: ax + W, y: cy }
  const bEdge: Point = { x: bx, y: cy }
  const hubL: Point = { x: hubX, y: cy }
  const hubR: Point = { x: hubX + hubW, y: cy }
  const hubC: Point = { x: hubX + hubW / 2, y: cy }
  const down = hubX + hubW / 2 - 16
  const up = hubX + hubW / 2 + 16
  const at = (x: number, p: Point, dx: number, dy: number): Point => ({ x: x + p.x + dx, y: top + BOX_H + p.y + dy })
  const initial: IxS = { step: 0, chip: aEdge, chipOn: false, a: ROOM0, b: ROOM0, ha: null, hb: null, bk: false }
  const poster: IxS = { step: 1, chip: { x: (aEdge.x + hubL.x) / 2, y: cy }, chipOn: true, a: { r: R1, e: E0 }, b: ROOM0, ha: 'r', hb: null, bk: false }

  async function script(a: Act<IxS>) {
    await a.wait(1100)
    // Round one: client A changes the rectangle. Round two: client B changes the ellipse.
    const rooms: Record<'a' | 'b', Room> = { a: ROOM0, b: ROOM0 }
    for (const side of ['a', 'b'] as const) {
      const rect = side === 'a'
      const x = rect ? ax : bx
      const from = rect ? R0 : E0
      const to = rect ? R1 : E1
      const grab = at(x, from, 30, 20)
      const drop = at(x, to, 30, 20)
      const key = rect ? 'r' : 'e'
      const other = rect ? 'b' : 'a'
      const mine = rect ? 'ha' : 'hb'
      const theirs = rect ? 'hb' : 'ha'
      a.mark(rect ? 'client-a-rectangle' : 'client-b-ellipse')
      await a.set({ step: 0 })
      await a.move(grab, { duration: 900 })
      await a.wait(250)
      await a.move(drop, {
        duration: 1100,
        path: STRAIGHT,
        onMove: (p) => a.put({ [side]: { ...rooms[side], [key]: { x: from.x + (p.x - grab.x), y: from.y + (p.y - grab.y) } }, [mine]: key } as Partial<IxS>),
      })
      rooms[side] = { ...rooms[side], [key]: to }
      await a.wait(700)
      a.mark('to-backend')
      await a.set({ step: 1 })
      a.put({ chip: rect ? aEdge : bEdge })
      await a.set({ chipOn: true })
      await a.wait(300)
      await a.set({ chip: hubC })
      await a.wait(900)
      await a.set({ chip: { x: down, y: backCy } })
      await a.wait(1000)
      await a.set({ bk: true })
      await a.wait(700)
      a.mark('back-to-clients')
      await a.set({ step: 2 })
      a.put({ chip: { x: up, y: backCy } })
      await a.wait(700)
      await a.set({ chip: { x: up, y: cy } })
      await a.wait(900)
      await a.set({ chip: rect ? bEdge : aEdge })
      await a.wait(1000)
      rooms[other] = { ...rooms[other], [key]: to }
      await a.set({ chipOn: false, bk: false, [other]: rooms[other], [theirs]: key } as Partial<IxS>)
      await a.wait(1800)
      await a.set({ ha: null, hb: null })
      await a.wait(300)
    }
    a.mark('reset')
    await a.move(REST)
    await a.wait(600)
    a.put({ step: 0, a: ROOM0, b: ROOM0, ha: null, hb: null, bk: false })
    await a.wait(700)
  }

  return (
    <Stage<IxS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <>
          <Ground />
          <ClientStore x={ax} y={top} title="Client A" room={s.a} hl={s.ha} target="a" />
          <ClientStore x={bx} y={top} title="Client B" room={s.b} hl={s.hb} target="b" />
          <FlowBox className="wv-store__center" icon={ArrowLeftRight} title="Transport" sub="carries the changes" target="transport" tone="accent" style={abs(hubX, hubY, hubW)} />
          <FlowBox className="wv-store__center wv-store__file" icon={Database} title="Store" sub="Backend" target="backend" tone={s.bk ? 'accent' : 'default'} style={{ ...abs(hubX, backY, hubW), opacity: s.bk ? 1 : 0.55 }} />
          <Bi from={aEdge} to={hubL} show />
          <Bi from={hubR} to={bEdge} show />
          <Connector from={{ x: down, y: hubY + BOX_H }} to={{ x: down, y: backY }} route="straight" arrow show />
          <Connector from={{ x: up, y: backY }} to={{ x: up, y: hubY + BOX_H }} route="straight" arrow show />
          <div className="wv-store__caption" style={{ top: 420 }}>
            <span className="wv-store__step">{s.step + 1}</span>
            {STEPS[s.step]}
          </div>
          <MessageChip at={s.chip} show={s.chipOn}>
            change
          </MessageChip>
        </>
      )}
    </Stage>
  )
}
