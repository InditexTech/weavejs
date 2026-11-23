// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Download, Folder, Image as ImageIcon, ImageDown, Video as VideoIcon } from 'lucide-react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { EllipseNode, FrameNode, ImageNode, LineHandles, MeasureNode, NodeLayer, NodeSelection, RectNode, StickyNode, VideoNode, type Box } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'
import './os-parts.css'
import './node-edit-scenes.css'

const REST: Point = { x: 790, y: 470 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const stage = (theme: DemoProps['theme'], name: string) => ({ width: 960, height: 540, theme, tokens: weaveTokens(theme), className: `wv-scene ${name}` })
const box = (b: Box) => ({ x: b.x, y: b.y, w: b.w, h: b.h })

function Lights() {
  return (
    <span className="wv-os__lights">
      <i style={{ background: '#ff5f57' }} />
      <i style={{ background: '#febc2e' }} />
      <i style={{ background: '#28c840' }} />
    </span>
  )
}

function OsWindow({ show, title, width, height, children }: { show: boolean; title: string; width: number; height: number; children: ReactNode }) {
  return (
    <div className="wv-os" data-show={show || undefined} style={{ width, height }}>
      <div className="wv-os__bar">
        <Lights />
        <span className="wv-os__title">{title}</span>
      </div>
      <div className="wv-os__body">{children}</div>
    </div>
  )
}

// ---- Export tools: an app toolbar apart from the nodes exports a PNG; the user opens it on the OS and the image shows ----

type ExpS = { selected: boolean; hover: boolean; flash: boolean; saved: boolean; dlHover: boolean; open: boolean }
const EX_NODE: Box = { x: 330, y: 190, w: 260, h: 150 }
const EX_ELL: Box = { x: 650, y: 290, w: 150, h: 100 }

export function ExportScene({ theme, name, mode }: DemoProps & { name: string; mode: 'node' | 'stage' }) {
  const initial: ExpS = { selected: false, hover: false, flash: false, saved: false, dlHover: false, open: false }
  const poster: ExpS = { selected: false, hover: false, flash: false, saved: true, dlHover: false, open: true }
  const file = mode === 'node' ? 'rectangle.png' : 'weave-room.png'
  const label = mode === 'node' ? 'Export node' : 'Export stage'

  async function script(a: Act<ExpS>) {
    await a.wait(700)
    if (mode === 'node') {
      a.mark('select')
      await a.move({ x: EX_NODE.x + EX_NODE.w / 2, y: EX_NODE.y + EX_NODE.h / 2 })
      await a.click()
      await a.set({ selected: true })
      await a.wait(700)
    }
    a.mark('export')
    await a.move('export', { duration: 900 })
    await a.set({ hover: true })
    await a.wait(600)
    await a.click({ at: 'export' })
    await a.set({ hover: false, flash: true })
    await a.wait(120)
    await a.set({ flash: false, saved: true })
    await a.wait(1400)
    a.mark('open')
    await a.move('download', { duration: 900 })
    await a.set({ dlHover: true })
    await a.wait(500)
    await a.click({ at: 'download' })
    await a.set({ open: true, dlHover: false })
    await a.wait(3400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ open: false })
    await a.wait(300)
    await a.set({ saved: false, selected: false })
    await a.wait(800)
  }

  const exported = (
    <svg width={mode === 'node' ? 360 : 480} height={mode === 'node' ? 230 : 250} viewBox={mode === 'node' ? '310 170 300 190' : '310 170 510 250'} aria-hidden className="wv-os__page">
      <RectNode {...box(EX_NODE)} />
      {mode === 'stage' && <EllipseNode {...box(EX_ELL)} />}
    </svg>
  )

  return (
    <Stage<ExpS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <RectNode {...box(EX_NODE)} />
              <EllipseNode {...box(EX_ELL)} />
              <NodeSelection {...box(EX_NODE)} show={s.selected} />
            </NodeLayer>
            <div className="wv-appbar">
              <span className="wv-appbar__button" data-hover={s.hover || undefined} data-target="export">
                <ImageDown size={18} strokeWidth={1.25} />
                {label}
              </span>
            </div>
            <div className="wv-flash" data-show={s.flash || undefined} />
            <div className="wv-download" data-show={s.saved || undefined} data-hover={s.dlHover || undefined} data-target="download">
              <Download size={16} strokeWidth={1.5} />
              {file}
            </div>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" />
            </div>
            <OsWindow show={s.open} title={file} width={560} height={330}>
              {exported}
            </OsWindow>
          </WeaveCanvas>
        </>
      )}
    </Stage>
  )
}

