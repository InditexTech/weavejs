// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Captures a transparent PNG of one element. Stageshow's film.mjs --still
// screenshots without omitBackground, so its stills are opaque; posters for
// the docs need an alpha channel. For every registered demo at once, use
// scripts/posters.mjs (npm run posters).
//
//   node scripts/poster.mjs <url> --select <css> --out <file.png>
//        [--scale 2] [--dark] [--reduced] [--wait <ms>] [--check-alpha | --require-alpha]
//
// --reduced emulates prefers-reduced-motion, which makes a Stage show its
// poster state: capture posters this way.
//
// CHROME_PATH overrides the Chrome binary.

import { parseArgs } from 'node:util'
import { capturePoster, launch } from './lib/capture.mjs'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    select: { type: 'string' },
    out: { type: 'string' },
    scale: { type: 'string', default: '2' },
    wait: { type: 'string', default: '500' },
    dark: { type: 'boolean', default: false },
    reduced: { type: 'boolean', default: false },
    'check-alpha': { type: 'boolean', default: false },
    'require-alpha': { type: 'boolean', default: false },
  },
})

const [url] = positionals
if (!url || !values.select || !values.out) {
  console.error('usage: poster.mjs <url> --select <css> --out <file.png> [--scale 2] [--dark] [--reduced] [--wait ms] [--check-alpha | --require-alpha]')
  process.exit(2)
}

const browser = await launch()
try {
  const { file, hasAlpha, transparentPixels } = await capturePoster(browser, { url, select: values.select, out: values.out, scale: values.scale, dark: values.dark, reduced: values.reduced, wait: values.wait })
  if (values['check-alpha'] || values['require-alpha']) {
    console.log(`alpha channel: ${hasAlpha ? 'yes' : 'NO'}; ${transparentPixels} fully transparent pixels`)
    if (values['require-alpha'] && !hasAlpha) process.exitCode = 1
  }
  console.log(`poster -> ${file}`)
} finally {
  await browser.close()
}
