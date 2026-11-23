// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Stage } from '../../../kit'
import type { DemoProps } from '../../types'
import { weaveTokens } from '../../looks/weave'
import { WeaveCanvas } from '../../weave-ui/canvas'
import { ArrowNode, ConnectorNode, EllipseNode, FrameNode, ImageNode, LineNode, MeasureNode, NodeLayer, NodeSelection, PolygonNode, RectNode, RegularPolygonNode, StarNode, StickyNode, StrokeNode, TextNode } from '../../weave-ui/nodes/nodes'

// Specimen of every Weave node renderer, still, to check them in both themes.
// Not embedded in any page and not exported as a poster.
export default function NodesSpecimen({ theme }: DemoProps) {
  return (
    <Stage width={960} height={540} theme={theme} tokens={weaveTokens(theme)} specimen>
      {() => (
        <WeaveCanvas style={{ position: 'absolute', inset: 0 }}>
          <NodeLayer>
            <RectNode x={40} y={40} w={160} h={100} />
            <EllipseNode x={230} y={40} w={160} h={100} />
            <PolygonNode x={420} y={40} w={160} h={100} points={[[0.5, 0], [1, 0.4], [0.8, 1], [0.2, 1], [0, 0.4]]} />
            <RegularPolygonNode x={610} y={40} w={110} h={100} sides={6} />
            <StarNode x={750} y={40} w={110} h={100} tips={5} inner={0.45} />
            <LineNode x1={40} y1={200} x2={200} y2={250} strokeWidth={2} />
            <ArrowNode x1={230} y1={250} x2={390} y2={200} strokeWidth={2} />
            <TextNode x={420} y={205}>Weave text</TextNode>
            <ImageNode x={610} y={190} w={130} h={90} />
            <FrameNode x={770} y={200} w={150} h={90} title="Frame" />
            <StickyNode x={40} y={330} w={140} h={140} text="Note" />
            <ConnectorNode x1={230} y1={360} x2={400} y2={440} />
            <MeasureNode x1={440} y1={430} x2={600} y2={430} label="160px" />
            <StrokeNode points={[[640, 450], [670, 380], [710, 440], [760, 360], [800, 430]]} />
            <NodeSelection x={830} y={330} w={90} h={140} />
            <RectNode x={830} y={330} w={90} h={140} />
          </NodeLayer>
        </WeaveCanvas>
      )}
    </Stage>
  )
}
