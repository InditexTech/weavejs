// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties } from 'react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { EllipseNode, NodeLayer, NodeSelection, RectNode, StarNode, StickyNode } from '../nodes/nodes'
import { ZoomBar } from '../overlays/overlays'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'
import './viewport-scene.css'

// A canvas you can zoom and pan: the nodes live in world coordinates and a camera (zoom, offset) maps them
// to the stage, with the grid following. Variants: pan with the move tool, zoom in, zoom out, fit to screen,
// fit to selection. The zoom bar is the showcase's (Zoom in, Zoom out, Fit to screen, Fit to selection).

export type ViewportKind = 'pan' | 'zoom-in' | 'zoom-out' | 'fit-screen' | 'fit-selection'
type Cam = { z: number; tx: number; ty: number }
type Target = 'zoom-in' | 'zoom-out' | 'zoom-fit' | 'zoom-selection'
type S = Cam & { tool: ToolId; hover: boolean; bar: Target | null; selected: boolean; animate: boolean; show: boolean }

const REST: Point = { x: 790, y: 470 }
const CX = 520
const CY = 270
/** World point (wx, wy) shown at the middle of the canvas at zoom z. */
const cam = (z: number, wx: number, wy: number): Cam => ({ z, tx: CX - wx * z, ty: CY - wy * z })
const WORLD = { x: 465, y: 290 }
const NOTE = { x: 340, y: 340, w: 150, h: 120 }
const TIPS: Record<Target, { label: string; key: string }> = {
  'zoom-in': { label: 'Zoom in', key: '⇧ ↓' },
  'zoom-out': { label: 'Zoom out', key: '⇧ ↑' },
  'zoom-fit': { label: 'Fit to screen', key: '⇧ 1' },
  'zoom-selection': { label: 'Fit to selection', key: '⇧ 2' },
}
const pct = (z: number) => `${Math.round(z * 100)}%`

const START: Record<ViewportKind, Cam> = {
  pan: cam(1, WORLD.x, WORLD.y),
  'zoom-in': cam(0.5, WORLD.x, WORLD.y),
  'zoom-out': cam(1, WORLD.x, WORLD.y),
  'fit-screen': cam(1.6, 300, 210),
  'fit-selection': cam(0.6, WORLD.x, WORLD.y),
}
const END: Record<ViewportKind, Cam> = {
  pan: { z: 1, tx: START.pan.tx - 130, ty: START.pan.ty + 80 },
  'zoom-in': cam(1, WORLD.x, WORLD.y),
  'zoom-out': cam(0.5, WORLD.x, WORLD.y),
  'fit-screen': cam(1.25, WORLD.x, WORLD.y),
  'fit-selection': cam(2.1, NOTE.x + NOTE.w / 2, NOTE.y + NOTE.h / 2),
}

export interface ViewportSceneProps extends DemoProps {
  kind: ViewportKind
  name: string
}

