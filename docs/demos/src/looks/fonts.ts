// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Self-hosted faces served from the docs UI root (supplemental-ui/fonts).
// The loader derives that root from where this bundle itself is served.
const FACES: Array<[family: string, weight: string, file: string]> = [
  ['Weave Inter', '300', 'Inter-300.woff2'],
  ['Weave Inter', '400', 'Inter-400.woff2'],
  ['Weave Inter', '700', 'Inter-700.woff2'],
  ['Weave Noto Sans Mono', '400', 'NotoSansMono-400.woff2'],
]

let loaded: Promise<void> | undefined

export function loadWeaveFonts(fontsBase: string): Promise<void> {
  if (loaded || typeof FontFace === 'undefined') return loaded ?? Promise.resolve()
  loaded = Promise.all(
    FACES.map(async ([family, weight, file]) => {
      const face = new FontFace(family, `url(${fontsBase}/${file}) format("woff2")`, { weight, display: 'swap' })
      document.fonts.add(await face.load())
    }),
  ).then(() => undefined, () => undefined)
  return loaded
}
