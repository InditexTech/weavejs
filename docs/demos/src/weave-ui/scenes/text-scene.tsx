// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Bold, Indent, Italic, List, Underline } from 'lucide-react'
import { Stage, type Act, type Point } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { NodeLayer, NodeSelection } from '../nodes/nodes'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'
import './text-scene.css'

const REST: Point = { x: 790, y: 440 }
const WORDS = 'Weave the web together'
const GROUPS_TEXT: ToolId[][] = [['move', 'hand'], ['rectangle', 'text', 'image'], ['undo', 'redo']]

// ---- Text tool: pick it, click the canvas, type, press Escape: the text node is selected ----------------------

type ToolS = { tool: ToolId; hover: boolean; placed: boolean; text: string; editing: boolean; selected: boolean }
const AT: Point = { x: 330, y: 250 }

export function TextToolScene({ theme, name }: DemoProps & { name: string }) {
  const info = TOOL_INFO.text
  const initial: ToolS = { tool: 'move', hover: false, placed: false, text: '', editing: false, selected: false }
  const poster: ToolS = { tool: 'move', hover: false, placed: true, text: WORDS, editing: false, selected: true }

  async function script(a: Act<ToolS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-text')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-text' })
    await a.set({ hover: false, tool: 'text' })
    await a.wait(400)
    a.mark('place')
    await a.move(AT)
    await a.wait(250)
    await a.click()
    await a.set({ placed: true, editing: true })
    await a.wait(500)
    a.mark('type')
    await a.type('text', WORDS, { interval: 90 })
    await a.wait(700)
    await a.set({ editing: false, tool: 'move', selected: true })
    await a.wait(2400)
    a.mark('reset')
    await a.set({ selected: false })
    await a.set({ placed: false })
    await a.move(REST)
    await a.set({ text: '' })
    await a.wait(700)
  }

  return (
    <Stage<ToolS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => {
        const box = rect('textnode')
        return (
          <>
            <WeaveCanvas className="wv-scene__canvas" data-target="canvas" data-cursor={s.tool === 'text' ? 'ibeam' : undefined}>
              <NodeLayer>
                <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
                <rect className="wv-scene__ghost" x="96.5" y="392.5" width="210" height="110" />
                {box.width > 0 && <NodeSelection x={box.x} y={box.y} w={box.width} h={box.height} show={s.selected && s.placed} />}
              </NodeLayer>
              <div className="wv-text" data-target="textnode" data-editing={s.editing || undefined} style={{ left: AT.x, top: AT.y - 14, opacity: s.placed ? 1 : 0, transition: 'opacity 0.2s ease, outline-color 0.15s ease' }}>
                <span className="wv-text__typed">{s.text}</span>
                <span className="wv-text__rest">{WORDS.slice(s.text.length)}</span>
              </div>
              <div className="wv-scene__toolbar">
                <WeaveToolbar active={s.tool} hovered={s.hover ? 'text' : undefined} groups={GROUPS_TEXT} />
              </div>
            </WeaveCanvas>
            <WeaveTooltip show={s.hover} at={rect('tool-text')} shortcut={info.key}>
              {info.label}
            </WeaveTooltip>
          </>
        )
      }}
    </Stage>
  )
}

// ---- Text node: select, move, double-click to edit and add a word -----------------------------------------------

type NodeS = { x: number; y: number; selected: boolean; editing: boolean; extra: string; show: boolean }
const NODE0 = { x: 230, y: 300 }
const NODE1 = { x: 360, y: 200 }
const INITIAL_TEXT = 'Weave text'
const EXTRA = ' nodes'

