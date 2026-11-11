#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Generates the `## [Unreleased]` entries of code/CHANGELOG.md from the
// issues that merged pull requests close, so contributors no longer edit the
// changelog by hand.
//
// The link between a PR and its issues is GitHub's *closing reference*: a
// closing keyword in the PR body (`Closes #N`) or the Development sidebar. A
// plain `#N` mention is not one. Each closed issue gives one line:
//
//   - [#N](https://github.com/<owner>/<repo>/issues/N) <issue title, verbatim>
//
// filed under a section picked from the issue labels (see SECTION_RULES).
// The title is read when the script runs, so renaming the issue before the
// release renames the entry, and relabelling it moves the entry.
//
// One script, two modes, sharing the same code so they cannot drift:
//
//   - PR mode (`--pr N`): read-only check and preview of a single pull
//     request. Reports the lines it would generate, their sections and any
//     warnings. Without a linked issue it warns, or fails with `--enforce`,
//     unless the PR is bypassed (`skip-release` label, or opened by
//     Dependabot).
//   - Range mode (default): maps every first-parent commit in `--from..--to`
//     to its merged pull requests and collects their closing issues. `--from`
//     defaults to the last release tag reachable from `--to`. Used by the
//     release job before `keep-a-changelog bump`, and with `--dry-run` to
//     validate the output against a released section by hand.
//
// With `--changelog <file>` (and no `--dry-run`) the lines are written into
// `## [Unreleased]` only: manual lines already there are kept, issues already
// listed there are not repeated, and the rest of the file is left untouched
// (checked before writing). Running it twice gives the same file.
//
// `skip-release` waives the linked-issue rule, it does not drop entries: most
// PRs are merged with it and released together by a later PR, so the issues
// they close still belong in that release. A bypassed PR without an issue
// simply gets no entry.
//
// Any API or git error exits non-zero, so the release job stops before
// `bump`, the commit and the tag.

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { normalizeInvisibleWhitespace } from './sanitize-changelog.mjs';

export const BYPASS_LABEL = 'skip-release';

// Dependabot is `dependabot[bot]` in REST payloads and `dependabot` in GraphQL.
const EXEMPT_AUTHORS = new Set(['dependabot', 'dependabot[bot]']);

// First match wins. Anything without one of these labels goes to
// FALLBACK_SECTION with a "section guessed" warning, never skipped silently.
export const SECTION_RULES = [
  { labels: ['security'], section: 'Security' },
  { labels: ['bug'], section: 'Fixed' },
  { labels: ['enhancement', 'kind/feature'], section: 'Added' },
];
export const FALLBACK_SECTION = 'Changed';

// Issues with these labels are out of scope for the changelog (tracking
// issues such as "Release docs X" get `internal`). They are listed in the
// report instead of the changelog, never dropped silently.
export const EXCLUDED_LABELS = ['internal', 'kind/internal'];

// Keep a Changelog order, used only to place a section that does not exist yet.
const SECTION_ORDER = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

const RELEASE_TAG_PATTERN = '[0-9]*';

export function sectionFor(labels) {
  const names = new Set(labels.map((label) => label.toLowerCase()));
  for (const rule of SECTION_RULES) {
    if (rule.labels.some((label) => names.has(label))) {
      return { section: rule.section, guessed: false };
    }
  }
  return { section: FALLBACK_SECTION, guessed: true };
}

// Verbatim apart from whitespace: NBSP and friends would trip
// sanitize-changelog.mjs at release time, and a newline would break the list.
export function normalizeTitle(title) {
  return normalizeInvisibleWhitespace(title).replace(/\s+/g, ' ').trim();
}

export function issueRef(issue, repo) {
  return issue.repo === repo ? `#${issue.number}` : `${issue.repo}#${issue.number}`;
}

export function formatEntry(issue, repo) {
  return `- [${issueRef(issue, repo)}](${issue.url}) ${normalizeTitle(issue.title)}`;
}