// ---- Frame tool: a click creates a frame of a predefined size at that spot -------------------------------------------

type FrS = { tool: ToolId; hover: boolean; frame: boolean; selected: boolean; show: boolean }
const FR_AT: Point = { x: 340, y: 160 }
const FR_SIZE = { w: 340, h: 220 }

export function FrameToolScene({ theme, name }: DemoProps & { name: string }) {
  const info = TOOL_INFO.frame
  const initial: FrS = { tool: 'move', hover: false, frame: false, selected: false, show: true }
  const poster: FrS = { tool: 'move', hover: false, frame: true, selected: true, show: true }

  async function script(a: Act<FrS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-frame')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-frame' })
    await a.set({ hover: false, tool: 'frame' })
    await a.wait(400)
    a.mark('click')
    await a.move(FR_AT, { duration: 1200 })
    await a.wait(500)
    await a.click()
    await a.set({ frame: true, tool: 'move', selected: true })
    await a.wait(2800)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    await a.move(REST)
    await a.set({ frame: false })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<FrS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === 'frame' ? 'crosshair' : undefined}>
            <NodeLayer>
              <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
              <rect className="wv-scene__ghost" x="96.5" y="400.5" width="210" height="100" />
              {s.frame && (
                <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                  <FrameNode x={FR_AT.x} y={FR_AT.y} w={FR_SIZE.w} h={FR_SIZE.h} title="Frame 1" />
                </g>
              )}
              {s.frame && <NodeSelection x={FR_AT.x} y={FR_AT.y} w={FR_SIZE.w} h={FR_SIZE.h} show={s.selected} />}
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? 'frame' : undefined} groups={[['move', 'hand'], ['rectangle', 'frame', 'sticky'], ['undo', 'redo']]} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-frame')} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}

// ---- Image and images tools: choose the files in the OS file picker, then click where they go -----------------------

const FILES = ['sunset.jpg', 'forest.png', 'city.jpg', 'lake.png', 'desert.jpg', 'coast.png']
const VIDEOS = ['intro.mp4', 'demo.mov', 'tour.mp4', 'promo.mp4', 'loop.mov', 'clip.mp4']
const PLACE: Point = { x: 480, y: 290 }
const ONE = { w: 300, h: 200 }
const VID = { w: 340, h: 210 }
const CARD = { w: 190, h: 130 }
const TILE = { w: 180, h: 120, gap: 16 }

type PlS = { tool: ToolId; hover: boolean; picker: boolean; sel: number[]; hopen: boolean; preview: boolean; at: Point; placed: boolean; spread: boolean; selected: boolean; show: boolean }

