// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright-core'

export const launch = () => {
  const executablePath = process.env.CHROME_PATH
  return chromium.launch(executablePath ? { executablePath } : { channel: 'chrome' })
}

/**
 * Screenshots one element with an alpha channel. Stageshow's film.mjs --still is opaque.
 * `reduced` makes a Stage show its poster state. Returns { hasAlpha, transparentPixels }.
 */
export async function capturePoster(browser, { url, select = '#root', out, scale = 2, dark = false, reduced = false, wait = 500 }) {
  const context = await browser.newContext({
    deviceScaleFactor: Number(scale),
    colorScheme: dark ? 'dark' : 'light',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    viewport: { width: 1280, height: 900 },
  })
  try {
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: 'html,body{background:transparent!important}' })
    await page.waitForTimeout(Number(wait))
    const file = resolve(out)
    mkdirSync(dirname(file), { recursive: true })
    await page.locator(select).first().screenshot({ path: file, omitBackground: true })

    // PNG colour type 6 (RGBA) or 4 (grey + alpha) means the file carries an alpha channel.
    // A demo that fills its stage is fully opaque and the PNG may carry none.
    const buf = readFileSync(file)
    const hasAlpha = buf[25] === 6 || buf[25] === 4
    const transparentPixels = await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const px = ctx.getImageData(0, 0, img.width, img.height).data
      let n = 0
      for (let i = 3; i < px.length; i += 4) if (px[i] === 0) n++
      return n
    }, buf.toString('base64'))
    return { file, hasAlpha, transparentPixels }
  } finally {
    await context.close()
  }
}