export function bypassReason(pr) {
  if (pr.labels.includes(BYPASS_LABEL)) {
    return `has the \`${BYPASS_LABEL}\` label`;
  }
  if (EXEMPT_AUTHORS.has(pr.author)) {
    return 'was opened by Dependabot';
  }
  return null;
}

// `prs` must be ordered newest merge first: entries keep that order.
export function buildEntries(prs, { repo }) {
  const entries = [];
  const warnings = [];
  const bypassed = [];
  const excluded = [];
  const seen = new Set();

  for (const pr of prs) {
    if (pr.issues.length === 0) {
      const reason = bypassReason(pr);
      if (reason) {
        bypassed.push({ pr: pr.number, reason });
      } else {
        warnings.push(`PR #${pr.number} has no linked issue, so it gets no changelog entry.`);
      }
      continue;
    }
    for (const issue of pr.issues) {
      const key = `${issue.repo}#${issue.number}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const outOfScope = issue.labels.find((label) => EXCLUDED_LABELS.includes(label.toLowerCase()));
      if (outOfScope) {
        excluded.push({ ref: issueRef(issue, repo), pr: pr.number, label: outOfScope });
        continue;
      }
      const { section, guessed } = sectionFor(issue.labels);
      if (guessed) {
        warnings.push(
          `Section guessed for ${issueRef(issue, repo)}: the issue has none of the labels ` +
            `${SECTION_RULES.flatMap((rule) => rule.labels).map((label) => `\`${label}\``).join(', ')}, ` +
            `so it is filed under ${FALLBACK_SECTION}. Label the issue to change it.`
        );
      }
      entries.push({
        section,
        guessed,
        pr: pr.number,
        ref: issueRef(issue, repo),
        url: issue.url,
        line: formatEntry(issue, repo),
      });
    }
  }

  return { entries, warnings, bypassed, excluded };
}

// Issue URL -> version of the newest released section listing it. With
// `olderThan`, only sections below `## [olderThan]` count, so a `--dry-run`
// of an already released range is compared with what came before it.
export function releasedUrls(text, { olderThan } = {}) {
  const urls = new Map();
  let version = null;
  let counting = olderThan === undefined;
  for (const line of text.split('\n')) {
    const heading = /^## \[([^\]]+)\]/.exec(line);
    if (heading) {
      version = heading[1].toLowerCase() === 'unreleased' ? null : heading[1];
      if (heading[1] === olderThan) {
        counting = true;
        version = null;
      }
      continue;
    }
    if (version && counting) {
      for (const url of listedUrls([line])) {
        if (!urls.has(url)) {
          urls.set(url, version);
        }
      }
    }
  }
  return urls;
}

// An issue closed again by a later PR (a follow-up fix) is not listed in a
// second release: the entry is skipped with a warning.
export function dropReleased(result, released) {
  const entries = [];
  for (const entry of result.entries) {
    const version = released.get(entry.url);
    if (version) {
      result.warnings.push(`${entry.ref} is already listed in the [${version}] release, so it is not listed again.`);
    } else {
      entries.push(entry);
    }
  }
  return { ...result, entries };
}

function findUnreleased(lines) {
  const start = lines.findIndex((line) => /^## \[Unreleased\]\s*$/i.test(line));
  if (start === -1) {
    throw new Error('The changelog has no "## [Unreleased]" heading.');
  }
  let end = lines.findIndex((line, index) => index > start && /^## /.test(line));
  if (end === -1) {
    end = lines.length;
  }
  return { start, end };
}

function trimBlankLines(lines) {
  let first = 0;
  let last = lines.length;
  while (first < last && lines[first].trim() === '') first++;
  while (last > first && lines[last - 1].trim() === '') last--;
  return lines.slice(first, last);
}

// Issue URLs of the entries in `lines`: only the leading `- [ref](url)` of a
// list item counts, so a link inside the text of another entry (or inside an
// issue title) is not mistaken for that issue's entry.
function listedUrls(lines) {
  const urls = [];
  for (const line of lines) {
    const match = /^- \[[^\]]*\]\(([^)\s]+)\)/.exec(line);
    if (match) {
      urls.push(match[1]);
    }
  }
  return urls;
}

// Writes `entries` into `## [Unreleased]`. Returns the new text plus which
// entries were added and which were already listed there.
export function applyEntries(text, entries) {
  if (text.includes('\r')) {
    throw new Error('The changelog has CRLF line endings; convert it to LF first.');
  }
  const lines = text.split('\n');
  const { start, end } = findUnreleased(lines);
  const body = lines.slice(start + 1, end);
  const listed = new Set(listedUrls(body));

  const added = [];
  const alreadyListed = [];
  for (const entry of entries) {
    (listed.has(entry.url) ? alreadyListed : added).push(entry);
  }
  if (added.length === 0) {
    return { text, added, alreadyListed };
  }

  const preamble = [];
  const sections = [];
  let current = null;
  for (const line of body) {
    const heading = /^### (.+?)\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1], lines: [] };
      sections.push(current);
    } else {
      (current ? current.lines : preamble).push(line);
    }
  }

  for (const entry of added) {
    let section = sections.find((candidate) => candidate.name.toLowerCase() === entry.section.toLowerCase());
    if (!section) {
      section = { name: entry.section, lines: [] };
      const rank = SECTION_ORDER.indexOf(entry.section);
      const before = sections.findIndex((candidate) => SECTION_ORDER.indexOf(candidate.name) > rank);
      sections.splice(before === -1 ? sections.length : before, 0, section);
    }
    section.lines = [...trimBlankLines(section.lines), entry.line];
  }

  const blocks = [];
  const intro = trimBlankLines(preamble);
  if (intro.length > 0) {
    blocks.push(intro.join('\n'));
  }
  for (const section of sections) {
    const sectionLines = trimBlankLines(section.lines);
    blocks.push(sectionLines.length > 0 ? `### ${section.name}\n\n${sectionLines.join('\n')}` : `### ${section.name}`);
  }

  const head = lines.slice(0, start + 1).join('\n');
  const tail = lines.slice(end).join('\n');
  const result = tail === '' ? `${head}\n\n${blocks.join('\n\n')}\n` : `${head}\n\n${blocks.join('\n\n')}\n\n${tail}`;

  assertOnlyUnreleasedChanged(text, result, added);
  return { text: result, added, alreadyListed };
}

// Guard for "an unexpected result must stop the release": everything outside
// `## [Unreleased]` is byte-identical, and every added entry is there once.
function assertOnlyUnreleasedChanged(before, after, added) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const old = findUnreleased(beforeLines);
  const now = findUnreleased(afterLines);
  const same = (a, b) => a.length === b.length && a.every((line, index) => line === b[index]);
  if (!same(beforeLines.slice(0, old.start + 1), afterLines.slice(0, now.start + 1))) {
    throw new Error('Refusing to write: the text before "## [Unreleased]" would change.');
  }
  if (!same(beforeLines.slice(old.end), afterLines.slice(now.end))) {
    throw new Error('Refusing to write: the text after the "## [Unreleased]" section would change.');
  }
  const urls = listedUrls(afterLines.slice(now.start + 1, now.end));
  for (const entry of added) {
    if (urls.filter((url) => url === entry.url).length !== 1) {
      throw new Error(`Refusing to write: ${entry.url} is not listed exactly once in "## [Unreleased]".`);
    }
  }
}

// Lines of the `## [<version>]` section, used by `--dry-run` to compare.
export function releasedSection(text, version) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) {
    return null;
  }
  let end = lines.findIndex((line, index) => index > start && /^## /.test(line));
  if (end === -1) {
    end = lines.length;
  }
  const entries = new Map();
  let section = null;
  for (const line of lines.slice(start + 1, end)) {
    const heading = /^### (.+?)\s*$/.exec(line);
    if (heading) {
      section = heading[1];
    } else if (line.startsWith('- ')) {
      entries.set(line, section);
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// GitHub API

const PR_FIELDS = `
  number
  url
  merged
  mergedAt
  baseRefName
  headRefOid
  author { login }
  labels(first: 100) { pageInfo { hasNextPage } nodes { name } }
  closingIssuesReferences(first: 50) {
    pageInfo { hasNextPage }
    nodes {
      number
      title
      url
      repository { nameWithOwner }
      labels(first: 100) { pageInfo { hasNextPage } nodes { name } }
    }
  }
`;

const PR_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) { ${PR_FIELDS} }
  }
}`;

const COMMIT_QUERY = `query($owner: String!, $name: String!, $oid: GitObjectID!) {
  repository(owner: $owner, name: $name) {
    object(oid: $oid) {
      ... on Commit {
        associatedPullRequests(first: 20) { pageInfo { hasNextPage } nodes { ${PR_FIELDS} } }
      }
    }
  }
}`;

// The limits are far above real use; hitting one fails instead of silently
// dropping an issue or a label that picks the section.
function assertComplete(connection, what, field) {
  if (connection.pageInfo?.hasNextPage) {
    throw new Error(
      `Too many ${what} to read in one page, so the changelog would be incomplete. Nothing was written ` +
        'and, in the release job, nothing was tagged or published. Raise the `first:` limit of ' +
        `\`${field}\` in .github/scripts/changelog-from-prs.mjs and run the workflow again.`
    );
  }
  return connection.nodes;
}

