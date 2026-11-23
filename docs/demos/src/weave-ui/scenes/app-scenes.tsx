// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { Stage, Window, type Act, type Point, type Rect } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { BottomToolbar } from '../bottom-toolbar'
import { Peer } from '../peer'
import { RoomHeader, StatusCard } from '../room'
import { NodeLayer, NodeSelection, RectNode, type Box } from '../nodes/nodes'
import { MovingSelection } from './action-scenes'
import { TOOL_INFO, type ToolId } from '../toolbar'
import './scenes.css'
import './collab-scenes.css'
import './app-scenes.css'

// The showcase app the way a reader meets it: the Enter Room form, then the room page with its tool bar and
// the people in the room. Three demos share it: the quickstart (the whole way in), the Enter Room page and
// the Room page of the manual installation.

export type AppVariant = 'quickstart' | 'enter' | 'room'

const MAYA = '#d1478a'
const JON = '#2f9e8f'
const ROOM = 'weave-room'
const USER = 'Maya'
const RECT: Box = { x: 330, y: 120, w: 240, h: 140 }
const JMOVE = { dx: 130, dy: 40 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

type S = {
  page: 'form' | 'room'
  room: string
  user: string
  focus: 'room' | 'user' | null
  loading: boolean
  conn: boolean
  people: number
  tool: ToolId
  hover: boolean
  rect: Box | null
  selected: boolean
  jon: 'off' | 'rest' | 'in' | 'grab' | 'drag'
  jsel: boolean
}

const EMPTY: S = { page: 'form', room: '', user: '', focus: null, loading: false, conn: false, people: 0, tool: 'move', hover: false, rect: null, selected: false, jon: 'off', jsel: false }
const FULL: Box = RECT

const ROOMS: Record<AppVariant, { url: (s: S) => string }> = {
  quickstart: { url: (s) => (s.page === 'room' ? `localhost:3000/rooms/${ROOM}` : 'localhost:3000') },
  enter: { url: (s) => (s.page === 'room' ? `localhost:3000/rooms/${ROOM}` : 'localhost:3000') },
  room: { url: () => 'localhost:3000/rooms/test' },
}

export function AppScene({ theme, name, variant }: DemoProps & { name: string; variant: AppVariant }) {
  const initial: S = variant === 'room' ? { ...EMPTY, page: 'room' } : EMPTY
  const poster: S =
    variant === 'enter'
      ? { ...EMPTY, room: ROOM, user: USER }
      : variant === 'room'
        ? { ...EMPTY, page: 'room', conn: true, people: 2, rect: FULL, selected: false, jon: 'drag', jsel: true }
        : { ...EMPTY, page: 'room', room: ROOM, user: USER, conn: true, people: 2, rect: FULL, jon: 'drag', jsel: true }
  const roomName = variant === 'room' ? 'test' : ROOM

  async function enter(a: Act<S>, fast: boolean) {
    const k = fast ? 55 : 80
    a.mark('room')
    await a.move('in-room', { duration: 900 })
    await a.wait(250)
    await a.click()
    await a.set({ focus: 'room' })
    await a.wait(300)
    await a.type('room', ROOM, { interval: k })
    await a.wait(350)
    a.mark('username')
    await a.move('in-user', { duration: 700 })
    await a.wait(200)
    await a.click()
    await a.set({ focus: 'user' })
    await a.wait(300)
    await a.type('user', USER, { interval: k + 20 })
    await a.wait(400)
    a.mark('enter')
    await a.move('enter-btn', { duration: 700 })
    await a.wait(250)
    await a.click({ at: 'enter-btn' })
    await a.set({ focus: null, loading: true })
    await a.wait(800)
    await a.set({ page: 'room', loading: false, people: 1 })
    await a.wait(900)
    await a.set({ conn: true })
    await a.wait(1100)
  }

  async function room(a: Act<S>) {
    const c = a.rect('app-canvas')
    const P = (x: number, y: number): Point => ({ x: c.x + x, y: c.y + y })
    a.mark('pick')
    await a.move('bt-rectangle', { duration: 1000 })
    await a.set({ hover: true })
    await a.wait(800)
    await a.click({ at: 'bt-rectangle' })
    await a.set({ hover: false, tool: 'rectangle' })
    await a.wait(400)
    a.mark('draw')
    await a.move(P(RECT.x, RECT.y), { duration: 800 })
    await a.wait(250)
    await a.move(P(RECT.x + RECT.w, RECT.y + RECT.h), { duration: 1100, path: STRAIGHT, onMove: (p) => a.put({ rect: { x: RECT.x, y: RECT.y, w: p.x - c.x - RECT.x, h: p.y - c.y - RECT.y } }) })
    await a.set({ tool: 'move', selected: true })
    await a.wait(900)
    await a.move(P(180, 330), { duration: 800 })
    await a.click()
    await a.set({ selected: false })
    a.mark('join')
    await a.set({ people: 2, jon: 'rest' })
    await a.wait(700)
    await a.set({ jon: 'in' })
    await a.wait(1300)
    await a.set({ jon: 'grab' })
    await a.wait(1300)
    await a.set({ jsel: true })
    await a.wait(500)
    a.mark('move')
    await a.set({ jon: 'drag' })
    await a.wait(1800)
  }

  async function script(a: Act<S>) {
    await a.wait(800)
    if (variant !== 'room') await enter(a, variant === 'quickstart')
    else {
      await a.wait(600)
      await a.set({ people: 1 })
      await a.wait(700)
      await a.set({ conn: true })
      await a.wait(900)
    }
    if (variant !== 'enter') await room(a)
    else await a.wait(1800)
    await a.wait(2200)
    a.mark('reset')
    await a.move({ x: 480, y: 500 }, { duration: 700 })
    await a.set({ jsel: false, selected: false })
    await a.wait(300)
    await a.set({ jon: 'off', people: variant === 'room' ? 0 : 0, conn: false })
    await a.wait(900)
    await a.set({ rect: null })
    if (variant !== 'room') {
      await a.set({ page: 'form' })
      await a.wait(500)
      a.put({ room: '', user: '', people: 0 })
    } else {
      a.put({ people: 0 })
    }
    await a.wait(700)
  }

  const jonAt = (s: S, c: Rect): Point => {
    if (!c.width) return { x: -100, y: -100 }
    const p = (x: number, y: number): Point => ({ x: c.x + x, y: c.y + y })
    const cx = RECT.x + RECT.w / 2
    const cy = RECT.y + RECT.h / 2
    if (s.jon === 'in') return p(cx - 40, cy + 30)
    if (s.jon === 'grab') return p(cx, cy)
    if (s.jon === 'drag') return p(cx + JMOVE.dx, cy + JMOVE.dy)
    return p(820, 120)
  }

  return (
    <Stage<S> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: { x: 480, y: 500 }, style: 'real', ripple: true }} className={`app ${name}`}>
      {(s, rect) => {
        const c = rect('app-canvas')
        const tip = rect('bt-rectangle')
        const dx = s.jon === 'drag' ? JMOVE.dx : 0
        const dy = s.jon === 'drag' ? JMOVE.dy : 0
        const people = [
          { initials: 'MC', color: MAYA, off: s.people < 1 },
          { initials: 'JP', color: JON, off: s.people < 2 },
        ]
        return (
          <>
            <Window url={ROOMS[variant].url(s)} className="app-win">
              <div className="app-body">
                <div className="app-page app-page--form" data-on={s.page === 'form' || undefined}>
                  <div className="app-form">
                    <div className="app-form__head">
                      <span className="app-form__mark" aria-hidden />
                      <div className="app-form__intro">
                        <div className="app-form__title">Join a room</div>
                        <div className="app-form__lead">Pick a room and tell us who you are.</div>
                      </div>
                    </div>
                    <span className="app-form__label">Room</span>
                    <div className="app-input" data-target="in-room" data-focus={s.focus === 'room' || undefined}>
                      <span className="app-input__typed">{s.room}</span>
                      <span className="app-input__placeholder" data-hide={!!s.room || undefined}>Room name</span>
                    </div>
                    <span className="app-form__label">Username</span>
                    <div className="app-input" data-target="in-user" data-focus={s.focus === 'user' || undefined}>
                      <span className="app-input__typed">{s.user}</span>
                      <span className="app-input__placeholder" data-hide={!!s.user || undefined}>Your username</span>
                    </div>
                    <div className="app-button" data-target="enter-btn" data-loading={s.loading || undefined}>
                      {s.loading ? 'Entering...' : 'Enter the room'}
                    </div>
                  </div>
                </div>
                <div className="app-page" data-on={s.page === 'room' || undefined}>
                  <WeaveCanvas className="app-room" data-target="app-canvas" data-cursor={s.tool === 'rectangle' ? 'crosshair' : undefined}>
                    <NodeLayer>
                      {s.rect && (
                        <g className="wv-follow" data-slow style={{ transform: `translate(${dx}px, ${dy}px)` }}>
                          <RectNode {...s.rect} />
                        </g>
                      )}
                      {s.rect && <NodeSelection className="wv-instant" {...s.rect} show={s.selected} />}
                      {s.rect && <MovingSelection x={s.rect.x + dx} y={s.rect.y + dy} w={s.rect.w} h={s.rect.h} show={s.jsel} color={JON} />}
                    </NodeLayer>
                    <RoomHeader name={roomName} className="app-room__header" />
                    <StatusCard people={people} zoom="90%" connecting={!s.conn} className="app-room__status" />
                    <BottomToolbar active={s.tool} hovered={s.hover ? 'rectangle' : undefined} className="app-room__tools" />
                  </WeaveCanvas>
                </div>
              </div>
            </Window>
            <span className="app-tip" data-show={(s.hover && tip.width > 0) || undefined} style={{ left: tip.x + tip.width / 2, top: tip.y - 8 }}>
              <span>{TOOL_INFO.rectangle.label}</span>
              <span className="app-tip__key">R</span>
            </span>
            <div style={{ opacity: s.jon === 'off' ? 0 : 1, transition: 'opacity 0.25s ease' }}>
              <Peer name="Jon" color={JON} at={jonAt(s, c)} slow />
            </div>
          </>
        )
      }}
    </Stage>
  )
}