export function ViewportScene({ theme, kind, name }: ViewportSceneProps) {
  const initial: S = { ...START[kind], tool: 'move', hover: false, bar: null, selected: false, animate: true, show: true }
  const poster: S = { ...END[kind], tool: kind === 'pan' ? 'hand' : 'move', hover: false, bar: null, selected: kind === 'fit-selection', animate: true, show: true }
  const barTarget: Target | null = kind === 'zoom-in' ? 'zoom-in' : kind === 'zoom-out' ? 'zoom-out' : kind === 'fit-screen' ? 'zoom-fit' : kind === 'fit-selection' ? 'zoom-selection' : null
  const mid = (c: Cam, z: number): Cam => cam(z, (CX - c.tx) / c.z, (CY - c.ty) / c.z)

  async function script(a: Act<S>) {
    await a.wait(700)
    if (kind === 'pan') {
      a.mark('pick')
      await a.move('tool-hand')
      await a.set({ hover: true })
      await a.wait(900)
      await a.click({ at: 'tool-hand' })
      await a.set({ hover: false, tool: 'hand' })
      await a.wait(400)
      a.mark('pan')
      const from: Point = { x: 520, y: 300 }
      await a.move(from)
      await a.wait(250)
      await a.drag({ x: from.x - 130, y: from.y + 80 }, (p) => a.put({ tx: START.pan.tx + (p.x - from.x), ty: START.pan.ty + (p.y - from.y), animate: false }), { duration: 1400 })
      await a.set({ tool: 'move', animate: true })
      await a.wait(2400)
    } else {
      if (kind === 'fit-selection') {
        a.mark('select')
        await a.move({ x: 520, y: 340 })
        await a.click()
        await a.set({ selected: true })
        await a.wait(600)
      }
      a.mark('zoom')
      const target = barTarget as Target
      await a.move(target)
      await a.set({ bar: target })
      await a.wait(900)
      await a.set({ bar: null })
      await a.click({ at: target })
      if (kind === 'zoom-in' || kind === 'zoom-out') {
        const mid1 = mid(START[kind], (START[kind].z + END[kind].z) / 2)
        await a.set({ ...mid1 })
        await a.wait(900)
        await a.click({ at: target })
      }
      await a.set({ ...END[kind] })
      await a.wait(2800)
    }
    a.mark('reset')
    await a.move(REST)
    await a.set({ show: false, selected: false })
    await a.wait(300)
    a.put({ ...START[kind], animate: false })
    await a.set({ show: true })
    await a.wait(100)
    a.put({ animate: true })
    await a.wait(600)
  }

  const t = barTarget ? TIPS[barTarget] : TOOL_INFO.hand
  const tipAt = (rect: (n: string) => { x: number; y: number; width: number; height: number }, _s: S) => (kind === 'pan' ? rect('tool-hand') : rect(barTarget as string))

  return (
    <Stage<S> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene wv-viewport ${name}`}>
      {(s, rect) => {
        const ease = s.animate ? '0.7s cubic-bezier(0.4, 0, 0.2, 1)' : '0s'
        const grid: CSSProperties = {
          backgroundSize: `${160 * s.z}px ${160 * s.z}px, ${160 * s.z}px ${160 * s.z}px, ${20 * s.z}px ${20 * s.z}px, ${20 * s.z}px ${20 * s.z}px`,
          backgroundPosition: `${s.tx}px ${s.ty}px`,
          transition: `background-size ${ease}, background-position ${ease}`,
        }
        return (
          <>
            <WeaveCanvas className="wv-scene__canvas" data-target="canvas" style={{ position: 'absolute', inset: 0, ...grid }} data-cursor={s.tool === 'hand' ? 'open' : undefined}>
              <NodeLayer>
                <g className="wv-viewport__world" style={{ transform: `translate(${s.tx}px, ${s.ty}px) scale(${s.z})`, transition: `transform ${ease}, opacity 0.3s ease`, opacity: s.show ? 1 : 0 }}>
                  <RectNode x={200} y={150} w={200} h={120} />
                  <EllipseNode x={480} y={120} w={170} h={110} />
                  <StickyNode {...NOTE} text="Idea" />
                  <StarNode x={600} y={330} w={130} h={120} tips={5} inner={0.4} />
                  <NodeSelection {...NOTE} show={s.selected} />
                </g>
              </NodeLayer>
              <div className="wv-scene__toolbar">
                <WeaveToolbar active={s.tool} groups={[['move'], ['hand', 'rectangle', 'ellipse', 'star'], ['undo', 'redo']]} />
              </div>
              <ZoomBar className="wv-viewport__zoom" zoom={pct(s.z)} hovered={s.bar} />
            </WeaveCanvas>
            <WeaveTooltip show={kind === 'pan' ? s.hover : s.bar !== null} at={tipAt(rect, s)} shortcut={'key' in t ? (t.key as string) : undefined}>
              {t.label}
            </WeaveTooltip>
          </>
        )
      }}
    </Stage>
  )
}