function toPullRequest(node) {
  assertComplete(node.labels, `labels on PR #${node.number}`, 'labels');
  assertComplete(node.closingIssuesReferences, `issues closed by PR #${node.number}`, 'closingIssuesReferences');
  for (const issue of node.closingIssuesReferences.nodes) {
    assertComplete(issue.labels, `labels on issue ${issue.url}`, 'labels');
  }
  return {
    number: node.number,
    url: node.url,
    merged: node.merged,
    mergedAt: node.mergedAt,
    baseRefName: node.baseRefName,
    headRefOid: node.headRefOid,
    author: node.author?.login ?? null,
    labels: node.labels.nodes.map((label) => label.name),
    issues: node.closingIssuesReferences.nodes.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      repo: issue.repository.nameWithOwner,
      labels: issue.labels.nodes.map((label) => label.name),
    })),
  };
}

class RetryableError extends Error {}

export function createGitHubClient({
  token,
  repo,
  endpoint = process.env.GITHUB_GRAPHQL_URL || 'https://api.github.com/graphql',
  fetchImpl = globalThis.fetch,
  retries = 4,
  baseDelayMs = 1000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  if (!token) {
    throw new Error('Set GITHUB_TOKEN (or GH_TOKEN) to read pull requests and issues.');
  }
  const [owner, name] = repo.split('/');

  async function attempt(query, variables) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          authorization: `bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'weavejs-changelog-from-prs',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      throw new RetryableError(`GitHub API request failed: ${error.message}`);
    }
    const rateLimited =
      response.status === 403 &&
      (response.headers.get('retry-after') !== null || response.headers.get('x-ratelimit-remaining') === '0');
    if (response.status >= 500 || response.status === 429 || rateLimited) {
      throw new RetryableError(`GitHub API responded ${response.status}.`);
    }
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}: ${await response.text()}`);
    }
    const payload = await response.json();
    if (payload.errors?.length) {
      const message = payload.errors.map((error) => error.message).join('; ');
      if (payload.errors.some((error) => error.type === 'RATE_LIMITED')) {
        throw new RetryableError(`GitHub API rate limit: ${message}`);
      }
      throw new Error(`GitHub API error: ${message}`);
    }
    return payload.data;
  }

  async function graphql(query, variables) {
    for (let tries = 0; ; tries++) {
      try {
        return await attempt(query, { owner, name, ...variables });
      } catch (error) {
        if (!(error instanceof RetryableError) || tries >= retries) {
          throw error;
        }
        const delay = baseDelayMs * 2 ** tries;
        console.error(`${error.message} Retrying in ${delay} ms (${tries + 1}/${retries}).`);
        await sleep(delay);
      }
    }
  }

  return {
    async pullRequest(number) {
      const data = await graphql(PR_QUERY, { number });
      const node = data.repository?.pullRequest;
      if (!node) {
        throw new Error(`Pull request #${number} not found in ${repo}.`);
      }
      return toPullRequest(node);
    },
    async commitPullRequests(oid) {
      const data = await graphql(COMMIT_QUERY, { oid });
      const commit = data.repository?.object;
      if (!commit?.associatedPullRequests) {
        throw new Error(`Commit ${oid} not found in ${repo}.`);
      }
      return assertComplete(commit.associatedPullRequests, `pull requests for commit ${oid}`, 'associatedPullRequests').map(toPullRequest);
    },
  };
}