export function ImageToolScene({ theme, name, multi, media = 'image' }: DemoProps & { name: string; multi: boolean; media?: 'image' | 'video' }) {
  const video = media === 'video'
  const files = video ? VIDEOS : FILES
  const tool: ToolId = video ? 'video' : multi ? 'images' : 'image'
  const info = TOOL_INFO[tool]
  const picks = multi ? [0, 2, 4] : [1]
  const initial: PlS = { tool: 'move', hover: false, picker: false, sel: [], hopen: false, preview: false, at: { x: 640, y: 300 }, placed: false, spread: false, selected: false, show: true }
  const poster: PlS = { ...initial, placed: true, spread: true, selected: true }

  async function script(a: Act<PlS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move(`tool-${tool}`)
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: `tool-${tool}` })
    await a.set({ hover: false, tool })
    await a.wait(500)
    a.mark('file-picker')
    await a.set({ picker: true })
    await a.wait(900)
    for (let i = 0; i < picks.length; i++) {
      await a.move(`pick-${picks[i]}`, { duration: 800 })
      await a.wait(250)
      if (i > 0) await a.key('cmd')
      await a.click({ at: `pick-${picks[i]}` })
      await a.set({ sel: picks.slice(0, i + 1) })
      await a.wait(500)
    }
    await a.move('pick-open', { duration: 800 })
    await a.set({ hopen: true })
    await a.wait(400)
    await a.click({ at: 'pick-open' })
    await a.set({ picker: false, hopen: false, preview: true })
    await a.wait(500)
    a.mark('place')
    await a.move(PLACE, { duration: 1300, path: STRAIGHT, onMove: (p) => a.put({ at: p }) })
    await a.wait(700)
    await a.click()
    await a.set({ preview: false, placed: true, tool: 'move', selected: true })
    await a.wait(2800)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    await a.move(REST)
    await a.set({ placed: false })
    await a.set({ show: true })
    await a.wait(700)
  }

  const row = (i: number): Box => ({ x: PLACE.x - (3 * TILE.w + 2 * TILE.gap) / 2 + i * (TILE.w + TILE.gap), y: PLACE.y - TILE.h / 2, w: TILE.w, h: TILE.h })
  const stack = (i: number): Box => ({ x: PLACE.x - CARD.w / 2 + (i - 1) * 12, y: PLACE.y - CARD.h / 2 + (i - 1) * 12, w: CARD.w, h: CARD.h })
  const sz = video ? VID : ONE
  const one: Box = { x: PLACE.x - sz.w / 2, y: PLACE.y - sz.h / 2, w: sz.w, h: sz.h }

  return (
    <Stage<PlS> {...stage(theme, name)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s, rect) => {
        const pv = (i: number): Box => {
          const b = stack(i)
          return { ...b, x: b.x - PLACE.x + s.at.x, y: b.y - PLACE.y + s.at.y }
        }
        return (
          <>
            <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
              <NodeLayer>
                <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
                <rect className="wv-scene__ghost" x="96.5" y="400.5" width="210" height="100" />
                <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                  {s.preview &&
                    (multi ? (
                      [0, 1, 2].map((i) => <rect key={i} className="wv-card-stack" {...{ x: pv(i).x, y: pv(i).y, width: pv(i).w, height: pv(i).h }} />)
                    ) : (
                      <rect className="wv-preview" x={s.at.x - sz.w / 2} y={s.at.y - sz.h / 2} width={sz.w} height={sz.h} />
                    ))}
                  {s.placed &&
                    (multi ? (
                      [0, 1, 2].map((i) => {
                        return <ImageNode key={i} {...row(i)} />
                      })
                    ) : (
                      video ? <VideoNode {...one} /> : <ImageNode {...one} />
                    ))}
                </g>
                {s.placed && (multi ? <NodeSelection x={row(0).x} y={row(0).y} w={row(2).x + TILE.w - row(0).x} h={TILE.h} show={s.selected} /> : <NodeSelection {...one} show={s.selected} />)}
              </NodeLayer>
              <div className="wv-scene__toolbar">
                <WeaveToolbar active={s.tool} hovered={s.hover ? tool : undefined} groups={[['move', 'hand'], ['rectangle', 'image', 'images', 'video'], ['undo', 'redo']]} />
              </div>
              <div className="wv-os" data-show={s.picker || undefined} style={{ width: 520, height: 380 }}>
                <div className="wv-picker__head">
                  <span className="wv-picker__title">Open</span>
                  <span className="wv-picker__loc">
                    <Folder size={14} strokeWidth={1.5} />
                    Downloads
                  </span>
                </div>
                <div className="wv-picker__list">
                  {files.map((f, i) => (
                    <span key={f} className="wv-picker__row" data-sel={s.sel.includes(i) || undefined} data-target={`pick-${i}`}>
                      {video ? <VideoIcon size={18} strokeWidth={1.25} /> : <ImageIcon size={18} strokeWidth={1.25} />}
                      <span className="wv-picker__name">{f}</span>
                      <span className="wv-picker__meta">{video ? `${12 + i * 7} MB` : `${1 + i}.${i + 2} MB`}</span>
                    </span>
                  ))}
                </div>
                <div className="wv-picker__foot">
                  <span className="wv-picker__btn">Cancel</span>
                  <span className="wv-picker__btn" data-primary data-disabled={s.sel.length === 0 || undefined} data-hover={s.hopen || undefined} data-target="pick-open">
                    Open
                  </span>
                </div>
              </div>
            </WeaveCanvas>
            <WeaveTooltip show={s.hover} at={rect(`tool-${tool}`)} shortcut={info.key}>
              {info.label}
            </WeaveTooltip>
          </>
        )
      }}
    </Stage>
  )
}

