// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ImageToolScene } from '../../weave-ui/scenes/os-scenes'
import type { DemoProps } from '../../types'

export default function ImageTool({ theme }: DemoProps) {
  return <ImageToolScene theme={theme} name="image-tool" multi={false} />
}
