// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { FlipHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { ImageNode, NodeLayer, NodeSelection, VideoNode, type Box } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'
import './media-scene.css'

const REST: Point = { x: 790, y: 440 }
const STRAIGHT = (t: number, from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

const ghosts = (
  <>
    <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
    <rect className="wv-scene__ghost" x="96.5" y="400.5" width="210" height="100" />
  </>
)

// ---- Placing media: pick the tool, a preview follows the pointer, click to place -------------------------------

type PlaceS = { tool: ToolId; hover: boolean; at: Point; preview: boolean; placed: boolean; selected: boolean }
const CLICK: Point = { x: 480, y: 280 }

export interface PlaceToolSceneProps extends DemoProps {
  tool: ToolId
  groups: ToolId[][]
  /** The node(s) placed, as boxes around the click point; each is drawn with `render`. */
  boxes: (center: Point) => Box[]
  render: (box: Box) => ReactNode
  name: string
}

export function PlaceToolScene({ theme, tool, groups, boxes, render, name }: PlaceToolSceneProps) {
  const info = TOOL_INFO[tool]
  const initial: PlaceS = { tool: 'move', hover: false, at: { x: 640, y: 380 }, preview: false, placed: false, selected: false }
  const poster: PlaceS = { tool: 'move', hover: false, at: CLICK, preview: false, placed: true, selected: true }

  async function script(a: Act<PlaceS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move(`tool-${tool}`)
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: `tool-${tool}` })
    // The preview starts under the pointer (while still invisible) and fades in there, then rides it
    const t = a.rect(`tool-${tool}`)
    a.put({ at: { x: t.x + t.width / 2, y: t.y + t.height / 2 } })
    await a.set({ hover: false, tool, preview: true })
    await a.wait(400)
    a.mark('position')
    // The preview rides the pointer until it is placed
    await a.move(CLICK, { duration: 1400, path: STRAIGHT, onMove: (p) => a.put({ at: p }) })
    await a.wait(500)
    a.mark('place')
    await a.click()
    await a.set({ preview: false, placed: true, tool: 'move', selected: true, at: CLICK })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ placed: false })
    await a.move(REST)
    await a.wait(700)
  }

  return (
    <Stage<PlaceS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => {
        const placed = boxes(CLICK)
        const preview = boxes(s.at)
        return (
          <>
            <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
              <NodeLayer>
                {ghosts}
                <g style={{ opacity: s.preview ? 0.45 : 0, transition: 'opacity 0.2s ease' }}>{preview.map((b, i) => <g key={i}>{render(b)}</g>)}</g>
                <g style={{ opacity: s.placed ? 1 : 0, transition: 'opacity 0.25s ease' }}>
                  {placed.map((b, i) => (
                    <g key={i}>
                      {render(b)}
                      <NodeSelection {...b} show={s.selected} />
                    </g>
                  ))}
                </g>
              </NodeLayer>
              <div className="wv-scene__toolbar">
                <WeaveToolbar active={s.tool} hovered={s.hover ? tool : undefined} groups={groups} />
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

// ---- Image node: select, crop from an edge, flip horizontally ----------------------------------------------------

type ImgS = { crop: number; cropping: boolean; selected: boolean; flipped: boolean; show: boolean }
const IMG: Box = { x: 300, y: 170, w: 360, h: 220 }
const CROPPED = 120 // px cut from the right edge
const initialImg: ImgS = { crop: 0, cropping: false, selected: false, flipped: false, show: true }
const posterImg: ImgS = { crop: CROPPED, cropping: false, selected: true, flipped: true, show: true }

export function ImageNodeScene({ theme, name }: DemoProps & { name: string }) {
  async function script(a: Act<ImgS>) {
    await a.wait(700)
    a.mark('select')
    await a.move({ x: IMG.x + IMG.w / 2, y: IMG.y + IMG.h / 2 })
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)
    a.mark('crop')
    await a.click(undefined, { double: true })
    await a.set({ cropping: true })
    await a.wait(500)
    const edge: Point = { x: IMG.x + IMG.w, y: IMG.y + IMG.h / 2 }
    await a.move(edge, { duration: 700 })
    await a.wait(250)
    await a.move({ x: edge.x - CROPPED, y: edge.y }, { duration: 1100, path: STRAIGHT, onMove: (p) => a.put({ crop: edge.x - p.x }) })
    await a.wait(500)
    await a.set({ cropping: false })
    await a.wait(400)
    a.mark('flip')
    await a.move('flip')
    await a.wait(300)
    await a.click({ at: 'flip' })
    await a.set({ flipped: true })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ crop: 0, flipped: false })
    await a.set({ show: true })
    await a.wait(700)
  }

  const visible = (s: ImgS): Box => ({ ...IMG, w: IMG.w - s.crop })
  return (
    <Stage<ImgS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initialImg} poster={posterImg} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        const v = visible(s)
        const cx = v.x + v.w / 2
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              {ghosts}
              <defs>
                <clipPath id={`${name}-clip`}>
                  <rect x={v.x} y={v.y} width={v.w} height={v.h} />
                </clipPath>
              </defs>
              <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                {/* The full image stays in place under the crop window; flipping mirrors the visible part about its center */}
                <g transform={s.flipped ? `translate(${cx * 2} 0) scale(-1 1)` : undefined} style={{ transition: 'transform 0.35s ease' }}>
                  <g clipPath={`url(#${name}-clip)`}>
                    <ImageNode {...IMG} />
                  </g>
                </g>
                {s.cropping && <rect className="wv-crop__full" x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} />}
              </g>
              <NodeSelection {...v} show={s.selected && !s.cropping} />
              {s.cropping && (
                <g className="wv-crop" data-cursor="resize-ew">
                  <rect className="wv-crop__handle" x={v.x + v.w - 3} y={v.y + v.h / 2 - 16} width={6} height={32} />
                  <rect className="wv-crop__handle" x={v.x - 3} y={v.y + v.h / 2 - 16} width={6} height={32} />
                </g>
              )}
            </NodeLayer>
            <div className="wv-node-bar" data-show={(s.selected && !s.cropping) || undefined} style={{ left: v.x + v.w / 2 - 20, top: v.y - 52 }}>
              <span className="wv-node-bar__button" data-on={s.flipped || undefined} data-target="flip">
                <FlipHorizontal size={16} strokeWidth={1.5} />
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