// Merged PRs behind the first-parent commits of the range, newest merge first.
export async function pullRequestsForCommits(client, commits, { branch }) {
  const prs = new Map();
  const orphanCommits = [];
  for (const commit of commits) {
    const merged = (await client.commitPullRequests(commit.sha)).filter(
      (pr) => pr.merged && pr.baseRefName === branch
    );
    if (merged.length === 0) {
      orphanCommits.push(commit);
    }
    for (const pr of merged) {
      prs.set(pr.number, pr);
    }
  }
  const ordered = [...prs.values()].sort((a, b) => (a.mergedAt < b.mergedAt ? 1 : a.mergedAt > b.mergedAt ? -1 : 0));
  return { prs: ordered, orphanCommits };
}

// ---------------------------------------------------------------------------
// git

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

export function lastReleaseTag(ref) {
  try {
    return git(['describe', '--tags', '--abbrev=0', `--match=${RELEASE_TAG_PATTERN}`, ref]);
  } catch {
    throw new Error(`No release tag matching "${RELEASE_TAG_PATTERN}" is reachable from ${ref}.`);
  }
}

function firstParentCommits(from, to) {
  const out = git(['log', '--first-parent', '--format=%H%x09%s', `${from}..${to}`]);
  return out === ''
    ? []
    : out.split('\n').map((line) => {
        const [sha, ...subject] = line.split('\t');
        return { sha, subject: subject.join('\t') };
      });
}

