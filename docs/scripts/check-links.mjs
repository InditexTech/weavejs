#!/usr/bin/env node

// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

'use strict'

// Checks the built site (build/site) for broken links, but only ever FAILS
// on a broken EXTERNAL (http/https) link — a raw link in content Antora
// itself can't see, which is the whole reason this check exists (Antora's
// own strict mode, runtime.log.failure_level: warn, already fails the build
// on a broken xref before this script ever runs).
//
// A broken LOCAL link is reported as a warning, never a failure. Two
// reasons a local link can legitimately show up BROKEN here even though
// nothing is actually wrong:
//
//   1. docouture-pr-verify.yml and docouture-release.yml both build with
//      antora-playbook.local.yml (branches: HEAD only) rather than the real,
//      multi-source antora-playbook.yml — content generated from config
//      rather than an xref (the module switcher, the footer, a
//      urls.latest_version_segment alias) can point at another version or
//      component that simply isn't part of this reduced, single-source
//      build. Antora doesn't fail on these (they're not xrefs it resolves),
//      but linkinator, crawling the actual rendered HTML, will.
//   2. Any other local-link false positive linkinator produces against
//      content Antora itself is satisfied with.
//
// A broken link matching an IGNORE pattern (see IGNORE_PATTERNS below) is
// also only a warning — same reasoning, different cause: it starts with
// http(s):// so it looks external, but it isn't a real third-party
// dependency an author is vouching for.
//
// Uses linkinator's own JS API (see @inditextech/docouture-*'s own
// devDependency on it in package.json) rather than shelling out to its CLI:
// the CLI's own --skip flag can only exclude a link from being checked
// altogether (see linkinator's own source, LinkChecker#crawl: a skipped URL
// is never fetched, so it can neither be validated NOR recursed into) — it
// cannot express "fetch and recurse through this page, just don't fail the
// whole job over IT specifically". Classifying results after the fact, via
// the API, is the only way to get both: a full recursive crawl of every
// generated page (so a raw external link buried three pages deep still gets
// found), and a pass/fail decision that only external links get to make.
import { readFile } from 'node:fs/promises'
import { check } from 'linkinator'

const SKIP = ['^(mailto:|tel:)']

// linkinator's own mapUrl() (see its src/index.ts) strips the local static
// server's http://127.0.0.1:<port> prefix from every local result before
// it's reported — the port is random per run, so this is the only stable
// way to tell a local link from an external one after the fact: whatever's
// left over either still starts with http(s):// (a real external URL) or
// doesn't (a local one, already rewritten to a bare path).
const isExternal = (url) => /^https?:\/\//.test(url)

// A simple shell-style glob, not a regex: `*` matches any run of characters
// (including none), `?` matches exactly one, everything else is literal —
// most people writing "which links to ignore" think in terms of a host or a
// path shape, not regex syntax, and a literal `.` (as in every hostname) is
// far more likely to be meant literally than as "any character". Escapes
// every other regex metacharacter so the rest of the string is matched
// verbatim.
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, String.raw`\$&`)
  return new RegExp(escaped.replaceAll('*', '.*').replaceAll('?', '.'))
}

// `package.json`'s own "docouture" config block (see the scaffolded stub, next
// to "docouture.publish") is this project's existing place for a local,
// site-specific override — `docouture.checkLinks.ignore` is a list of globs
// (see globToRegExp above), tested the same way linkinator's own
// `--skip`/`linksToSkip` are, but warned rather than silently dropped so an
// ignored link that starts failing for a REAL reason still shows up
// somewhere. Scaffolded with these default entries already in it (see
// package.json's own comment... it's JSON, so there isn't one — this is
// that comment):
//
//   - `*/edit/HEAD/*` — the footer's "Propose a change" link
//     (edit-this-page.hbs) renders `page.editUrl`, which Antora builds from
//     whatever ref it detects checked out. docouture-pr-verify.yml and
//     docouture-release.yml both build from a detached-HEAD checkout (a PR
//     merge commit, or a one-off commit on top of main — see those
//     workflows' own comments), so Antora has no real branch name to put
//     there and falls back to the literal string `HEAD` — a path GitHub's
//     web UI never resolves. This is deterministic, not flaky: it will be
//     "broken" on every single PR-verify/release run of every scaffolded
//     site, regardless of content, so it carries no signal worth failing a
//     build over.
//   - `https://<org>.github.io/<repo>` — getting-started.adoc's own
//     "Publish the docs" section mentions this literal, illustrative
//     placeholder as an example of what `site.url` should look like for a
//     GitHub Pages project page. Asciidoctor auto-links any bare http(s)
//     URL it finds, including inside monospace text, so this example ends
//     up as a real (and obviously never-resolving) link in the built HTML.
//   - this site's own repo link (repo-link.hbs renders `site.keys.repoUrl`,
//     or absent that Antora's own `page.origin.webUrl` — same URL either
//     way, computed by `docouture new` from `git remote get-url origin` at
//     scaffold time; see new.ts's own repoIgnoreGlob()), shown once per page
//     so a single broken link here would otherwise report once per page in
//     the results. There's a real, principled reason it can 404 to an
//     anonymous CI crawler even when nothing is actually wrong: GitHub
//     returns 404 (not 403) for a private repo when unauthenticated,
//     indistinguishable from one that doesn't exist, and plenty of docs
//     sites publish before (or without ever) making their source repo
//     public. A harmless sentinel glob that can never match a real URL
//     fills this slot instead when there was no `origin` remote configured
//     yet at scaffold time — never an empty string, which would silently
//     ignore every link. Baked in once, at scaffold
//     time, rather than recomputed here on every run: if this repo's remote
//     is later renamed or moved, this entry goes stale along with it, the
//     same as any other config a site owner would need to update by hand.
async function ignorePatterns() {
  let pkg
  try {
    pkg = JSON.parse(await readFile('package.json', 'utf8'))
  } catch {
    return []
  }
  const ignore = pkg?.docouture?.checkLinks?.ignore
  return Array.isArray(ignore) ? ignore.map(globToRegExp) : []
}

