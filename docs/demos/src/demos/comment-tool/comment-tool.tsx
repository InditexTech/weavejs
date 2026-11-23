// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { CommentToolScene } from '../../weave-ui/scenes/comment-scene'
import type { DemoProps } from '../../types'

export default function CommentTool({ theme }: DemoProps) {
  return <CommentToolScene theme={theme} name="comment-tool" />
}
