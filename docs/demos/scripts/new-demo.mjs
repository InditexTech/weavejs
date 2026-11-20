// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Scaffolds a new demo: its folder (component, stylesheet, BRIEF.md, REHEARSAL.md)
// and its registry entry.
//
//   npm run new-demo -- <name> [--family tool|node|blank] [--images <folder under docs/src/modules>]
//
// <name> is the registry key and the folder name (kebab-case), e.g. `ellipse-tool`.
// --family picks the starting point: `tool` (pick a tool, create a node by dragging),
// `node` (select, move and resize a node), `blank` (a canvas and a two-beat script).
// --images records where the page's poster copies go (see pages.json) so `npm run posters`
// copies them there.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const templates = join(root, '../../.agents/skills/weave-demos/templates')

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { family: { type: 'string', default: 'blank' }, images: { type: 'string' } },
})
const [name] = positionals
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || !['tool', 'node', 'blank'].includes(values.family)) {
  console.error('usage: new-demo <kebab-case-name> [--family tool|node|blank] [--images <folder>]')
  process.exit(2)
}

const dir = join(root, 'src/demos', name)
if (existsSync(dir)) {
  console.error(`src/demos/${name} already exists`)
  process.exit(1)
}
const registryFile = join(root, 'src/registry.ts')
const registry = readFileSync(registryFile, 'utf8')
if (new RegExp(`^\\s*'?${name}'?:`, 'm').test(registry)) {
  console.error(`registry already has a key ${name}`)
  process.exit(1)
}

const component = name
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('')
const fill = (text) => text.replaceAll('__N__', name).replaceAll('__C__', component).replaceAll('__P__', name)

mkdirSync(dir, { recursive: true })
const family = join(root, 'scripts/templates', values.family)
writeFileSync(join(dir, `${name}.tsx`), fill(readFileSync(join(family, 'demo.tsx'), 'utf8')))
writeFileSync(join(dir, `${name}.css`), fill(readFileSync(join(family, 'demo.css'), 'utf8')))
writeFileSync(join(dir, 'BRIEF.md'), readFileSync(join(templates, 'BRIEF.md'), 'utf8').replaceAll('<name>', name))
writeFileSync(join(dir, 'REHEARSAL.md'), readFileSync(join(templates, 'REHEARSAL.md'), 'utf8').replaceAll('<name>', name))

const entry = `  '${name}': () => import('./demos/${name}/${name}'),\n`
writeFileSync(registryFile, registry.replace(/^(export const demos[^\n]*\n)/m, `$1${entry}`))

if (values.images) {
  const file = join(root, 'pages.json')
  const pages = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  pages[name] = values.images
  writeFileSync(file, `${JSON.stringify(pages, null, 2)}\n`)
}

console.log(`created src/demos/${name}/ (${values.family}) and a registry entry`)
console.log('next: fill BRIEF.md, build the script, then `npm run dev` and open /?demo=' + name)
