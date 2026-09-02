#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Guards against a known failure mode of release-flow/keep-a-changelog-action's
// `bump` command: it parses the *entire* CHANGELOG.md into a markdown AST
// (via remark/micromark) and re-serializes the whole document on every run,
// not just the section it's actually updating.
//
// CommonMark requires a real ASCII space (or tab) between an ATX heading's
// `#` run and its text. If that space has silently become some other
// Unicode whitespace character (most commonly U+00A0 NO-BREAK SPACE, from
// pasting changelog text out of Word/Confluence/rich-text editors), the
// heading fails to parse as a heading at all — it's just a paragraph of text
// that happens to start with `#`. mdast-util-to-markdown's serializer then
// defensively backslash-escapes that leading `#` on the way back out (so the
// text can't be misread as a heading if the file is ever reparsed), turning
// `### Added` into `\### Added` — visibly broken, and once the invisible
// whitespace defect is in the file, every future release re-introduces the
// same corruption, because the action never sees a reason not to.
//
// This script does two things, both required to actually break that cycle:
//   1. Strip any stray line-start `\` the action left before an ATX heading
//      marker (and, defensively, a `\[` immediately following one — the
//      release-heading equivalent, e.g. `\## \[1.3.1]`).
//   2. Normalize invisible Unicode whitespace (NBSP and its relatives) back
//      to a plain space, so the *next* run's parse succeeds and the action
//      has nothing left to escape.
// Fixing only #1 without #2 just resets the same treadmill on every release.
//
// Used two ways:
//   - Release time (no flag): rewrite the file in place, and fail the step
//     if anything needed fixing — on purpose, so the defect gets fixed at
//     its source (a PR) instead of being silently re-patched forever.
//   - PR time (`--check`): same detection, but never writes; fails the
//     check if the file the PR is proposing already contains the defect.

import { readFileSync, writeFileSync } from 'node:fs';

// Zero-width / no-display characters: these carry no visual space at all,
// so they're stripped outright rather than replaced with a visible space.
const ZERO_WIDTH = /[\u200B\u200C\u200D\u2060\uFEFF]/g;

// Space-like characters other than the plain ASCII space (U+0020): replaced
// with a regular space. Covers NBSP (the one root cause proven in practice)
// plus the rest of Unicode's space-separator family, since any of them would
// break the same CommonMark "real space after #" rule the same way.
const SPACE_LIKE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

function stripStrayEscapes(text) {
  // `\### Added` -> `### Added`
  let out = text.replace(/^\\(#{1,6})/gm, '$1');
  // `\## \[1.3.1] - 2025-10-27` -> `## [1.3.1] - 2025-10-27`. Anchored to
  // immediately follow a heading marker at true line start, so a
  // legitimately escaped `\[` inside bullet body text (e.g. `\[alpha]` used
  // deliberately to display literal brackets) is never touched.
  out = out.replace(/^(#{1,6}[ \t]*)\\(\[)/gm, '$1$2');
  return out;
}

function normalizeInvisibleWhitespace(text) {
  return text.replace(ZERO_WIDTH, '').replace(SPACE_LIKE, ' ');
}

export function sanitize(text) {
  return normalizeInvisibleWhitespace(stripStrayEscapes(text));
}

function describeDiff(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const changed = [];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      changed.push({ line: i + 1, before: beforeLines[i], after: afterLines[i] });
    }
  }
  return changed;
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const path = args.find((arg) => !arg.startsWith('--'));

  if (!path) {
    console.error('usage: sanitize-changelog.mjs <path-to-changelog> [--check]');
    process.exit(2);
  }

  const before = readFileSync(path, 'utf8');
  const after = sanitize(before);

  if (before === after) {
    console.log(`${path}: clean, nothing to sanitize.`);
    return;
  }

  if (!checkOnly) {
    writeFileSync(path, after);
  }

  const changed = describeDiff(before, after);
  const verb = checkOnly ? 'introduces' : 'required sanitization for';
  const followUp = checkOnly
    ? ''
    : ' The file has been corrected on disk, but';
  console.log(
    `::error title=CHANGELOG.md invisible whitespace / escape artifacts::${path} ${verb} ` +
      `invisible whitespace and/or stray escape artifacts on ${changed.length} line(s).${followUp} ` +
      'this step fails on purpose so the defect gets fixed at its source instead of being ' +
      'silently re-patched on every release.'
  );
  for (const { line, before: b, after: a } of changed) {
    console.log(`  line ${line}:`);
    console.log(`    before: ${JSON.stringify(b)}`);
    console.log(`    after:  ${JSON.stringify(a)}`);
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
