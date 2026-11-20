// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createReadStream, existsSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Output lands in the Antora UI supplemental files, so the site serves it
// under `/_/js/demos/` (see supplemental-ui/partials/footer-scripts.hbs).
const outDir = fileURLToPath(new URL('../supplemental-ui/js/demos', import.meta.url))

const fontsDir = fileURLToPath(new URL('../supplemental-ui/fonts/', import.meta.url))

// Dev only: serve the site's self-hosted fonts at /fonts, as /_/fonts/ in the built site.
const devFonts = {
  name: 'weave-dev-fonts',
  configureServer(server: { middlewares: { use: (path: string, fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; statusCode: number; end: () => void } & NodeJS.WritableStream, next: () => void) => void) => void } }) {
    server.middlewares.use('/fonts', (req, res, next) => {
      const file = fontsDir + basename((req.url ?? '').split('?')[0])
      if (!existsSync(file)) return next()
      res.setHeader('Content-Type', 'font/woff2')
      createReadStream(file).pipe(res)
    })
  },
}

export default defineConfig({
  plugins: [react(), devFonts],
  publicDir: false,
  base: './',
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    target: 'es2022',
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: { loader: fileURLToPath(new URL('./src/loader.ts', import.meta.url)) },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: { environment: 'jsdom' },
})
