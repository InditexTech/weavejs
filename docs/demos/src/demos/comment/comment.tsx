// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { CommentNodeScene } from '../../weave-ui/scenes/comment-scene'
import type { DemoProps } from '../../types'

export default function Comment({ theme }: DemoProps) {
  return <CommentNodeScene theme={theme} name="comment" />
}
