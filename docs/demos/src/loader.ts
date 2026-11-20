// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Loaded on every docs page, so it stays tiny: React and the demos are only
// fetched when the page actually has a placeholder.
const start = () => {
  if (document.querySelector('.weave-demo')) void import('./boot')
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()
