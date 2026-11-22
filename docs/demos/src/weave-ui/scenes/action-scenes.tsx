// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { AlignCenterVertical, AlignEndVertical, AlignStartVertical, Download, ImageDown } from 'lucide-react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { NodeLayer, NodeSelection, RectNode, EllipseNode, type Box } from '../nodes/nodes'
import { WeaveToolbar, WeaveTooltip } from '../toolbar'
import './scenes.css'
import './media-scene.css'
import './action-scenes.css'

const REST: Point = { x: 790, y: 460 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
const box = (b: Box) => ({ x: b.x, y: b.y, w: b.w, h: b.h })

// ---- Selection tool: click selects, shift-click adds, a click on empty canvas clears, a marquee selects what it covers ----

type SelS = { sel: string[]; marquee: Box | null }
const N: Record<string, Box> = { a: { x: 250, y: 170, w: 130, h: 90 }, b: { x: 440, y: 170, w: 130, h: 90 }, c: { x: 250, y: 330, w: 130, h: 90 }, d: { x: 440, y: 330, w: 130, h: 90 } }
const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

export function SelectionToolScene({ theme, name }: DemoProps & { name: string }) {
  const initial: SelS = { sel: [], marquee: null }
  const poster: SelS = { sel: ['c', 'd'], marquee: null }

  async function script(a: Act<SelS>) {
    await a.wait(700)
    a.mark('click')
    await a.move(center(N.a))
    await a.click()
    await a.set({ sel: ['a'] })
    await a.wait(900)
    a.mark('shift')
    await a.move(center(N.b))
    await a.key('Shift')
    await a.click()
    await a.set({ sel: ['a', 'b'] })
    await a.wait(1100)
    a.mark('clear')
    await a.move({ x: 700, y: 400 })
    await a.click()
    await a.set({ sel: [] })
    await a.wait(700)
    a.mark('marquee')
    const s0: Point = { x: 210, y: 300 }
    const s1: Point = { x: 610, y: 450 }
    await a.move(s0)
    await a.wait(250)
    await a.click()
    await a.move(s1, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ marquee: { x: s0.x, y: s0.y, w: p.x - s0.x, h: p.y - s0.y } }) })
    await a.set({ marquee: null, sel: ['c', 'd'] })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ sel: [] })
    await a.wait(700)
  }

  return (
    <Stage<SelS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            {Object.entries(N).map(([id, b]) => (
              <g key={id}>
                <RectNode {...box(b)} />
                <NodeSelection {...box(b)} show={s.sel.includes(id)} />
              </g>
            ))}
            {s.marquee && <rect className="wv-frame__marquee" x={s.marquee.x} y={s.marquee.y} width={Math.max(0, s.marquee.w)} height={Math.max(0, s.marquee.h)} />}
          </NodeLayer>
          <div className="wv-scene__toolbar">
            <WeaveToolbar active="move" />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}

/** A selection box whose geometry eases (CSS x, y, width, height), for a selection that follows nodes sliding together. */
export function EasedSelection({ x, y, w, h, show }: Box & { show: boolean }) {
  const ease = 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
  const pill = (cx: number, cy: number, pw: number, ph: number, key: string) => <rect key={key} className="wv-selection__anchor" rx={3} width={pw} height={ph} style={{ x: cx - pw / 2, y: cy - ph / 2, transition: ease }} />
  return (
    <g className="wv-node-selection" data-show={show || undefined}>
      <rect className="wv-selection__box" style={{ x, y, width: w, height: h, transition: ease }} />
      {pill(x + w / 2, y, 18, 6, 'n')}
      {pill(x + w / 2, y + h, 18, 6, 's')}
      {pill(x, y + h / 2, 6, 18, 'w')}
      {pill(x + w, y + h / 2, 6, 18, 'e')}
      {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} className="wv-selection__anchor" r={4.5} style={{ cx, cy, transition: ease }} />
      ))}
    </g>
  )
}

// ---- Align nodes tool: select three nodes, align them to the left edge of the selection --------------------------------

type AlignS = { x: [number, number, number]; marquee: Box | null; picked: boolean; hover: boolean }
const R = [
  { y: 170, w: 130, h: 90, x0: 270 },
  { y: 290, w: 130, h: 90, x0: 430 },
  { y: 410, w: 130, h: 90, x0: 350 },
]

