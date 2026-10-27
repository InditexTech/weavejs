// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Run with: node --test .github/scripts/changelog-from-prs.test.mjs

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyEntries,
  buildEntries,
  compareWithReleased,
  createGitHubClient,
  formatEntry,
  normalizeTitle,
  pullRequestsForCommits,
  releasedSection,
  renderPullRequestReport,
  sectionFor,
} from './changelog-from-prs.mjs';

const REPO = 'InditexTech/weavejs';

function issue(number, title, labels = []) {
  return { number, title, labels, repo: REPO, url: `https://github.com/${REPO}/issues/${number}` };
}

function pr(number, issues, { labels = [], author = 'someone', mergedAt = '2026-10-01T00:00:00Z', base = 'main' } = {}) {
  return {
    number,
    url: `https://github.com/${REPO}/pull/${number}`,
    merged: true,
    mergedAt,
    baseRefName: base,
    headRefOid: 'abc123',
    author,
    labels,
    issues,
  };
}

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

## [5.7.1] - 2026-10-27

### Fixed

- [#1246](https://github.com/InditexTech/weavejs/issues/1246) Old entry

[Unreleased]: https://github.com/InditexTech/weavejs/compare/5.7.1...HEAD
`;

describe('sectionFor', () => {
  it('applies the rules in order, first match wins', () => {
    assert.deepEqual(sectionFor(['bug', 'security']), { section: 'Security', guessed: false });
    assert.deepEqual(sectionFor(['enhancement', 'bug']), { section: 'Fixed', guessed: false });
    assert.deepEqual(sectionFor(['kind/feature']), { section: 'Added', guessed: false });
    assert.deepEqual(sectionFor(['Enhancement']), { section: 'Added', guessed: false });
  });

  it('falls back to Changed and flags the guess', () => {
    assert.deepEqual(sectionFor([]), { section: 'Changed', guessed: true });
    assert.deepEqual(sectionFor(['documentation']), { section: 'Changed', guessed: true });
  });
});

describe('normalizeTitle / formatEntry', () => {
  it('keeps the title verbatim apart from whitespace', () => {
    assert.equal(normalizeTitle('  Feature request: Shift  and\tAlt​ '), 'Feature request: Shift and Alt');
    assert.equal(normalizeTitle('Use `require()` on Node 20.19+'), 'Use `require()` on Node 20.19+');
  });

  it('formats the line, qualifying issues from other repositories', () => {
    assert.equal(
      formatEntry(issue(12, 'Title'), REPO),
      '- [#12](https://github.com/InditexTech/weavejs/issues/12) Title'
    );
    assert.equal(
      formatEntry({ ...issue(3, 'Other'), repo: 'InditexTech/docouture', url: 'https://github.com/InditexTech/docouture/issues/3' }, REPO),
      '- [InditexTech/docouture#3](https://github.com/InditexTech/docouture/issues/3) Other'
    );
  });
});

describe('buildEntries', () => {
  it('gives one line per closed issue, deduplicated across PRs', () => {
    const { entries, warnings } = buildEntries(
      [pr(2, [issue(10, 'Ten', ['bug']), issue(11, 'Eleven', ['enhancement'])]), pr(1, [issue(10, 'Ten', ['bug'])])],
      { repo: REPO }
    );
    assert.deepEqual(
      entries.map((entry) => [entry.section, entry.pr, entry.line]),
      [
        ['Fixed', 2, '- [#10](https://github.com/InditexTech/weavejs/issues/10) Ten'],
        ['Added', 2, '- [#11](https://github.com/InditexTech/weavejs/issues/11) Eleven'],
      ]
    );
    assert.deepEqual(warnings, []);
  });

  it('warns about PRs without a linked issue and guessed sections', () => {
    const { entries, warnings } = buildEntries([pr(1, []), pr(2, [issue(5, 'Five')])], { repo: REPO });
    assert.equal(entries.length, 1);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /PR #1 has no linked issue/);
    assert.match(warnings[1], /Section guessed for #5/);
  });

  it('skip-release waives the link rule but keeps the entries of linked issues', () => {
    const { entries, warnings, bypassed } = buildEntries(
      [pr(1, [], { labels: ['skip-release'] }), pr(2, [issue(7, 'Seven', ['bug'])], { labels: ['skip-release'] })],
      { repo: REPO }
    );
    assert.deepEqual(entries.map((entry) => entry.pr), [2]);
    assert.deepEqual(warnings, []);
    assert.deepEqual(bypassed.map((item) => item.pr), [1]);
  });

  it('exempts Dependabot', () => {
    for (const author of ['dependabot', 'dependabot[bot]']) {
      const { warnings, bypassed } = buildEntries([pr(1, [], { author })], { repo: REPO });
      assert.deepEqual(warnings, []);
      assert.equal(bypassed.length, 1);
    }
  });
});

describe('applyEntries', () => {
  const entries = buildEntries(
    [pr(2, [issue(20, 'Twenty', ['bug']), issue(21, 'Twenty-one', ['security'])]), pr(1, [issue(19, 'Nineteen', ['enhancement'])])],
    { repo: REPO }
  ).entries;

  it('writes only the [Unreleased] section, in Keep a Changelog order', () => {
    const { text, added } = applyEntries(CHANGELOG, entries);
    assert.equal(added.length, 3);
    assert.equal(
      text,
      CHANGELOG.replace(
        '## [Unreleased]\n\n',
        `## [Unreleased]

### Added

- [#19](https://github.com/InditexTech/weavejs/issues/19) Nineteen

### Fixed

- [#20](https://github.com/InditexTech/weavejs/issues/20) Twenty

### Security

- [#21](https://github.com/InditexTech/weavejs/issues/21) Twenty-one

`
      )
    );
  });

  it('is idempotent', () => {
    const once = applyEntries(CHANGELOG, entries).text;
    const twice = applyEntries(once, entries);
    assert.equal(twice.text, once);
    assert.equal(twice.added.length, 0);
    assert.equal(twice.alreadyListed.length, 3);
  });

  it('keeps manual lines and does not repeat an issue already listed', () => {
    const manual = CHANGELOG.replace(
      '## [Unreleased]\n',
      `## [Unreleased]

### Fixed

- [#20](https://github.com/InditexTech/weavejs/issues/20) Hand-written wording
- Manual line without an issue
`
    );
    const { text, added, alreadyListed } = applyEntries(manual, entries);
    assert.deepEqual(alreadyListed.map((entry) => entry.url), ['https://github.com/InditexTech/weavejs/issues/20']);
    assert.equal(added.length, 2);
    assert.match(
      text,
      /### Added\n\n- \[#19\].*\n\n### Fixed\n\n- \[#20\]\(.*\) Hand-written wording\n- Manual line without an issue\n\n### Security\n\n- \[#21\]/
    );
    assert.ok(text.endsWith(manual.slice(manual.indexOf('## [5.7.1]'))));
  });

  it('works when [Unreleased] is the last section', () => {
    const { text } = applyEntries('# Changelog\n\n## [Unreleased]\n', entries.slice(0, 1));
    assert.equal(text, '# Changelog\n\n## [Unreleased]\n\n### Fixed\n\n- [#20](https://github.com/InditexTech/weavejs/issues/20) Twenty\n');
  });

  it('leaves the text untouched when there is nothing to add', () => {
    assert.equal(applyEntries(CHANGELOG, []).text, CHANGELOG);
  });

  it('only counts the leading link of a list item as an issue entry', () => {
    const mentioned = CHANGELOG.replace(
      '## [Unreleased]\n',
      '## [Unreleased]\n\n### Changed\n\n- Refactor X (see [#20](https://github.com/InditexTech/weavejs/issues/20))\n'
    );
    const { added } = applyEntries(mentioned, entries);
    assert.ok(added.some((entry) => entry.url.endsWith('/issues/20')));

    const sneaky = buildEntries(
      [pr(1, [issue(30, 'Breaks [#31](https://github.com/InditexTech/weavejs/issues/31)', ['bug']), issue(31, 'Real', ['bug'])])],
      { repo: REPO }
    ).entries;
    const { text } = applyEntries(CHANGELOG, sneaky);
    assert.match(text, /- \[#31\]\(https:\/\/github.com\/InditexTech\/weavejs\/issues\/31\) Real/);
  });

  it('refuses CRLF changelogs', () => {
    assert.throws(() => applyEntries(CHANGELOG.replace(/\n/g, '\r\n'), entries), /CRLF/);
  });

  it('fails without an [Unreleased] heading', () => {
    assert.throws(() => applyEntries('# Changelog\n\n## [1.0.0]\n', entries), /no "## \[Unreleased\]" heading/);
  });
});

describe('releasedSection / compareWithReleased', () => {
  it('reports differences with a hand-written section', () => {
    const released = releasedSection(CHANGELOG, '5.7.1');
    const generated = buildEntries(
      [pr(1, [issue(1246, 'Old entry', ['enhancement']), issue(1247, 'New', ['bug'])])],
      { repo: REPO }
    ).entries;
    const comparison = compareWithReleased(generated, released, '5.7.1');
    assert.equal(comparison.onlyGenerated.length, 1);
    assert.equal(comparison.onlyWritten.length, 0);
    assert.equal(comparison.moved.length, 1);
    assert.match(comparison.moved[0], /\(Added vs Fixed\)$/);
  });
});

describe('renderPullRequestReport', () => {
  it('explains how to link an issue, with the sidebar hint off the default branch', () => {
    const report = renderPullRequestReport({ pr: pr(1, [], { base: 'main-5' }), result: buildEntries([pr(1, [])], { repo: REPO }), enforce: true });
    assert.match(report, /:x: This PR is not linked to an issue/);
    assert.match(report, /use the Development sidebar/);
    assert.match(report, /_As of abc123._/);
  });

  it('states both effects of skip-release', () => {
    const bare = pr(1, [], { labels: ['skip-release'] });
    assert.match(
      renderPullRequestReport({ pr: bare, result: buildEntries([bare], { repo: REPO }), enforce: false }),
      /publishes no release and adds no changelog entry/
    );
    const linked = pr(2, [issue(9, 'Nine', ['bug'])], { labels: ['skip-release'] });
    const report = renderPullRequestReport({ pr: linked, result: buildEntries([linked], { repo: REPO }), enforce: false });
    assert.match(report, /publishes no release\. These entries go into the next release/);
    assert.match(report, /\*\*Fixed\*\*\n\n- \[#9\]/);
  });
});

describe('createGitHubClient', () => {
  const prNode = {
    number: 4,
    url: 'u',
    merged: true,
    mergedAt: '2026-10-01T00:00:00Z',
    baseRefName: 'main',
    headRefOid: 'sha',
    author: { login: 'dev' },
    labels: { nodes: [{ name: 'skip-release' }] },
    closingIssuesReferences: {
      nodes: [{ number: 3, title: 'T', url: 'i', repository: { nameWithOwner: REPO }, labels: { nodes: [{ name: 'bug' }] } }],
    },
  };

  function response(status, body, headers = {}) {
    return { status, ok: status >= 200 && status < 300, headers: new Map(Object.entries(headers)), json: async () => body, text: async () => JSON.stringify(body) };
  }

  it('retries transient failures with backoff', async () => {
    const delays = [];
    const replies = [
      () => Promise.reject(new TypeError('socket hang up')),
      () => response(502, {}),
      () => response(200, { errors: [{ type: 'RATE_LIMITED', message: 'slow down' }] }),
      () => response(200, { data: { repository: { pullRequest: prNode } } }),
    ];
    const client = createGitHubClient({
      token: 't',
      repo: REPO,
      fetchImpl: async () => replies.shift()(),
      sleep: async (ms) => delays.push(ms),
      baseDelayMs: 10,
    });
    const result = await client.pullRequest(4);
    assert.deepEqual(delays, [10, 20, 40]);
    assert.deepEqual(result.labels, ['skip-release']);
    assert.deepEqual(result.issues, [{ number: 3, title: 'T', url: 'i', repo: REPO, labels: ['bug'] }]);
  });

  it('gives up after the last retry and does not retry real errors', async () => {
    const flaky = createGitHubClient({ token: 't', repo: REPO, fetchImpl: async () => response(503, {}), sleep: async () => {}, retries: 2 });
    await assert.rejects(flaky.pullRequest(4), /responded 503/);

    let calls = 0;
    const broken = createGitHubClient({
      token: 't',
      repo: REPO,
      fetchImpl: async () => {
        calls++;
        return response(200, { errors: [{ message: 'Field does not exist' }] });
      },
      sleep: async () => {},
    });
    await assert.rejects(broken.pullRequest(4), /Field does not exist/);
    assert.equal(calls, 1);
  });

  it('fails instead of truncating a paginated list', async () => {
    const client = createGitHubClient({
      token: 't',
      repo: REPO,
      fetchImpl: async () =>
        response(200, {
          data: {
            repository: {
              pullRequest: { ...prNode, closingIssuesReferences: { ...prNode.closingIssuesReferences, pageInfo: { hasNextPage: true } } },
            },
          },
        }),
    });
    await assert.rejects(client.pullRequest(4), /Too many issues closed by PR #4/);
  });

  it('requires a token', () => {
    assert.throws(() => createGitHubClient({ token: '', repo: REPO }), /GITHUB_TOKEN/);
  });
});

describe('pullRequestsForCommits', () => {
  it('keeps merged PRs into the branch, newest first, and reports commits without one', async () => {
    const byCommit = {
      a: [pr(1, [], { mergedAt: '2026-10-01T00:00:00Z' })],
      b: [pr(2, [], { mergedAt: '2026-10-03T00:00:00Z' }), { ...pr(3, []), merged: false }],
      c: [pr(4, [], { base: 'main-5' })],
      d: [pr(2, [], { mergedAt: '2026-10-03T00:00:00Z' })],
    };
    const client = { commitPullRequests: async (sha) => byCommit[sha] };
    const commits = ['a', 'b', 'c', 'd'].map((sha) => ({ sha, subject: sha }));
    const { prs, orphanCommits } = await pullRequestsForCommits(client, commits, { branch: 'main' });
    assert.deepEqual(prs.map((item) => item.number), [2, 1]);
    assert.deepEqual(orphanCommits.map((commit) => commit.sha), ['c']);
  });
});
