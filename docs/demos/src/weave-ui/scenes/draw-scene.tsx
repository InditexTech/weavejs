// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { EllipseNode, NodeLayer, NodeSelection, RectNode, StrokeNode } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'

const REST: Point = { x: 790, y: 440 }
const ghost = <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="110" />

// ---- Freehand tools (pen, brush): press, draw a path, release: the stroke is selected -------------------------------

type PenS = { tool: ToolId; hover: boolean; pts: Point[]; selected: boolean; show: boolean }
const FROM: Point = { x: 270, y: 300 }
const TO: Point = { x: 690, y: 270 }
// A gentle wave from FROM to TO, as a pointer path
const wave = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + Math.sin(t * Math.PI * 3) * 70 })

const bounds = (pts: Point[], pad = 10) => {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad }
}
const sample = (n: number): Point[] => Array.from({ length: n + 1 }, (_, i) => wave(i / n, FROM, TO))

export interface PenToolSceneProps extends DemoProps {
  tool: ToolId
  groups: ToolId[][]
  /** Stroke width of the line being drawn (brush strokes are thicker than pen strokes). */
  width: number
  name: string
}

export function PenToolScene({ theme, tool, groups, width, name }: PenToolSceneProps) {
  const info = TOOL_INFO[tool]
  const initial: PenS = { tool: 'move', hover: false, pts: [], selected: false, show: false }
  const poster: PenS = { tool: 'move', hover: false, pts: sample(60), selected: true, show: true }

  async function script(a: Act<PenS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move(`tool-${tool}`)
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: `tool-${tool}` })
    await a.set({ hover: false, tool })
    await a.wait(400)
    a.mark('draw')
    await a.move(FROM)
    await a.wait(250)
    await a.click()
    const pts: Point[] = [FROM]
    await a.move(TO, {
      duration: 2200,
      path: wave,
      onMove: (p) => {
        pts.push(p)
        a.put({ pts: pts.slice(), show: true })
      },
    })
    await a.set({ tool: 'move', selected: true })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.move(REST)
    await a.set({ pts: [] })
    await a.wait(700)
  }

  return (
    <Stage<PenS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === tool ? 'crosshair' : undefined}>
            <NodeLayer>
              {ghost}
              {s.pts.length > 1 && (
                <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                  <StrokeNode points={s.pts.map((p) => [p.x, p.y])} strokeWidth={width} />
                </g>
              )}
              {s.pts.length > 1 && <NodeSelection {...bounds(s.pts)} show={s.selected} />}
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? tool : undefined} groups={groups} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect(`tool-${tool}`)} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}

// ---- Eraser: drag across nodes, each one the pointer touches is removed ----------------------------------------------

type EraseS = { tool: ToolId; hover: boolean; gone: string[]; show: boolean }
const NODES = {
  rect: { x: 330, y: 160, w: 150, h: 90 },
  ellipse: { x: 540, y: 250, w: 160, h: 100 },
  squiggle: { x: 300, y: 380, w: 200, h: 70 },
}
const SQUIGGLE: Array<[number, number]> = [[300, 420], [340, 385], [380, 440], [420, 385], [460, 440], [500, 400]]
const E_FROM: Point = { x: 300, y: 140 }
const E_TO: Point = { x: 740, y: 340 }
// A zig-zag across the rectangle and the ellipse, leaving the squiggle alone
const sweep = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + Math.sin(t * Math.PI * 2) * 40 })
const hits = (p: Point, b: { x: number; y: number; w: number; h: number }, m = 6) => p.x >= b.x - m && p.x <= b.x + b.w + m && p.y >= b.y - m && p.y <= b.y + b.h + m

export function EraserToolScene({ theme, groups, name }: DemoProps & { groups: ToolId[][]; name: string }) {
  const info = TOOL_INFO.eraser
  const initial: EraseS = { tool: 'move', hover: false, gone: [], show: true }
  const poster: EraseS = { tool: 'move', hover: false, gone: ['rect', 'ellipse'], show: true }

  async function script(a: Act<EraseS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-eraser')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-eraser' })
    await a.set({ hover: false, tool: 'eraser' })
    await a.wait(400)
    a.mark('erase')
    await a.move(E_FROM)
    await a.wait(250)
    await a.click()
    const gone: string[] = []
    await a.move(E_TO, {
      duration: 2000,
      path: sweep,
      onMove: (p) => {
        let changed = false
        for (const [id, box] of Object.entries(NODES)) if (id !== 'squiggle' && !gone.includes(id) && hits(p, box)) { gone.push(id); changed = true }
        if (changed) a.put({ gone: gone.slice() })
      },
    })
    await a.set({ tool: 'move' })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ show: false })
    await a.wait(300)
    a.put({ gone: [] })
    await a.set({ show: true })
    await a.wait(700)
  }

  const fade = (id: string, s: EraseS) => ({ opacity: s.show && !s.gone.includes(id) ? 1 : 0, transition: 'opacity 0.25s ease' })

  return (
    <Stage<EraseS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === 'eraser' ? 'crosshair' : undefined}>
            <NodeLayer>
              {ghost}
              <g style={fade('rect', s)}>
                <RectNode {...NODES.rect} />
              </g>
              <g style={fade('ellipse', s)}>
                <EllipseNode {...NODES.ellipse} />
              </g>
              <g style={fade('squiggle', s)}>
                <StrokeNode points={SQUIGGLE} strokeWidth={3} />
              </g>
            </NodeLayer>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? 'eraser' : undefined} groups={groups} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-eraser')} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}
