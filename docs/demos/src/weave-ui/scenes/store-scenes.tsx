// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { Cloud, FileJson, Globe, Image as ImageIcon, Monitor, Server } from 'lucide-react'
import { Connector, Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { FlowBox, MessageChip, MiniCanvas } from '../flow/flow'
import './scenes.css'
import '../flow/flow.css'
import './store-scenes.css'

const W = 240
const BOX_H = 62
const CANVAS_H = 150
const SHAPE = { w: 60, h: 40 }
const FROM = { x: 30, y: 60 }
const TO = { x: 150, y: 70 }
const REST: Point = { x: 480, y: 500 }
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

// ---- Websockets and Azure Web PubSub: a change made by one client reaches the other through the transport ---------------

type SyncS = { conn: boolean; chip: Point; chipOn: boolean; a: Point; b: Point }
type Variant = 'websockets' | 'azure'

export function StoreSyncScene({ theme, name, variant }: DemoProps & { name: string; variant: Variant }) {
  const azure = variant === 'azure'
  const top = azure ? 100 : 162
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
  const backY = 380
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
    await a.drag(drop, (p) => a.put({ a: { x: FROM.x + (p.x - grab.x), y: FROM.y + (p.y - grab.y) } }), { duration: 1200 })
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
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <Client x={ax} y={top} title="Client A" sub={status(s)} at={s.a} target="a" />
            <Client x={bx} y={top} title="Client B" sub={status(s)} at={s.b} target="b" />
            <FlowBox className="wv-store__center" icon={azure ? Cloud : Server} title={azure ? 'Azure Web PubSub' : 'WebSocket server'} sub={azure ? 'transport' : 'Express'} target="hub" tone="accent" style={abs(hubX, hubY, hubW)} />
            {azure && <FlowBox className="wv-store__center" icon={Server} title="Express backend" sub="persistence" target="back" style={abs(hubX, backY, hubW)} />}
            <MessageChip at={s.chip} show={s.chipOn}>
              update
            </MessageChip>
          </WeaveCanvas>
          <Connector from={aEdge} to={hubL} route="straight" arrow show={s.conn} dots="both" />
          <Connector from={hubR} to={bEdge} route="straight" arrow show={s.conn} dots="both" />
          {azure && <Connector from={{ x: hubC.x, y: hubY + BOX_H }} to={{ x: hubC.x, y: backY }} route="straight" dashed show={s.conn} />}
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
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <FlowBox className="wv-store__center" icon={FileJson} title="Room data" sub="from your app" target="data" style={abs(left, cy - BOX_H / 2, 200)} />
            <FlowBox className="wv-store__center" icon={Server} title="Standalone store" sub="renders the room" target="store" tone="accent" style={abs(cx, top, W)} />
            <MiniCanvas style={{ position: 'absolute', left: cx, top: top + BOX_H, width: W, height: CANVAS_H, boxSizing: 'border-box' }}>
              <svg className="wv-fill" width="100%" height="100%" aria-hidden>
                <rect className="wv-store__shape" data-hide={!s.rendered || undefined} x={30} y={30} width={SHAPE.w} height={SHAPE.h} />
                <ellipse className="wv-store__shape" data-hide={!s.rendered || undefined} cx={160} cy={95} rx={36} ry={24} />
              </svg>
            </MiniCanvas>
            <FlowBox className="wv-store__file" style={{ ...abs(right + 40, cy - BOX_H / 2, 200), opacity: s.done ? 1 : 0.35 }} icon={ImageIcon} title="Image" sub="room.png" target="img" />
            <MessageChip at={s.chip} show={s.chipOn}>
              {s.label}
            </MessageChip>
          </WeaveCanvas>
          <Connector from={{ x: left + 200, y: cy }} to={storeL} route="straight" arrow show />
          <Connector from={storeR} to={{ x: right + 40, y: cy }} route="straight" arrow show={s.rendered} />
        </>
      )}
    </Stage>
  )
}

// ---- Stores index: the same app, a different store ---------------------------------------------------------------------

type IxS = { i: 0 | 1 | 2 }
const STORES = [
  { store: 'WebSockets', backend: 'Express server', icon: Server },
  { store: 'Azure Web PubSub', backend: 'Azure Web PubSub', icon: Cloud },
  { store: 'Standalone', backend: 'Node renderer', icon: Globe },
]

export function StoresIndexScene({ theme, name }: DemoProps & { name: string }) {
  const top = 162
  const cy = top + BOX_H + CANVAS_H / 2
  const ax = 60
  const sx = 380
  const bx = 700
  const initial: IxS = { i: 0 }
  const poster: IxS = { i: 1 }

  async function script(a: Act<IxS>) {
    await a.wait(2200)
    a.mark('azure')
    await a.set({ i: 1 })
    await a.wait(2200)
    a.mark('standalone')
    await a.set({ i: 2 })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ i: 0 })
    await a.wait(1000)
  }

  return (
    <Stage<IxS> {...stage(theme, name)} initial={initial} poster={poster} script={script}>
      {(s) => {
        const cur = STORES[s.i]
        return (
          <>
            <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
              <Client x={ax} y={top} title="Your app" sub="Weave.js" at={FROM} target="a" />
              <FlowBox className="wv-store__center" icon={Cloud} title="Store" sub={cur.store} target="store" tone="accent" style={abs(sx, cy - BOX_H / 2, 200)} />
              <FlowBox className="wv-store__center" icon={cur.icon} title={cur.backend} sub="backend" target="back" style={abs(bx, cy - BOX_H / 2, 200)} />
            </WeaveCanvas>
            <Connector from={{ x: ax + W, y: cy }} to={{ x: sx, y: cy }} route="straight" arrow show dots="both" />
            <Connector from={{ x: sx + 200, y: cy }} to={{ x: bx, y: cy }} route="straight" arrow show dots="both" />
          </>
        )
      }}
    </Stage>
  )
}