// ---- Measure tool: measure the width and the height of a rectangle that is already on the canvas ----------------------

type Seg = { a: Point; b: Point; ox: number; oy: number }
type MeS = { tool: ToolId; hover: boolean; w: Seg | null; h: Seg | null; sel: 'w' | 'h' | null }
const ME: Box = { x: 340, y: 240, w: 260, h: 150 }
const TL: Point = { x: ME.x, y: ME.y }
const TR: Point = { x: ME.x + ME.w, y: ME.y }
const BR: Point = { x: ME.x + ME.w, y: ME.y + ME.h }
const GAP = 36
const len = (s: Seg) => `${Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y).toFixed(2)} px`
const shifted = (s: Seg) => ({ x1: s.a.x + s.ox, y1: s.a.y + s.oy, x2: s.b.x + s.ox, y2: s.b.y + s.oy })

export function MeasureToolScene({ theme, name }: DemoProps & { name: string }) {
  const info = TOOL_INFO.measure
  const initial: MeS = { tool: 'move', hover: false, w: null, h: null, sel: null }
  const poster: MeS = { tool: 'move', hover: false, w: { a: TL, b: TR, ox: 0, oy: -GAP }, h: { a: TR, b: BR, ox: GAP, oy: 0 }, sel: null }
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  async function script(a: Act<MeS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-measure')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-measure' })
    await a.set({ hover: false, tool: 'measure' })
    await a.wait(400)
    a.mark('width')
    await a.move(TL, { duration: 1000 })
    await a.wait(250)
    await a.click()
    await a.move(TR, { duration: 1300, path: STRAIGHT, onMove: (p) => a.put({ w: { a: TL, b: p, ox: 0, oy: 0 } }) })
    await a.wait(250)
    await a.click()
    await a.set({ tool: 'move', sel: 'w' })
    await a.wait(700)
    a.mark('separate')
    const m1 = mid(TL, TR)
    await a.move(m1, { duration: 700 })
    await a.wait(250)
    await a.move({ x: m1.x, y: m1.y - GAP }, { duration: 900, path: STRAIGHT, onMove: (p) => a.put({ w: { a: TL, b: TR, ox: 0, oy: p.y - m1.y } }) })
    await a.set({ sel: null })
    await a.wait(700)
    a.mark('height')
    await a.move('tool-measure', { duration: 900 })
    await a.click({ at: 'tool-measure' })
    await a.set({ tool: 'measure' })
    await a.wait(300)
    await a.move(TR, { duration: 1000 })
    await a.wait(250)
    await a.click()
    await a.move(BR, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ h: { a: TR, b: p, ox: 0, oy: 0 } }) })
    await a.wait(250)
    await a.click()
    await a.set({ tool: 'move', sel: 'h' })
    await a.wait(700)
    const m2 = mid(TR, BR)
    await a.move(m2, { duration: 700 })
    await a.wait(250)
    await a.move({ x: m2.x + GAP, y: m2.y }, { duration: 900, path: STRAIGHT, onMove: (p) => a.put({ h: { a: TR, b: BR, ox: p.x - m2.x, oy: 0 } }) })
    await a.set({ sel: null })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ w: null, h: null })
    await a.wait(800)
  }

  return (
    <Stage<MeS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === 'measure' ? 'crosshair' : undefined}>
            <NodeLayer>
              <RectNode {...box(ME)} />
              {[s.w, s.h].map((m, k) =>
                m && (m.ox !== 0 || m.oy !== 0) ? (
                  <g key={k} stroke="#FF3366" strokeWidth={1}>
                    <line x1={m.a.x} y1={m.a.y} x2={m.a.x + m.ox} y2={m.a.y + m.oy} />
                    <line x1={m.b.x} y1={m.b.y} x2={m.b.x + m.ox} y2={m.b.y + m.oy} />
                  </g>
                ) : null,
              )}
              {s.w && <MeasureNode {...shifted(s.w)} label={len(s.w)} />}
              {s.h && <MeasureNode {...shifted(s.h)} label={len(s.h)} side="right" />}
              {s.sel === 'w' && s.w && <LineHandles {...shifted(s.w)} />}
              {s.sel === 'h' && s.h && <LineHandles {...shifted(s.h)} />}
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? 'measure' : undefined} groups={[['move', 'hand'], ['rectangle', 'line', 'measure'], ['undo', 'redo']]} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-measure')} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}

