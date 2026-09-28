// SPDX-FileCopyrightText: 2026 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'node:url';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);
export const cwd = process.cwd();
