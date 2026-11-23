// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage, type Act, type Point } from '../../../kit'
import type { CSSProperties } from 'react'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../canvas'
import { NodeLayer, RectNode } from '../nodes/nodes'
import { CommentPin } from '../overlays/overlays'
import { TOOL_INFO, WeaveToolbar, WeaveTooltip, type ToolId } from '../toolbar'
import './scenes.css'
import './comment-scene.css'

const REST: Point = { x: 790, y: 450 }
const MAYA = '#d1478a'
const JON = '#2f9e8f'
const PIN: Point = { x: 450, y: 270 }
const GROUPS: ToolId[][] = [['move', 'hand'], ['rectangle', 'comment', 'text'], ['undo', 'redo']]
const ghost = <rect className="wv-scene__ghost" x="716.5" y="60.5" width="200" height="110" />
const subject = <RectNode x={340} y={290} w={230} h={130} />

export function Msg({ who, color, initials, children, hidden }: { who: string; color: string; initials: string; children: string; hidden?: boolean }) {
  return (
    <div className="wv-thread__msg" data-hidden={hidden || undefined} style={{ '--who': color } as CSSProperties}>
      <span className="wv-thread__avatar">{initials}</span>
      <span>
        <span className="wv-thread__name">{who}</span>
        {children}
      </span>
    </div>
  )
}

// ---- Comment tool: pick it, click the canvas, type the comment, post it ----------------------------------------------

type ToolS = { tool: ToolId; hover: boolean; pin: boolean; open: boolean; typing: boolean; text: string }
const WORDS = 'Looks good to me'

export function CommentToolScene({ theme, name }: DemoProps & { name: string }) {
  const info = TOOL_INFO.comment
  const initial: ToolS = { tool: 'move', hover: false, pin: false, open: false, typing: false, text: '' }
  const poster: ToolS = { tool: 'move', hover: false, pin: true, open: true, typing: false, text: WORDS }

  async function script(a: Act<ToolS>) {
    await a.wait(600)
    a.mark('pick')
    await a.move('tool-comment')
    await a.set({ hover: true })
    await a.wait(900)
    await a.click({ at: 'tool-comment' })
    await a.set({ hover: false, tool: 'comment' })
    await a.wait(400)
    a.mark('place')
    await a.move(PIN)
    await a.wait(250)
    await a.click()
    await a.set({ pin: true, open: true, typing: true })
    await a.wait(500)
    a.mark('type')
    await a.type('text', WORDS, { interval: 80 })
    await a.wait(500)
    await a.key('Enter')
    await a.set({ typing: false, tool: 'move' })
    await a.wait(2600)
    a.mark('reset')
    await a.set({ open: false })
    await a.set({ pin: false })
    await a.move(REST)
    await a.set({ text: '' })
    await a.wait(700)
  }

  return (
    <Stage<ToolS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s, rect) => (
        <>
          <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
            <NodeLayer>
              {ghost}
              {subject}
            </NodeLayer>
            <CommentPin at={PIN} color={MAYA} count={1} show={s.pin} />
            <div className="wv-thread" data-show={s.open || undefined} data-editing={s.typing || undefined} style={{ left: PIN.x + 36, top: PIN.y - 96 }}>
              <div className="wv-thread__msg" style={{ '--who': MAYA, marginBottom: 0 } as CSSProperties}>
                <span className="wv-thread__avatar">MC</span>
                <span>
                  <span className="wv-thread__name">Maya</span>
                  <span className="wv-thread__line">
                    <span className="wv-thread__placeholder" data-hide={s.text.length > 0 || !s.typing || undefined}>Add a comment</span>
                    <span className="wv-thread__typed">{s.text}</span>
                    <span className="wv-thread__rest">{WORDS.slice(s.text.length)}</span>
                  </span>
                </span>
              </div>
            </div>
            <div className="wv-scene__toolbar">
              <WeaveToolbar active={s.tool} hovered={s.hover ? 'comment' : undefined} groups={GROUPS} />
            </div>
          </WeaveCanvas>
          <WeaveTooltip show={s.hover} at={rect('tool-comment')} shortcut={info.key}>
            {info.label}
          </WeaveTooltip>
        </>
      )}
    </Stage>
  )
}

// ---- Comment node: open a thread from its pin and reply ------------------------------------------------------------

type NodeS = { open: boolean; reply: string; posted: boolean; typing: boolean }
const REPLY = 'Thanks!'

export function CommentNodeScene({ theme, name }: DemoProps & { name: string }) {
  const initial: NodeS = { open: false, reply: '', posted: false, typing: false }
  const poster: NodeS = { open: true, reply: REPLY, posted: true, typing: false }

  async function script(a: Act<NodeS>) {
    await a.wait(700)
    a.mark('open')
    await a.move({ x: PIN.x + 14, y: PIN.y - 14 })
    await a.wait(250)
    await a.click()
    await a.set({ open: true })
    await a.wait(1400)
    a.mark('reply')
    await a.move({ x: PIN.x + 120, y: PIN.y + 70 }, { duration: 800 })
    await a.click()
    await a.set({ typing: true })
    await a.wait(300)
    await a.type('reply', REPLY, { interval: 110 })
    await a.wait(400)
    await a.key('Enter')
    await a.set({ typing: false, posted: true })
    await a.wait(2400)
    a.mark('reset')
    await a.move(REST)
    await a.set({ open: false })
    await a.wait(300)
    a.put({ reply: '', posted: false })
    await a.wait(700)
  }

  return (
    <Stage<NodeS> width={960} height={540} theme={theme} tokens={weaveTokens(theme)} initial={initial} poster={poster} script={script} keys="top" cursor={{ at: REST, style: 'real', ripple: true }} className={`wv-scene ${name}`}>
      {(s) => (
        <WeaveCanvas className="wv-scene__canvas" data-target="canvas">
          <NodeLayer>
            {ghost}
            {subject}
          </NodeLayer>
          <CommentPin at={PIN} color={MAYA} count={s.posted ? 3 : 2} />
          <div className="wv-thread" data-show={s.open || undefined} data-editing={s.typing || undefined} style={{ left: PIN.x + 36, top: PIN.y - 120 }}>
            <Msg who="Maya" color={MAYA} initials="MC">Can we shorten the title?</Msg>
            <Msg who="Jon" color={JON} initials="JP">Done, take a look.</Msg>
            <Msg who="Maya" color={MAYA} initials="MC" hidden={!s.posted}>{REPLY}</Msg>
            <div className="wv-thread__field" style={{ opacity: s.posted ? 0 : 1, transition: 'opacity 0.2s ease' }}>
              <span className="wv-thread__line">
                <span className="wv-thread__placeholder" data-hide={s.reply.length > 0 || s.typing || undefined}>Reply</span>
                <span className="wv-thread__typed">{s.reply}</span>
                <span className="wv-thread__rest">{REPLY.slice(s.reply.length)}</span>
              </span>
            </div>
          </div>
          <div className="wv-scene__toolbar">
            <WeaveToolbar active="move" groups={GROUPS} />
          </div>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
