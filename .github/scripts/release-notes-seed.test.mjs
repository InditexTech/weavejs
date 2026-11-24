// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Run with: node --test .github/scripts/release-notes-seed.test.mjs

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate, parseRelease, renderSkeleton } from './release-notes-seed.mjs';

const CHANGELOG = `# Changelog

## [Unreleased]

## [5.9.0] - 2026-11-12

### Added

- [#1232](https://github.com/InditexTech/weavejs/issues/1232) Add sticky note canvas primitive

### Fixed

- [#1294](https://github.com/InditexTech/weavejs/issues/1294) Server-side render fails with a video node

## [5.8.0] - 2026-11-11

### Added

- [#1262](https://github.com/InditexTech/weavejs/issues/1262) Text indentation
`;

describe('parseRelease', () => {
  it('reads the date and the entries of one section only', () => {
    const release = parseRelease(CHANGELOG, '5.9.0');
    assert.deepEqual(release.date, { year: 2026, month: 11, day: 12 });
    assert.equal(release.sections.Added.length, 1);
    assert.equal(release.sections.Added[0].number, '1232');
    assert.equal(release.sections.Fixed[0].title, 'Server-side render fails with a video node');
    assert.equal(release.sections.Added.some((entry) => entry.number === '1262'), false);
  });

  it('returns null for an unknown version', () => {
    assert.equal(parseRelease(CHANGELOG, '9.9.9'), null);
  });
});

describe('formatDate', () => {
  it('spells the month', () => {
    assert.equal(formatDate({ year: 2026, month: 6, day: 18 }), 'June 18, 2026');
  });
});

describe('renderSkeleton', () => {
  const page = renderSkeleton(parseRelease(CHANGELOG, '5.9.0'));

  it('starts with the version title and release date', () => {
    assert.match(page, /^= v5\.9\.0\n/);
    assert.match(page, /\*Release date:\* November 12, 2026/);
  });

  it('turns Added entries into === sections with the issue link', () => {
    assert.match(page, /=== Add sticky note canvas primitive/);
    assert.match(page, /https:\/\/github\.com\/InditexTech\/weavejs\/issues\/1232\[/);
  });

  it('lists Fixed entries as bullets', () => {
    assert.match(page, /== Fixes\n\n\* Server-side render fails with a video node/);
  });

  it('omits sections the release does not have', () => {
    assert.doesNotMatch(page, /== Security/);
  });
});
