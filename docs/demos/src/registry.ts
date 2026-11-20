// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DemoModule } from './types'

// One lazy chunk per demo. Keys are the `data-demo` values used in pages.
export const demos: Record<string, () => Promise<DemoModule>> = {
  'comment-tool': () => import('./demos/comment-tool/comment-tool'),
  'comment': () => import('./demos/comment/comment'),
  'group': () => import('./demos/group/group'),
  'sticky-note-tool': () => import('./demos/sticky-note-tool/sticky-note-tool'),
  'sticky-note': () => import('./demos/sticky-note/sticky-note'),
  'frame-tool': () => import('./demos/frame-tool/frame-tool'),
  'frame': () => import('./demos/frame/frame'),
  'video-tool': () => import('./demos/video-tool/video-tool'),
  'video': () => import('./demos/video/video'),
  'images-tool': () => import('./demos/images-tool/images-tool'),
  'image-tool': () => import('./demos/image-tool/image-tool'),
  'image': () => import('./demos/image/image'),
  'text-v2': () => import('./demos/text-v2/text-v2'),
  'text-tool': () => import('./demos/text-tool/text-tool'),
  'text': () => import('./demos/text/text'),
  'measure-tool': () => import('./demos/measure-tool/measure-tool'),
  'measure': () => import('./demos/measure/measure'),
  'connector-tool': () => import('./demos/connector-tool/connector-tool'),
  'connector': () => import('./demos/connector/connector'),
  'arrow-tool': () => import('./demos/arrow-tool/arrow-tool'),
  'arrow': () => import('./demos/arrow/arrow'),
  'line-tool': () => import('./demos/line-tool/line-tool'),
  'line': () => import('./demos/line/line'),
  'star-tool': () => import('./demos/star-tool/star-tool'),
  'star': () => import('./demos/star/star'),
  'regular-polygon-tool': () => import('./demos/regular-polygon-tool/regular-polygon-tool'),
  'regular-polygon': () => import('./demos/regular-polygon/regular-polygon'),
  'polygon-tool': () => import('./demos/polygon-tool/polygon-tool'),
  'polygon': () => import('./demos/polygon/polygon'),
  'ellipse-tool': () => import('./demos/ellipse-tool/ellipse-tool'),
  'ellipse': () => import('./demos/ellipse/ellipse'),
  'home-hero': () => import('./demos/home-hero/home-hero'),
  'rectangle-tool': () => import('./demos/rectangle-tool/rectangle-tool'),
  'rectangle-node': () => import('./demos/rectangle-node/rectangle-node'),
  'nodes-specimen': () => import('./demos/nodes-specimen/nodes-specimen'),
  'overlays-specimen': () => import('./demos/overlays-specimen/overlays-specimen'),
  specimen: () => import('./demos/specimen/specimen'),
}
