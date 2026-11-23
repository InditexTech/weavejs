// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createElement, useLayoutEffect, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { DemoModule, DocsTheme } from './types'

export type Registry = Record<string, () => Promise<DemoModule>>

export interface LoaderOptions {
  registry: Registry
  /** Called once before the first demo mounts (fonts). */
  prepare?: () => Promise<void>
  /** How far outside the viewport a demo starts mounting. */
  rootMargin?: string
}

const NAME_CLASS = /^weave-demo--(.+)$/

/** The demo a placeholder asks for: the `weave-demo--<name>` class next to `weave-demo`. */
export function demoNameOf(el: Element): string | undefined {
  for (const cls of el.classList) {
    const match = NAME_CLASS.exec(cls)
    if (match) return match[1]
  }
  return undefined
}

/** The docs UI marks its theme with a class on <html>. */
export function currentTheme(): DocsTheme {
  return document.documentElement.classList.contains('dt-theme-dark') ? 'dark' : 'light'
}

/**
 * Posters come in pairs, \`<name>-light.png\` and \`<name>-dark.png\`. The page
 * links the light one (it is what shows without JavaScript); with JavaScript
 * the poster follows the theme so the dark site never flashes a light card.
 */
export function syncPoster(el: Element, theme: DocsTheme) {
  const img = el.querySelector('img')
  if (!img) return
  const src = img.getAttribute('src') ?? ''
  const next = theme === 'dark' ? src.replace(/-light(\.\w+)(\?.*)?$/, '-dark$1$2') : src.replace(/-dark(\.\w+)(\?.*)?$/, '-light$1$2')
  if (next !== src) img.setAttribute('src', next)
}

/** Calls `onReady` once its children have committed, before the browser's next paint. */
function Ready({ onReady, children }: { onReady: () => void; children?: ReactNode }) {
  useLayoutEffect(() => {
    onReady()
  }, [])
  return children
}

interface Mounted {
  host: HTMLElement
  root: Root
  Demo: DemoModule['default']
}

/**
 * Finds every `.weave-demo` placeholder, mounts its demo when it nears the
 * viewport and keeps it in step with the docs theme. The placeholder's own
 * image stays as the poster: it is what shows without JavaScript, while the
 * demo loads, and if the demo cannot load.
 */
export function initDemos({ registry, prepare, rootMargin = '200px' }: LoaderOptions) {
  const placeholders = Array.from(document.querySelectorAll<HTMLElement>('.weave-demo'))
  const mounted = new Set<Mounted>()
  let ready: Promise<void> | undefined

  const mount = async (el: HTMLElement) => {
    const name = demoNameOf(el)
    const load = name ? registry[name] : undefined
    if (!load) return
    try {
      ready ??= prepare?.() ?? Promise.resolve()
      const [{ default: Demo }] = await Promise.all([load(), ready])
      const host = document.createElement('div')
      host.className = 'weave-demo__stage'
      // The stage overlays the poster image exactly: wrap the image in a frame that shrink-wraps it,
      // whatever padding or background the surrounding image block has.
      const img = el.querySelector('img')
      const frame = document.createElement('span')
      frame.className = 'weave-demo__frame'
      if (img) {
        img.replaceWith(frame)
        frame.append(img, host)
      } else {
        (el.querySelector<HTMLElement>('.content') ?? el).append(frame)
        frame.append(host)
      }
      const root = createRoot(host)
      // The poster keeps showing until the stage has painted its first frame (the same frame the poster
      // shows), so there is never a moment with neither: hiding it on render would leave a blank gap.
      const onReady = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => (el.dataset.demoState = 'mounted')))
      }
      root.render(createElement(Ready, { onReady }, createElement(Demo, { theme: currentTheme() })))
      mounted.add({ host, root, Demo })
    } catch {
      el.dataset.demoState = 'failed'
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        io.unobserve(entry.target)
        void mount(entry.target as HTMLElement)
      }
    },
    { rootMargin },
  )
  placeholders.forEach((el) => {
    syncPoster(el, currentTheme())
    io.observe(el)
  })

  const themes = new MutationObserver(() => {
    const theme = currentTheme()
    placeholders.forEach((el) => syncPoster(el, theme))
    mounted.forEach(({ root, Demo }) => root.render(createElement(Demo, { theme })))
  })
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  return {
    destroy() {
      io.disconnect()
      themes.disconnect()
      mounted.forEach(({ root, host }) => {
        root.unmount()
        host.remove()
      })
      mounted.clear()
    },
  }
}