const IGNORE_PATTERNS = await ignorePatterns()

// An absolute link whose host is `localhost` or `127.0.0.1` — a
// self-referential `site.url` (or similar absolute-URL config) that happens
// to point at wherever someone's local dev server runs. That address is
// never actually serving anything while this script runs its own,
// unrelated throwaway static server, so the link is "broken" as a pure
// artifact of running the check at all, not because the site's content is
// wrong. Kept as its own structural check (not a package.json default)
// since it applies to every site unconditionally, with nothing to
// configure.
const isNonRepresentative = (url) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url) || IGNORE_PATTERNS.some((pattern) => pattern.test(url))

const result = await check({
  path: 'build/site',
  recurse: true,
  linksToSkip: SKIP,
  // linkinator's own default is 0 — NO application-level timeout at all
  // (see its own README: "requests made by linkinator do not time out, or
  // follow the settings of the OS"), which means `request.js`'s
  // `AbortSignal.timeout(options.timeout)` is never even constructed. A
  // real multi-page site can easily produce a few hundred *distinct*
  // (not duplicate — linkinator already dedupes identical URLs, so this
  // isn't a dedup gap) links to the same external host: think a
  // CHANGELOG page with one github.com/…/pull/NNN link per entry, not
  // just this template's own repo-link/edit-link. A burst that size can
  // trip a host's own anonymous-crawler rate limiting (GitHub's included),
  // and — unconfirmed upstream, but plausible and cheap to guard against
  // either way — if that limiting responds slowly rather than rejecting
  // fast, an unbounded request ties up one of `concurrency`'s 100 slots
  // for however long the OS's own idle/keepalive timeout happens to be
  // (which can be minutes), not a few seconds. 10s is generous for any
  // real external page load; it only ever kicks in to cut a stalled
  // socket loose instead of quietly inflating the whole crawl's wall-clock
  // time. NOT a fix for "too many links to github.com" in general — those
  // are real, individually-distinct links an author is vouching for, and
  // correctly stay off `docouture.checkLinks.ignore` (see ignorePatterns()
  // above) so a genuinely broken one still fails the build.
  timeout: 10_000,
  // A plain 403/429 from a real external host (most commonly GitHub's own
  // bot/rate-limit protection kicking in on repo links, hit repeatedly
  // across every page of a freshly built site) can't be told apart from a
  // genuinely dead link — linkinator's own README documents the same
  // reasoning for its built-in 403 (Cloudflare)/999 (LinkedIn) handling.
  // Treating these as a warning rather than a failure extends that same
  // policy to any host, not just the two it special-cases already.
  statusCodes: {
    403: 'warn',
    429: 'warn',
  },
})

const broken = result.links.filter((link) => link.state === 'BROKEN')
const local = broken.filter((link) => !isExternal(link.url))
const nonRepresentative = broken.filter((link) => isExternal(link.url) && isNonRepresentative(link.url))
const external = broken.filter((link) => isExternal(link.url) && !isNonRepresentative(link.url))

for (const link of local) {
  console.log(`::warning::local link reported broken (ignored): ${link.url} (parent: ${link.parent ?? 'unknown'})`)
}

for (const link of nonRepresentative) {
  console.log(
    `::warning::non-representative link reported broken (ignored — see this script's own comment): ${link.url} (parent: ${link.parent ?? 'unknown'})`
  )
}

if (external.length > 0) {
  for (const link of external) {
    console.log(`::error::broken external link: ${link.url} (parent: ${link.parent ?? 'unknown'})`)
  }
  console.error(`\n${external.length} broken external link(s) found.`)
  process.exit(1)
}

const ignored = local.length + nonRepresentative.length
console.log(
  `Checked ${result.links.length} link(s): 0 broken external link(s)` +
    (ignored > 0 ? `, ${ignored} local/non-representative link(s) ignored (see warnings above).` : '.')
)