function defaultRepo() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  const url = git(['remote', 'get-url', 'origin']);
  const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  if (!match) {
    throw new Error(`Cannot infer the repository from origin (${url}); pass --repo owner/name.`);
  }
  return match[1];
}

// ---------------------------------------------------------------------------
// Report

function renderEntries(entries) {
  const out = [];
  for (const section of [...SECTION_ORDER, ...new Set(entries.map((entry) => entry.section))]) {
    const lines = entries.filter((entry) => entry.section === section);
    if (lines.length > 0 && !out.includes(`**${section}**`)) {
      out.push(`**${section}**`, '', ...lines.map((entry) => entry.line), '');
    }
  }
  return out;
}

function renderExcluded(result) {
  if (result.excluded.length === 0) {
    return [];
  }
  return [
    `**Out of scope** (labelled ${EXCLUDED_LABELS.map((label) => `\`${label}\``).join(' or ')}, no entry)`,
    '',
    ...result.excluded.map((item) => `- ${item.ref} (\`${item.label}\`, PR #${item.pr})`),
    '',
  ];
}

export function renderPullRequestReport({ pr, result, enforce }) {
  const out = ['### Changelog', ''];
  const reason = bypassReason(pr);
  const skipRelease = pr.labels.includes(BYPASS_LABEL);
  if (pr.issues.length === 0 && reason) {
    out.push(
      skipRelease
        ? `This PR has the \`${BYPASS_LABEL}\` label and no linked issue: merging it publishes no release and adds no changelog entry.`
        : `This PR ${reason}, so it is exempt from the linked-issue rule and gets no changelog entry.`
    );
  } else if (pr.issues.length === 0) {
    out.push(
      `${enforce ? ':x:' : ':warning:'} This PR is not linked to an issue, so it would get no changelog entry.`,
      '',
      'Add `Closes #<issue>` to the PR description, or link the issue from the Development sidebar. ' +
        'A plain `#<issue>` mention does not count.' +
        (pr.baseRefName === 'main'
          ? ''
          : ` GitHub only reads closing keywords on PRs to the default branch: for \`${pr.baseRefName}\`, use the Development sidebar.`),
      '',
      `A maintainer can waive the rule with the \`${BYPASS_LABEL}\` label, which also skips the release on merge.`
    );
  } else if (result.entries.length === 0) {
    out.push('The issues this PR closes get no changelog entry (see below).', '');
  } else {
    out.push(
      skipRelease
        ? `This PR has the \`${BYPASS_LABEL}\` label: merging it publishes no release. These entries go into the next release:`
        : 'When this PR is released, `code/CHANGELOG.md` gets:',
      '',
      ...renderEntries(result.entries)
    );
    out.push('The text is the issue title, read at release time: edit the issue title or labels to change it.');
  }
  if (result.excluded.length > 0) {
    out.push('', ...renderExcluded(result));
  }
  const warnings = result.warnings.filter((warning) => !warning.startsWith(`PR #${pr.number} has no linked issue`));
  if (warnings.length > 0) {
    out.push('', '**Warnings**', '', ...warnings.map((warning) => `- ${warning}`));
  }
  out.push('', `_As of ${pr.headRefOid}._`, '');
  return out.join('\n');
}