export function TextNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: NodeS = { ...NODE0, selected: false, editing: false, extra: '', show: true }
  const poster: NodeS = { ...NODE1, selected: true, editing: false, extra: EXTRA, show: true }

  async function script(a: Act<NodeS>) {
    await a.wait(700)
    a.mark('select')
    const r0 = a.rect('textnode')
    await a.move({ x: r0.x + r0.width / 2, y: r0.y + r0.height / 2 })
    await a.click()
    await a.set({ selected: true })
    await a.wait(600)
    a.mark('move')
    const from = { x: r0.x + r0.width / 2, y: r0.y + r0.height / 2 }
    await a.move({ x: from.x + (NODE1.x - NODE0.x), y: from.y + (NODE1.y - NODE0.y) }, {
      duration: 1100,
      path: (t, f, to) => ({ x: f.x + (to.x - f.x) * t, y: f.y + (to.y - f.y) * t }),
      onMove: (p) => a.put({ x: NODE0.x + (p.x - from.x), y: NODE0.y + (p.y - from.y) }),
    })
    await a.wait(500)
    a.mark('edit')
    await a.click(undefined, { double: true })
    await a.set({ editing: true })
    await a.wait(400)
    await a.type('extra', EXTRA, { interval: 110 })
    await a.wait(700)
    await a.set({ editing: false })
    await a.wait(2000)
    a.mark('reset')
    await a.move(REST)
    await a.set({ selected: false })
    await a.set({ show: false })
    await a.wait(300)
    a.put({ ...NODE0, extra: '' })
    await a.set({ show: true })
    await a.wait(700)
  }

  return (
    <Stage<NodeS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => {
        const box = rect('textnode')
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="130" />
              <rect className="wv-scene__ghost" x="96.5" y="400.5" width="210" height="100" />
              {box.width > 0 && <NodeSelection x={box.x} y={box.y} w={box.width} h={box.height} show={s.selected} />}
            </NodeLayer>
            <div className="wv-text" data-target="textnode" data-editing={s.editing || undefined} style={{ left: s.x, top: s.y, opacity: s.show ? 1 : 0, transition: 'opacity 0.3s ease, outline-color 0.15s ease' }}>
              <span className="wv-text__typed">{INITIAL_TEXT + s.extra}</span>
              <span className="wv-text__rest">{EXTRA.slice(s.extra.length)}</span>
            </div>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active="move" groups={GROUPS_TEXT} />
            </div>
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}

// ---- Rich text (text v2): select a word, make it bold, turn the next rows into an indented list --------------------

type RichS = { sel: boolean; bold: boolean; list: boolean; indent: boolean; bar: boolean; barAt: 'word' | 'row'; hover: 'bold' | 'list' | 'indent' | null }
const RICH0: RichS = { sel: false, bold: false, list: false, indent: false, bar: false, barAt: 'word', hover: null }

export function RichTextScene({ theme, name }: DemoProps & { name: string }) {
  const poster: RichS = { sel: false, bold: true, list: true, indent: true, bar: false, barAt: 'row', hover: null }

  async function script(a: Act<RichS>) {
    await a.wait(700)
    a.mark('select')
    const w = a.rect('word')
    await a.move({ x: w.x + w.width / 2, y: w.y + w.height / 2 })
    await a.click(undefined, { double: true })
    await a.set({ sel: true, bar: true })
    await a.wait(700)
    a.mark('bold')
    await a.move('fmt-bold')
    await a.set({ hover: 'bold' })
    await a.wait(300)
    await a.click({ at: 'fmt-bold' })
    await a.set({ bold: true, hover: null })
    await a.wait(700)
    await a.set({ bar: false })
    await a.wait(300)
    await a.set({ sel: false, barAt: 'row' })
    a.mark('list')
    const row = a.rect('row-1')
    await a.move({ x: row.x + 90, y: row.y + row.height / 2 })
    await a.click()
    await a.set({ bar: true })
    await a.wait(400)
    await a.move('fmt-list')
    await a.set({ hover: 'list' })
    await a.wait(300)
    await a.click({ at: 'fmt-list' })
    await a.set({ list: true, hover: null })
    await a.wait(700)
    a.mark('indent')
    await a.move('fmt-indent')
    await a.set({ hover: 'indent' })
    await a.wait(300)
    await a.click({ at: 'fmt-indent' })
    await a.set({ indent: true, hover: null })
    await a.wait(2000)
    a.mark('reset')
    await a.set({ bar: false })
    await a.move(REST)
    await a.set({ bold: false, list: false, indent: false })
    await a.wait(300)
    a.put({ barAt: 'word' })
    await a.wait(700)
  }

  return (
    <Stage<RichS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={RICH0} poster={poster} script={script} cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => {
        return (
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <div className="wv-rich" style={{ left: 190, top: 170 }}>
              <p className="wv-rich__p">
                Plan the{' '}
                <span className={s.sel ? 'wv-rich__sel' : undefined} data-target="word">
                  <span className="wv-rich__word" data-bold={s.bold || undefined}>launch</span>
                </span>{' '}
                with the whole team.
              </p>
              <div className="wv-rich__row" data-list={s.list || undefined} data-target="row-0">
                <span className="wv-rich__marker">•</span>
                <span>Draft the roadmap</span>
              </div>
              <div className="wv-rich__row" data-list={s.list || undefined} data-indent={s.indent || undefined} data-target="row-1">
                <span className="wv-rich__marker">•</span>
                <span>Review with design</span>
              </div>
            </div>
            <div className="wv-format" data-show={s.bar || undefined} style={{ left: 190, top: 118 }}>
              <span className="wv-format__button" data-on={s.bold || undefined} data-hover={s.hover === 'bold' || undefined} data-target="fmt-bold">
                <Bold size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-format__button">
                <Italic size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-format__button">
                <Underline size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-format__divider" />
              <span className="wv-format__button" data-on={s.list || undefined} data-hover={s.hover === 'list' || undefined} data-target="fmt-list">
                <List size={16} strokeWidth={1.5} />
              </span>
              <span className="wv-format__button" data-on={s.indent || undefined} data-hover={s.hover === 'indent' || undefined} data-target="fmt-indent">
                <Indent size={16} strokeWidth={1.5} />
              </span>
            </div>
          </WeaveCanvas>
        )
      }}
    </Stage>
  )
}