// ---- Video node: select, press play, the progress runs -------------------------------------------------------------

type VidS = { selected: boolean; playing: boolean; progress: number; show: boolean }
const VID: Box = { x: 290, y: 160, w: 380, h: 220 }
const initialVid: VidS = { selected: false, playing: false, progress: 0, show: true }
const posterVid: VidS = { selected: true, playing: true, progress: 0.55, show: true }

export function VideoNodeScene({ theme, name }: DemoProps & { name: string }) {
  async function script(a: Act<VidS>) {
    await a.wait(700)
    a.mark('select')
    await a.move({ x: VID.x + VID.w / 2, y: VID.y + VID.h / 2 })
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)
    a.mark('play')
    await a.click()
    await a.set({ playing: true })
    // Playback advances on its own while the pointer rests
    for (let i = 1; i <= 11; i++) {
      await a.set({ progress: (0.55 * i) / 11 })
      await a.wait(200)
    }
    await a.wait(2200)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ playing: false, progress: 0 })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<VidS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initialVid} poster={posterVid} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            {ghosts}
            <g style={{ opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <VideoNode {...VID} playing={s.playing} progress={s.progress} />
            </g>
            <NodeSelection {...VID} show={s.selected} />
          </NodeLayer>
          <div className="wv-scene__toolbar">
            <WeaveToolbar active="move" />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
