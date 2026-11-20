// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PlaceToolScene } from '../../weave-ui/scenes/media-scene'
import { ImageNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof PlaceToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'image', 'images', 'video'], ['undo', 'redo']]

export default function ImagesTool({ theme }: DemoProps) {
  return (
    <PlaceToolScene
      theme={theme}
      name="images-tool"
      tool="images"
      groups={GROUPS}
      boxes={(c) => [-1, 0, 1].map((i) => ({ x: c.x - 85 + i * 190, y: c.y - 60, w: 170, h: 120 }))}
      render={(box) => <ImageNode {...box} />}
    />
  )
}
