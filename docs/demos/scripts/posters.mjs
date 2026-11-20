// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Exports the light and dark poster pair of every demo in src/registry.ts.
//
//   npm run posters [-- <key> ...]      all demos, or only the named keys
//
// For each key the posters are written next to the demo (src/demos/<dir>/<key>-poster-light|dark.png)
// and, when pages.json maps the key to a docs images folder, copied there so the page can embed them.
// A demo whose BRIEF.md says `**Poster alpha:** required` must produce a PNG with an alpha channel.
// Starts the dev server when none is listening. Exits non-zero if any export fails.

import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { capturePoster, launch } from './lib/capture.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.DEMOS_PORT ?? 5174)
const base = `http://127.0.0.1:${port}`
const SKIP = new Set(['specimen', 'nodes-specimen', 'overlays-specimen'])

/** Registry keys with the demo folder each lazy import points at. */
export function readRegistry() {
  const src = readFileSync(join(root, 'src/registry.ts'), 'utf8')
  const out = []
  for (const m of src.matchAll(/^\s*'?([\w-]+)'?:\s*\(\)\s*=>\s*import\('\.\/demos\/([\w-]+)\//gm)) out.push({ key: m[1], dir: m[2] })
  return out
}

const listening = async () => {
  try {
    return (await fetch(base)).ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await listening()) return undefined
  const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (await listening()) return child
    await new Promise((r) => setTimeout(r, 500))
  }
  child.kill()
  throw new Error('dev server did not start')
}

const pages = existsSync(join(root, 'pages.json')) ? JSON.parse(readFileSync(join(root, 'pages.json'), 'utf8')) : {}
const alphaRequired = (dir) => {
  const brief = join(root, 'src/demos', dir, 'BRIEF.md')
  return existsSync(brief) && /\*\*Poster alpha:\*\*\s*required/i.test(readFileSync(brief, 'utf8'))
}

const wanted = process.argv.slice(2)
const entries = readRegistry().filter((e) => !SKIP.has(e.key) && (wanted.length === 0 || wanted.includes(e.key)))
if (wanted.length && entries.length !== wanted.length) {
  console.error(`unknown demo key(s): ${wanted.filter((k) => !entries.some((e) => e.key === k)).join(', ')}`)
  process.exit(2)
}

const server = await ensureServer()
const browser = await launch()
const failures = []
try {
  for (const { key, dir } of entries) {
    for (const theme of ['light', 'dark']) {
      const out = join(root, 'src/demos', dir, `${key}-poster-${theme}.png`)
      try {
        const { hasAlpha } = await capturePoster(browser, { url: `${base}/?demo=${key}&theme=${theme}`, out, dark: theme === 'dark', reduced: true })
        if (alphaRequired(dir) && !hasAlpha) throw new Error('PNG has no alpha channel but the brief requires one')
        const target = pages[key]
        if (target) {
          const folder = join(root, '../src/modules', target)
          mkdirSync(folder, { recursive: true })
          copyFileSync(out, join(folder, `${key}-poster-${theme}.png`))
        }
        console.log(`ok   ${key} ${theme}`)
      } catch (err) {
        failures.push(`${key} ${theme}: ${err.message}`)
        console.error(`FAIL ${key} ${theme}: ${err.message}`)
      }
    }
  }
} finally {
  await browser.close()
  server?.kill()
}
if (failures.length) {
  console.error(`\n${failures.length} poster export(s) failed`)
  process.exit(1)
}
console.log(`\n${entries.length} demo(s), ${entries.length * 2} posters`)
