// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PlaceToolScene } from '../../weave-ui/scenes/media-scene'
import { VideoNode } from '../../weave-ui/nodes/nodes'
import type { DemoProps } from '../../types'

const GROUPS: Parameters<typeof PlaceToolScene>[0]['groups'] = [['move', 'hand'], ['rectangle', 'image', 'images', 'video'], ['undo', 'redo']]

export default function VideoTool({ theme }: DemoProps) {
  return (
    <PlaceToolScene
      theme={theme}
      name="video-tool"
      tool="video"
      groups={GROUPS}
      boxes={(c) => [{ x: c.x - 170, y: c.y - 105, w: 340, h: 210 }]}
      render={(box) => <VideoNode {...box} />}
    />
  )
}
