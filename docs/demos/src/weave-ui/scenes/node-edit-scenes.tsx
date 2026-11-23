// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { LineHandles, MeasureNode, NodeLayer, NodeSelection, RectNode, StickyNode, type Box } from '../nodes/nodes'
import { WeaveToolbar } from '../toolbar'
import './scenes.css'
import './node-edit-scenes.css'

const REST: Point = { x: 790, y: 460 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const Toolbar = () => (
  <div className="wv-scene__toolbar">
    <WeaveToolbar active="move" />
  </div>
)
const stage = (theme: DemoProps['theme'], name: string) => ({ width: 960, height: 540, theme, tokens: weaveTokens(theme), className: `wv-scene ${name}` })

// ---- Sticky note: move it, make it bigger, change its text -------------------------------------------------------------

type NoteS = { box: Box; selected: boolean; editing: boolean; text: string; show: boolean }
const NOTE0: Box = { x: 210, y: 250, w: 150, h: 130 }
const NOTE_MOVE = { dx: 170, dy: -80 }
const NOTE_GROW = { dx: 110, dy: 100 }
const NOTE1: Box = { ...NOTE0, x: NOTE0.x + NOTE_MOVE.dx, y: NOTE0.y + NOTE_MOVE.dy }
const NOTE2: Box = { ...NOTE1, w: NOTE1.w + NOTE_GROW.dx, h: NOTE1.h + NOTE_GROW.dy }
const NOTE_TEXT = 'Ship the docs'

export function StickyNoteNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: NoteS = { box: NOTE0, selected: false, editing: false, text: 'Idea', show: true }
  const poster: NoteS = { box: NOTE2, selected: true, editing: false, text: NOTE_TEXT, show: true }

  async function script(a: Act<NoteS>) {
    await a.wait(700)
    a.mark('select')
    await a.move(center(NOTE0))
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)
    a.mark('move')
    const from = center(NOTE0)
    await a.move({ x: from.x + NOTE_MOVE.dx, y: from.y + NOTE_MOVE.dy }, {
      duration: 1100,
      path: STRAIGHT,
      onMove: (p) => a.put({ box: { ...NOTE0, x: NOTE0.x + (p.x - from.x), y: NOTE0.y + (p.y - from.y) } }),
    })
    await a.wait(500)
    a.mark('resize')
    const anchor: Point = { x: NOTE1.x + NOTE1.w, y: NOTE1.y + NOTE1.h }
    await a.move(anchor, { duration: 700 })
    await a.wait(250)
    await a.move({ x: anchor.x + NOTE_GROW.dx, y: anchor.y + NOTE_GROW.dy }, {
      duration: 1100,
      path: STRAIGHT,
      onMove: (p) => a.put({ box: { ...NOTE1, w: NOTE1.w + (p.x - anchor.x), h: NOTE1.h + (p.y - anchor.y) } }),
    })
    await a.wait(600)
    a.mark('edit')
    await a.move(center(NOTE2), { duration: 700 })
    await a.wait(250)
    await a.click(undefined, { double: true })
    await a.set({ editing: true })
    await a.wait(400)
    await a.key('ctrl+a')
    await a.set({ text: '' })
    await a.wait(250)
    await a.type('text', NOTE_TEXT, { interval: 90 })
    await a.wait(600)
    await a.set({ editing: false })
    await a.wait(2200)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ box: NOTE0, text: 'Idea' })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<NoteS> {...stage(theme, name)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <StickyNode {...s.box} text={s.text} />
            </g>
            <rect className="wv-note-edit" data-show={s.editing || undefined} x={s.box.x} y={s.box.y} width={s.box.w} height={s.box.h} />
            <NodeSelection {...s.box} show={s.selected && !s.editing} />
          </NodeLayer>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Measure: it sits on an element and reads its size; drag its end to the element's corner -----------------------------

type MeasureS = { endX: number; selected: boolean; show: boolean }
const ELEMENT: Box = { x: 360, y: 260, w: 240, h: 140 }
const MEASURE_Y = 226
const END0 = 480
const END1 = ELEMENT.x + ELEMENT.w
const measureLabel = (endX: number) => `${(endX - ELEMENT.x).toFixed(2)} px`

export function MeasureNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: MeasureS = { endX: END0, selected: false, show: true }
  const poster: MeasureS = { endX: END1, selected: true, show: true }

  async function script(a: Act<MeasureS>) {
    await a.wait(700)
    a.mark('select')
    await a.move({ x: (ELEMENT.x + END0) / 2, y: MEASURE_Y })
    await a.click()
    await a.set({ selected: true })
    await a.wait(700)
    a.mark('stretch')
    const end: Point = { x: END0, y: MEASURE_Y }
    await a.move(end, { duration: 700 })
    await a.wait(300)
    await a.move({ x: END1, y: MEASURE_Y }, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ endX: p.x }) })
    await a.wait(2800)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ endX: END0 })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<MeasureS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <RectNode {...ELEMENT} />
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <MeasureNode x1={ELEMENT.x} y1={MEASURE_Y} x2={s.endX} y2={MEASURE_Y} label={measureLabel(s.endX)} />
            </g>
            <LineHandles x1={ELEMENT.x} y1={MEASURE_Y} x2={s.endX} y2={MEASURE_Y} show={s.selected} />
          </NodeLayer>
          <Toolbar />
        </WeaveCanvas>
      )}
    </Stage>
  )
}