export function AlignNodesToolScene({ theme, name }: DemoProps & { name: string }) {
  const initial: AlignS = { x: [R[0].x0, R[1].x0, R[2].x0], marquee: null, picked: false, hover: false }
  const poster: AlignS = { x: [270, 270, 270], marquee: null, picked: true, hover: false }

  async function script(a: Act<AlignS>) {
    await a.wait(700)
    a.mark('select')
    const s0: Point = { x: 220, y: 140 }
    const s1: Point = { x: 620, y: 520 }
    await a.move(s0)
    await a.wait(250)
    await a.click()
    await a.move(s1, { duration: 1200, path: STRAIGHT, onMove: (p) => a.put({ marquee: { x: s0.x, y: s0.y, w: p.x - s0.x, h: p.y - s0.y } }) })
    await a.set({ marquee: null, picked: true })
    await a.wait(700)
    a.mark('align')
    await a.move('align-left')
    await a.set({ hover: true })
    await a.wait(500)
    await a.click({ at: 'align-left' })
    await a.set({ x: [270, 270, 270], hover: false })
    await a.wait(2600)
    a.mark('reset')
    await a.move(REST)
    await a.set({ picked: false })
    await a.set({ x: [R[0].x0, R[1].x0, R[2].x0] })
    await a.wait(700)
  }

  const bounds = (x: number[]) => {
    const left = Math.min(...x)
    const right = Math.max(...x.map((v) => v + 130))
    return { x: left, y: 170, w: right - left, h: 410 - 170 + 90 }
  }

  return (
    <Stage<AlignS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        const b = bounds(s.x)
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              {R.map((r, i) => (
                <g key={i} className="wv-slide" style={{ transform: `translate(${s.x[i] - r.x0}px, 0)` }}>
                  <RectNode x={r.x0} y={r.y} w={r.w} h={r.h} />
                </g>
              ))}
              {s.marquee && <rect className="wv-frame__marquee" x={s.marquee.x} y={s.marquee.y} width={Math.max(0, s.marquee.w)} height={Math.max(0, s.marquee.h)} />}
              <EasedSelection {...b} show={s.picked} />
            </NodeLayer>
            <div className="wv-node-bar" data-show={s.picked || undefined} style={{ left: 270 + (b.x - 270) + 20, top: 120 }}>
              <span className="wv-node-bar__button" data-hover={s.hover || undefined} data-target="align-left">
                <AlignStartVertical size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-node-bar__button">
                <AlignCenterVertical size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-node-bar__button">
                <AlignEndVertical size={16} strokeWidth={1.5} />
              </span>
            </div>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" />
            </div>
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Export: a node (from its bar) or the whole stage (from the export button) is downloaded as an image ---------------

type ExpS = { selected: boolean; hover: boolean; flash: boolean; toast: boolean }
const EXPORT_NODE: Box = { x: 340, y: 190, w: 260, h: 150 }

export function ExportScene({ theme, name, mode }: DemoProps & { name: string; mode: 'node' | 'stage' }) {
  const initial: ExpS = { selected: false, hover: false, flash: false, toast: false }
  const poster: ExpS = { selected: mode === 'node', hover: false, flash: false, toast: true }
  const file = mode === 'node' ? 'rectangle.png' : 'weave-room.png'

  async function script(a: Act<ExpS>) {
    await a.wait(700)
    if (mode === 'node') {
      a.mark('select')
      await a.move(center(EXPORT_NODE))
      await a.click()
      await a.set({ selected: true })
      await a.wait(700)
    }
    a.mark('export')
    await a.move('export')
    await a.set({ hover: true })
    await a.wait(700)
    await a.click({ at: 'export' })
    await a.set({ flash: true, hover: false })
    await a.wait(120)
    await a.set({ flash: false, toast: true })
    await a.wait(3000)
    a.mark('reset')
    await a.move(REST)
    await a.set({ toast: false, selected: false })
    await a.wait(700)
  }

  return (
    <Stage<ExpS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <RectNode {...box(EXPORT_NODE)} />
              <EllipseNode x={680} y={300} w={150} h={100} />
              <NodeSelection {...box(EXPORT_NODE)} show={s.selected} />
            </NodeLayer>
            {mode === 'node' ? (
              <div className="wv-node-bar" data-show={s.selected || undefined} style={{ left: EXPORT_NODE.x + EXPORT_NODE.w / 2 - 20, top: EXPORT_NODE.y - 52 }}>
                <span className="wv-node-bar__button" data-hover={s.hover || undefined} data-target="export">
                  <ImageDown size={16} strokeWidth={1.5} />
                </span>
              </div>
            ) : (
              <div className="wv-card wv-export" style={{ width: 48, justifyContent: 'center', padding: 0 }}>
                <span className="wv-node-bar__button" data-hover={s.hover || undefined} data-target="export">
                  <ImageDown size={18} strokeWidth={1.25} />
                </span>
              </div>
            )}
            <div className="wv-flash" data-show={s.flash || undefined} />
            <div className="wv-toast" data-show={s.toast || undefined}>
              <Download size={16} strokeWidth={1.5} />
              {file}
            </div>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" />
            </div>
          </WeaveCanvas>
          {mode === 'stage' && (
            <WeaveTooltip show={s.hover} at={rect('export')}>
              Export page as image
            </WeaveTooltip>
          )}
        </>
      )}
    </Stage>
  )
}