export function renderRangeReport({ from, to, prs, result, applied, orphanCommits, comparison }) {
  const out = [`### Changelog entries for ${from}..${to}`, ''];
  out.push(
    `${prs.length} merged pull request(s), ${result.entries.length} entr${result.entries.length === 1 ? 'y' : 'ies'}.`,
    ''
  );
  out.push(...(result.entries.length > 0 ? renderEntries(result.entries) : ['_No entries._', '']));
  if (applied?.alreadyListed.length) {
    out.push('**Already listed in [Unreleased], kept as written**', '');
    out.push(...applied.alreadyListed.map((entry) => `- ${entry.url}`), '');
  }
  if (result.warnings.length > 0) {
    out.push('**Warnings**', '', ...result.warnings.map((warning) => `- ${warning}`), '');
  }
  out.push(...renderExcluded(result));
  if (result.bypassed.length > 0) {
    out.push('**Bypassed pull requests**', '', ...result.bypassed.map((item) => `- #${item.pr} ${item.reason}`), '');
  }
  if (orphanCommits.length > 0) {
    out.push('**Commits without a merged pull request**', '');
    out.push(...orphanCommits.map((commit) => `- ${commit.sha.slice(0, 8)} ${commit.subject}`), '');
  }
  if (comparison) {
    out.push(`**Compared with the hand-written [${comparison.version}] section**`, '');
    if (comparison.onlyGenerated.length === 0 && comparison.onlyWritten.length === 0 && comparison.moved.length === 0) {
      out.push('Identical.', '');
    }
    for (const [title, items] of [
      ['Only generated', comparison.onlyGenerated],
      ['Only hand-written', comparison.onlyWritten],
      ['Different section (generated vs hand-written)', comparison.moved],
    ]) {
      if (items.length > 0) {
        out.push(`_${title}:_`, '', ...items.map((item) => `- ${item}`), '');
      }
    }
  }
  return out.join('\n');
}

export function compareWithReleased(entries, released, version) {
  const generated = new Map(entries.map((entry) => [entry.line, entry.section]));
  const onlyGenerated = [];
  const moved = [];
  for (const [line, section] of generated) {
    if (!released.has(line)) {
      onlyGenerated.push(`${line} (${section})`);
    } else if (released.get(line) !== section) {
      moved.push(`${line} (${section} vs ${released.get(line)})`);
    }
  }
  const onlyWritten = [...released].filter(([line]) => !generated.has(line)).map(([line, section]) => `${line} (${section})`);
  return { version, onlyGenerated, onlyWritten, moved };
}

// ---------------------------------------------------------------------------
// CLI

