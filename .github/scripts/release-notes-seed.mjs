#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Seeds a release-notes page from the `## [X.Y.Z]` section of
// code/CHANGELOG.md, so writing the notes starts from an edit, not a blank page.
//
//   node .github/scripts/release-notes-seed.mjs 5.9.0            # print to stdout
//   node .github/scripts/release-notes-seed.mjs 5.9.0 --write    # write the page
//
// Added and Changed entries become `===` sections under `== Changes`; Fixed and
// Security entries become bullet lists. Every `TODO` is a place for a human to
// write. `--write` refuses to overwrite an existing page.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHANGELOG = resolve(ROOT, 'code/CHANGELOG.md');
const PAGES_DIR = resolve(ROOT, 'docs/src/modules/main/pages/release-notes');

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ENTRY = /^- \[#(\d+)\]\(([^)]+)\) (.*)$/;

export function parseRelease(changelog, version) {
  const lines = changelog.split('\n');
  const heading = `## [${version}]`;
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) {
    return null;
  }

  const date = /- (\d{4})-(\d{2})-(\d{2})/.exec(lines[start]);
  const sections = {};
  let current = null;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) {
      break;
    }
    if (line.startsWith('### ')) {
      current = line.slice(4).trim();
      sections[current] = [];
      continue;
    }
    const entry = ENTRY.exec(line);
    if (entry && current) {
      sections[current].push({ number: entry[1], url: entry[2], title: entry[3] });
    }
  }

  return {
    version,
    date: date ? { year: Number(date[1]), month: Number(date[2]), day: Number(date[3]) } : null,
    sections,
  };
}

export function formatDate(date) {
  if (!date) {
    return 'TODO';
  }
  return `${MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
}

function link(entry) {
  return `${entry.url}[${entry.url}]`;
}

export function renderSkeleton(release) {
  const { version, date, sections } = release;
  const out = [];

  out.push(`= v${version}`);
  out.push(':description: TODO one-line summary of the release');
  out.push('');
  out.push('== TODO headline');
  out.push('');
  out.push(`*Release date:* ${formatDate(date)}`);
  out.push('');
  out.push('TODO short paragraph: what this release is about and who should care.');
  out.push('');

  const featured = [...(sections.Added ?? []), ...(sections.Changed ?? [])];
  if (featured.length > 0) {
    out.push('== Changes');
    out.push('');
    for (const entry of featured) {
      out.push(`=== ${entry.title}`);
      out.push('');
      out.push('TODO what changed for users, with a short example if it helps.');
      out.push('');
      out.push(link(entry));
      out.push('');
    }
  }

  for (const [name, heading] of [
    ['Fixed', 'Fixes'],
    ['Security', 'Security'],
    ['Notes', 'Notes'],
  ]) {
    const entries = sections[name] ?? [];
    if (entries.length === 0) {
      continue;
    }
    out.push(`== ${heading}`);
    out.push('');
    for (const entry of entries) {
      out.push(`* ${entry.title} (${link(entry)})`);
    }
    out.push('');
  }

  out.push('== Migration Steps');
  out.push('');
  out.push('TODO list upgrade steps, or delete this section if there are none.');

  return `${out.join('\n')}\n`;
}

function main(argv) {
  const [version] = argv.filter((arg) => !arg.startsWith('--'));
  const write = argv.includes('--write');
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('usage: release-notes-seed.mjs <X.Y.Z> [--write]');
    return 2;
  }

  const release = parseRelease(readFileSync(CHANGELOG, 'utf8'), version);
  if (!release) {
    console.error(`No "## [${version}]" section in code/CHANGELOG.md`);
    return 1;
  }

  const page = renderSkeleton(release);
  if (!write) {
    process.stdout.write(page);
    return 0;
  }

  const target = resolve(PAGES_DIR, `${version}.adoc`);
  if (existsSync(target)) {
    console.error(`${target} already exists; not overwriting`);
    return 1;
  }
  writeFileSync(target, page);
  console.log(`Wrote ${target}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