// ---- Stroke single: a plain line; the start and the end each become a dot or an arrow ---------------------------------

type Tip = 'none' | 'dot' | 'arrow'
type TipS = { start: Tip; end: Tip; selected: boolean; hov: string | null; show: boolean; d: Point }
const LMOVE = { dx: 110, dy: 60 }
const LINE: { a: Point; b: Point } = { a: { x: 290, y: 370 }, b: { x: 670, y: 240 } }

function TipEnd({ at, angle, tip }: { at: Point; angle: number; tip: Tip }) {
  if (tip === 'dot') return <circle cx={at.x} cy={at.y} r={8} style={{ fill: 'var(--wv-ink)' }} />
  if (tip === 'arrow') {
    const wing = (d: number): string => `${at.x - 20 * Math.cos(angle + d)},${at.y - 20 * Math.sin(angle + d)}`
    return <polyline points={`${wing(0.45)} ${at.x},${at.y} ${wing(-0.45)}`} fill="none" style={{ stroke: 'var(--wv-ink)' }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  }
  return null
}

const TIPS: Tip[] = ['none', 'dot', 'arrow']

function Glyph({ tip, side }: { tip: Tip; side: 'start' | 'end' }) {
  const x = side === 'end' ? 24 : 4
  const dir = side === 'end' ? -1 : 1
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="8" x2="24" y2="8" />
      {tip === 'dot' && <circle cx={x} cy="8" r="2.6" fill="currentColor" />}
      {tip === 'arrow' && <polyline points={`${x + dir * 5},3 ${x},8 ${x + dir * 5},13`} />}
    </svg>
  )
}

export function StrokeSingleNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: TipS = { start: 'none', end: 'none', selected: false, hov: null, show: true, d: { x: 0, y: 0 } }
  const poster: TipS = { start: 'dot', end: 'arrow', selected: true, hov: null, show: true, d: { x: LMOVE.dx, y: LMOVE.dy } }
  const angle = Math.atan2(LINE.b.y - LINE.a.y, LINE.b.x - LINE.a.x)
  const mid: Point = { x: (LINE.a.x + LINE.b.x) / 2, y: (LINE.a.y + LINE.b.y) / 2 }

  async function script(a: Act<TipS>) {
    await a.wait(700)
    a.mark('select')
    await a.move(mid)
    await a.click()
    await a.set({ selected: true })
    await a.wait(800)
    a.mark('start')
    await a.move('start-dot', { duration: 900 })
    await a.set({ hov: 'start-dot' })
    await a.wait(300)
    await a.click({ at: 'start-dot' })
    await a.set({ start: 'dot', hov: null })
    await a.wait(900)
    a.mark('end')
    await a.move('end-arrow', { duration: 800 })
    await a.set({ hov: 'end-arrow' })
    await a.wait(300)
    await a.click({ at: 'end-arrow' })
    await a.set({ end: 'arrow', hov: null })
    await a.wait(900)
    a.mark('move')
    await a.move(mid, { duration: 900 })
    await a.wait(250)
    await a.drag({ x: mid.x + LMOVE.dx, y: mid.y + LMOVE.dy }, (p) => a.put({ d: { x: p.x - mid.x, y: p.y - mid.y } }), { duration: 1300 })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ start: 'none', end: 'none', d: { x: 0, y: 0 } })
    await a.set({ show: true })
    await a.wait(700)
  }

  const group = (side: 'start' | 'end', value: Tip, hov: string | null) => (
    <div className="wv-tips__group">
      <span className="wv-tips__label">{side === 'start' ? 'Start' : 'End'}</span>
      {TIPS.map((t) => (
        <span key={t} className="wv-tips__button" role="button" data-target={`${side}-${t}`} data-on={value === t || undefined} data-hover={hov === `${side}-${t}` || undefined}>
          <Glyph tip={t} side={side} />
        </span>
      ))}
    </div>
  )

  return (
    <Stage<TipS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => {
        const a0: Point = { x: LINE.a.x + s.d.x, y: LINE.a.y + s.d.y }
        const b0: Point = { x: LINE.b.x + s.d.x, y: LINE.b.y + s.d.y }
        return (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <line x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y} style={{ stroke: 'var(--wv-ink)' }} strokeWidth={2} strokeLinecap="round" />
              <TipEnd at={a0} angle={angle + Math.PI} tip={s.start} />
              <TipEnd at={b0} angle={angle} tip={s.end} />
            </g>
            <LineHandles x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y} show={s.selected} />
          </NodeLayer>
          <div className="wv-tips" data-show={s.selected || undefined} style={{ left: mid.x - 150 + s.d.x, top: 140 + s.d.y }}>
            {group('start', s.start, s.hov)}
            <span className="wv-tips__divider" />
            {group('end', s.end, s.hov)}
          </div>
          <Toolbar />
        </WeaveCanvas>
        )
      }}
    </Stage>
  )
}
