// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as path from 'node:path';
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';

const user = 'admin';
const pass = process.env.VERDACCIO_ADMIN_PASSWORD;

if (!pass || pass.length === 0) {
  console.error(
    '❌ Verdaccio setup: VERDACCIO_ADMIN_PASSWORD environment variable is not set'
  );
  process.exit(1);
}

const verdaccioPath = path.join(process.cwd(), 'verdaccio');
if (!fs.existsSync(verdaccioPath)) {
  fs.mkdirSync(verdaccioPath);
}
const storagePath = path.join(verdaccioPath, 'storage');
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath);
}

// Apache SHA-1: {SHA}<base64 hash>
const hash = createHash('sha1').update(pass).digest('base64');
const line = `${user}:{SHA}${hash}\n`;

fs.writeFileSync(
  path.join(process.cwd(), 'verdaccio', 'config', '.htpasswd'),
  line
);

console.log('✅ Verdaccio setup: .htpasswd created @ verdaccio/config/.htpasswd');
process.exit(0);