// ---- Sticky note tool: draw the note, then type its text ----------------------------------------------------------------

type StS = { tool: ToolId; hover: boolean; box: Box | null; editing: boolean; text: string; selected: boolean; show: boolean }
const ST_FINAL: Box = { x: 340, y: 170, w: 260, h: 220 }
const ST_TEXT = 'Ship it'

export function StickyToolScene({ theme, name }: DemoProps & { name: string }) {
  const info = TOOL_INFO.sticky
  const initial: StS = { tool: 'move', hover: false, box: null, editing: false, text: '', selected: false, show: true }
  const poster: StS = { tool: 'move', hover: false, box: ST_FINAL, editing: false, text: ST_TEXT, selected: true, show: true }
  const A: Point = { x: ST_FINAL.x, y: ST_FINAL.y }
  const B: Point = { x: ST_FINAL.x + ST_FINAL.w, y: ST_FINAL.y + ST_FINAL.h }

  async function script(a: Act<StS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-sticky')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-sticky' })
    await a.set({ hover: false, tool: 'sticky' })
    await a.wait(400)
    a.mark('draw')
    await a.move(A, { duration: 1000 })
    await a.wait(250)
    await a.click()
    await a.move(B, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ box: { x: A.x, y: A.y, w: p.x - A.x, h: p.y - A.y } }) })
    await a.set({ tool: 'move', editing: true })
    await a.wait(900)
    a.mark('type')
    await a.type('text', ST_TEXT, { interval: 110 })
    await a.wait(700)
    await a.set({ editing: false, selected: true })
    await a.wait(2400)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    await a.move(REST)
    await a.set({ box: null, text: '' })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<StS> {...stage(theme, name)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === 'sticky' ? 'crosshair' : undefined}>
            <NodeLayer>
              <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
              <rect className="wv-scene__ghost" x="96.5" y="400.5" width="210" height="100" />
              {s.box && (
                <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                  <StickyNode {...s.box} />
                </g>
              )}
              {s.box && <rect className="wv-note-edit" data-show={s.editing || undefined} x={s.box.x} y={s.box.y} width={s.box.w} height={s.box.h} />}
              {s.box && <NodeSelection {...s.box} show={s.selected} />}
            </NodeLayer>
            <div className="wv-note-text" data-editing={s.editing || undefined} style={{ left: (s.box?.x ?? ST_FINAL.x) + 14, top: (s.box?.y ?? ST_FINAL.y) + 14, opacity: s.box && s.show ? 1 : 0 }}>
              <span className="wv-note-text__typed">{s.text}</span>
              <span className="wv-note-text__hint" data-show={(s.editing && !s.text) || undefined}>
                Type your note
              </span>
            </div>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? 'sticky' : undefined} groups={[['move', 'hand'], ['rectangle', 'frame', 'sticky'], ['undo', 'redo']]} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-sticky')} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}
