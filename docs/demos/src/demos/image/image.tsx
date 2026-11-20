// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ImageNodeScene } from '../../weave-ui/scenes/media-scene'
import type { DemoProps } from '../../types'

export default function Image({ theme }: DemoProps) {
  return <ImageNodeScene theme={theme} name="image" />
}