function annotate(level, message) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.log(`::${level}::${message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
  }
}

function writeReport(path, report) {
  console.log(report);
  if (path) {
    appendFileSync(path, `${report}\n`);
  }
}

function readChangelog(path) {
  if (!existsSync(path)) {
    throw new Error(`${path} does not exist.`);
  }
  return readFileSync(path, 'utf8');
}

function applyToChangelog(path, entries, dryRun) {
  const before = readFileSync(path, 'utf8');
  const applied = applyEntries(before, entries);
  if (!dryRun && applied.text !== before) {
    writeFileSync(path, applied.text);
  }
  return applied;
}

const USAGE = `usage:
  changelog-from-prs.mjs --pr <number> [--enforce] [--changelog <file>] [--report <file>]
  changelog-from-prs.mjs [--from <ref>] [--to <ref>] [--branch <name>] [--changelog <file>] [--dry-run] [--report <file>]

options:
  --repo <owner/name>  defaults to $GITHUB_REPOSITORY, then the origin remote
  --from <ref>         defaults to the last tag matching "${RELEASE_TAG_PATTERN}" reachable from --to
  --to <ref>           defaults to HEAD
  --branch <name>      base branch the PRs were merged into (default: main)
  --changelog <file>   write the entries into its [Unreleased] section
  --dry-run            never write; in range mode, compare with the [--to] section of --changelog
  --enforce            PR mode: fail when the PR has no linked issue and no bypass
  --report <file>      also append the Markdown report to this file (e.g. $GITHUB_STEP_SUMMARY)`;

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      pr: { type: 'string' },
      repo: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string', default: 'HEAD' },
      branch: { type: 'string', default: 'main' },
      changelog: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      enforce: { type: 'boolean', default: false },
      report: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const repo = values.repo ?? defaultRepo();
  const client = createGitHubClient({ token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN, repo });
  const dryRun = values['dry-run'];

  if (values.pr !== undefined) {
    const number = Number(values.pr);
    if (!Number.isInteger(number) || number <= 0) {
      throw new Error(`--pr expects a pull request number, got "${values.pr}".`);
    }
    const pr = await client.pullRequest(number);
    let result = buildEntries([pr], { repo });
    if (values.changelog) {
      result = dropReleased(result, releasedUrls(readChangelog(values.changelog)));
    }
    if (values.changelog && result.entries.length > 0) {
      applyToChangelog(values.changelog, result.entries, dryRun);
    }
    writeReport(values.report, renderPullRequestReport({ pr, result, enforce: values.enforce }));
    for (const warning of result.warnings) {
      annotate('warning', warning);
    }
    if (!bypassReason(pr) && pr.issues.length === 0) {
      const message = `PR #${number} is not linked to an issue. Add "Closes #<issue>" to the description or link it from the Development sidebar.`;
      if (values.enforce) {
        annotate('error', message);
        console.error(message);
        return 1;
      }
    }
    return 0;
  }

  const to = values.to;
  const from = values.from ?? lastReleaseTag(to);
  const commits = firstParentCommits(from, to);
  const { prs, orphanCommits } = await pullRequestsForCommits(client, commits, { branch: values.branch });
  let result = buildEntries(prs, { repo });

  let applied = null;
  let comparison = null;
  if (values.changelog) {
    const text = readChangelog(values.changelog);
    const released = dryRun ? releasedSection(text, to) : null;
    result = dropReleased(result, releasedUrls(text, { olderThan: released ? to : undefined }));
    applied = applyToChangelog(values.changelog, result.entries, dryRun);
    if (released) {
      comparison = compareWithReleased(result.entries, released, to);
    }
  }

  writeReport(values.report, renderRangeReport({ from, to, prs, result, applied, orphanCommits, comparison }));
  for (const warning of result.warnings) {
    annotate('warning', warning);
  }
  return 0;
}

// Compared as resolved file URLs so spaces, non-ASCII characters or a
// symlink in the path cannot make the CLI silently do nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      annotate('error', error.message);
      console.error(error.message);
      process.exit(1);
    }
  );
}
