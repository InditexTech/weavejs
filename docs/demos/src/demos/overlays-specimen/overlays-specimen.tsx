// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Cloud, Copy, Server, Trash2 } from 'lucide-react'
import { Stage } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import { FlowBox, MessageChip, MiniCanvas } from '../../weave-ui/flow/flow'
import { NodeLayer, RectNode } from '../../weave-ui/nodes/nodes'
import { CommentPin, ContextMenu, DropTarget, FileChip, Marquee, Minimap, SnapGuides, ZoomBar } from '../../weave-ui/overlays/overlays'

// Specimen of the overlay and system-flow parts, still, to check them in both themes.
// Not embedded in any page and not exported as a poster.
export default function OverlaysSpecimen({ theme }: DemoProps) {
  return (
    <Stage width={960} height={540} theme={theme} tokens={weaveTokens(theme)} specimen>
      {() => (
        <WeaveCanvas style={{ position: 'absolute', inset: 0 }}>
          <NodeLayer>
            <RectNode x={40} y={40} w={140} h={80} />
            <RectNode x={230} y={52} w={140} h={80} />
          </NodeLayer>
          <SnapGuides lines={[{ x1: 40, y1: 86, x2: 370, y2: 86 }, { x1: 180, y1: 30, x2: 180, y2: 140, tone: 'blue' }]} tags={[{ x: 205, y: 86, text: '50' }]} />
          <Marquee x={420} y={40} w={150} h={90} />
          <ContextMenu show at={{ x: 620, y: 40 }} items={[{ label: 'Copy', icon: Copy, shortcut: 'Ctrl C', hovered: true }, { label: 'Paste', shortcut: 'Ctrl V', disabled: true }, { label: 'Delete', icon: Trash2, shortcut: 'Del', divider: true }]} />
          <ZoomBar zoom="50%" style={{ left: 40, top: 180 }} />
          <Minimap style={{ left: 40, top: 250 }} nodes={[{ x: 0.1, y: 0.2, w: 0.2, h: 0.2 }, { x: 0.5, y: 0.4, w: 0.25, h: 0.25 }]} viewport={{ x: 0.3, y: 0.1, w: 0.5, h: 0.6 }} />
          <CommentPin at={{ x: 300, y: 230 }} color="#d1478a" count={2} />
          <DropTarget show={false} />
          <FileChip name="plan.png" at={{ x: 300, y: 260 }} />
          <FlowBox icon={Cloud} title="Client" sub="Weave.js" target="c1" style={{ left: 480, top: 200 }} />
          <FlowBox icon={Server} title="Server" sub="Node.js" target="s1" tone="accent" style={{ left: 700, top: 200 }} />
          <MiniCanvas style={{ position: 'absolute', left: 480, top: 280, width: 180, height: 100 }} />
          <MessageChip at={{ x: 640, y: 235 }}>move rect</MessageChip>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
