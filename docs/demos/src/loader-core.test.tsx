// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { currentTheme, demoNameOf, initDemos, syncPoster, type Registry } from './loader-core'
import type { DemoProps } from './types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type IOCallback = (entries: Array<Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>>) => void
let observers: Array<{ cb: IOCallback; targets: Element[] }> = []

class FakeIO {
  entry: { cb: IOCallback; targets: Element[] }
  constructor(cb: IOCallback) {
    this.entry = { cb, targets: [] }
    observers.push(this.entry)
  }
  observe(el: Element) {
    this.entry.targets.push(el)
  }
  unobserve(el: Element) {
    this.entry.targets = this.entry.targets.filter((t) => t !== el)
  }
  disconnect() {
    this.entry.targets = []
  }
}

const flush = async () => {
  for (let i = 0; i < 3; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const reveal = async (el: Element) => {
  await act(async () => {
    observers.forEach(({ cb, targets }) => targets.includes(el) && cb([{ isIntersecting: true, target: el }]))
    await flush()
  })
}

const placeholder = (name: string) => {
  const el = document.createElement('div')
  el.className = `imageblock weave-demo weave-demo--${name}`
  el.innerHTML = '<div class="content"><img src="poster.png" alt="Poster"></div>'
  document.body.append(el)
  return el
}

const Demo = ({ theme }: DemoProps) => <p data-testid="demo">demo:{theme}</p>

let handle: ReturnType<typeof initDemos> | undefined

beforeEach(() => {
  observers = []
  document.body.innerHTML = ''
  document.documentElement.className = ''
  vi.stubGlobal('IntersectionObserver', FakeIO)
})

afterEach(() => {
  act(() => handle?.destroy())
  handle = undefined
  vi.unstubAllGlobals()
})

describe('demoNameOf', () => {
  it('reads the name from the weave-demo--<name> class', () => {
    expect(demoNameOf(placeholder('rectangle-tool'))).toBe('rectangle-tool')
  })
  it('returns undefined without a name class', () => {
    const el = document.createElement('div')
    el.className = 'weave-demo'
    expect(demoNameOf(el)).toBeUndefined()
  })
})

describe('initDemos', () => {
  const registry: Registry = { ok: async () => ({ default: Demo }) }

  it('does not mount a demo that has not neared the viewport', async () => {
    const el = placeholder('ok')
    const load = vi.fn(registry.ok)
    handle = initDemos({ registry: { ok: load } })
    expect(load).not.toHaveBeenCalled()
    expect(el.querySelector('.weave-demo__stage')).toBeNull()
  })

  it('mounts into the placeholder once it intersects and keeps the poster image', async () => {
    const el = placeholder('ok')
    handle = initDemos({ registry })
    await reveal(el)
    expect(el.dataset.demoState).toBe('mounted')
    expect(el.querySelector('.weave-demo__stage [data-testid="demo"]')?.textContent).toBe('demo:light')
    expect(el.querySelector('img')).not.toBeNull()
  })

  it('overlays the stage on a frame that wraps the poster image', async () => {
    const el = placeholder('ok')
    handle = initDemos({ registry })
    await reveal(el)
    const frame = el.querySelector('.weave-demo__frame')
    expect(frame?.querySelector(':scope > img')).not.toBeNull()
    expect(frame?.querySelector(':scope > .weave-demo__stage')).not.toBeNull()
  })

  it('mounts each placeholder at most once', async () => {
    const el = placeholder('ok')
    const load = vi.fn(registry.ok)
    handle = initDemos({ registry: { ok: load } })
    await reveal(el)
    await reveal(el)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('waits for prepare (fonts) before the first mount', async () => {
    const el = placeholder('ok')
    let release!: () => void
    const prepare = () => new Promise<void>((r) => (release = r))
    handle = initDemos({ registry, prepare })
    await reveal(el)
    expect(el.dataset.demoState).toBeUndefined()
    await act(async () => {
      release()
      await flush()
    })
    expect(el.dataset.demoState).toBe('mounted')
  })

  it('leaves an unknown demo name on its poster', async () => {
    const el = placeholder('missing')
    handle = initDemos({ registry })
    await reveal(el)
    expect(el.dataset.demoState).toBeUndefined()
    expect(el.querySelector('.weave-demo__stage')).toBeNull()
  })

  it('marks a demo that fails to load and keeps the poster', async () => {
    const el = placeholder('boom')
    handle = initDemos({ registry: { boom: async () => Promise.reject(new Error('x')) } })
    await reveal(el)
    expect(el.dataset.demoState).toBe('failed')
    expect(el.querySelector('img')).not.toBeNull()
  })

  it('swaps the poster to the dark pair before the demo mounts', () => {
    document.documentElement.classList.add('dt-theme-dark')
    const el = placeholder('ok')
    el.querySelector('img')!.setAttribute('src', 'poster-light.png')
    handle = initDemos({ registry })
    expect(el.querySelector('img')?.getAttribute('src')).toBe('poster-dark.png')
  })

  it('follows the docs theme at mount and on toggle without remounting', async () => {
    document.documentElement.classList.add('dt-theme-dark')
    const el = placeholder('ok')
    handle = initDemos({ registry })
    await reveal(el)
    const host = el.querySelector('.weave-demo__stage')
    expect(el.querySelector('[data-testid="demo"]')?.textContent).toBe('demo:dark')
    await act(async () => {
      document.documentElement.classList.replace('dt-theme-dark', 'dt-theme-light')
      await flush()
    })
    expect(el.querySelector('[data-testid="demo"]')?.textContent).toBe('demo:light')
    expect(el.querySelector('.weave-demo__stage')).toBe(host)
  })
})

describe('syncPoster', () => {
  const block = (src: string) => {
    const el = document.createElement('div')
    el.innerHTML = `<div class="content"><img src="${src}" alt=""></div>`
    return el
  }

  it('points the poster at its dark sibling in the dark theme and back', () => {
    const el = block('../images/rect-poster-light.png')
    syncPoster(el, 'dark')
    expect(el.querySelector('img')?.getAttribute('src')).toBe('../images/rect-poster-dark.png')
    syncPoster(el, 'light')
    expect(el.querySelector('img')?.getAttribute('src')).toBe('../images/rect-poster-light.png')
  })

  it('leaves a poster that does not follow the naming pair alone', () => {
    const el = block('../images/rect.png')
    syncPoster(el, 'dark')
    expect(el.querySelector('img')?.getAttribute('src')).toBe('../images/rect.png')
  })
})

describe('currentTheme', () => {
  it('is light unless the dark class is present', () => {
    expect(currentTheme()).toBe('light')
    document.documentElement.classList.add('dt-theme-dark')
    expect(currentTheme()).toBe('dark')
  })
})
