// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ImageToolScene } from '../../weave-ui/scenes/os-scenes'
import type { DemoProps } from '../../types'

export default function VideoTool({ theme }: DemoProps) {
  return <ImageToolScene theme={theme} name="video-tool" multi={false} media="video" />
}
