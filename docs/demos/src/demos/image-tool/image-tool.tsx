// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PlaceToolScene } from '../../weave-ui/scenes/media-scene'
import { ImageNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof PlaceToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'image', 'images', 'video'], ['undo', 'redo']]

export default function ImageTool({ theme }: DemoProps) {
  return (
    <PlaceToolScene
      theme={theme}
      name="image-tool"
      tool="image"
      groups={GROUPS}
      boxes={(c) => [{ x: c.x - 150, y: c.y - 100, w: 300, h: 200 }]}
      render={(box) => <ImageNode {...box} />}
    />
  )
}
