# Additional information section — authoring guide

The Additional information section gathers the product's **evolving information**: what changed, when, and whether the user must act — plus the answers, policies, and contact paths users check repeatedly. This is where change documentation (changelogs and release notes) lives: it lets users understand when changes took place and when they were impacted.

Pages in this section:

| Page                                              | Level          | One-line purpose                                                                        |
| ------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `overview`                                        | 🔴 required    | Entry page: contact and support (including security reporting) + the map of the section |
| `changelog` (overview + one page per version)     | 🔴 required    | The complete record of every change                                                     |
| `release-notes` (overview + one page per version) | 🔴 required    | The curated highlights of each release                                                  |
| `faq`                                             | 🟠 recommended | Real frequently asked questions + troubleshooting                                       |
| `eol` / `migration-guides`                        | 🔵 conditional | Supported versions and how to move between them                                         |

This list is the minimum, not a ceiling: a product with more complex or more specific documentation needs can add more pages to this section (see [the skill guide](../SKILL.md#the-minimal-structure)) — like a dependencies page (the product's third-party dependencies and licenses).

**Small topics do not get a page.** When a topic amounts to a couple of sentences — the security reporting pointer, a short EoL policy, a changelog that only links to GitHub Releases — write it as a `== ` section of the `overview` page instead of creating a dedicated page. Security reporting in particular always lives inside the overview's Contact and support, never as its own page.

### Changelog vs release notes — they are not the same page

Both are 🔴 and they coexist because they answer different questions:

|                         | Changelog                                                                | Release notes                                                                               |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Question it answers** | "What exactly changed in each version?"                                  | "What is new and what does it mean for users?"                                              |
| **Nature**              | Exhaustive, factual record: every addition, change, fix, and deprecation | Curated highlights: the features worth telling to the tool users, explained and illustrated |
| **Tone**                | Neutral, list-like                                                       | Engaging — an opportunity to connect with users                                             |
| **Reader**              | Someone auditing, debugging, or pinning versions                         | Someone wanting to know what's new or deciding whether and how to upgrade                   |

**When to link instead of duplicate:** if the repo already maintains a `CHANGELOG.md` or uses GitHub Releases as the complete record, the `changelog` overview page links there instead of copying it — never maintain the same list in two places. Release notes, being curated content, are best written in the docs.

### Adding these pages to the nav

List every page above as a flat sibling of `overview` in `main`'s `nav.adoc` — Overview never parents Changelog, Release notes, or FAQ. Only a subsection's own index page parents its genuine children, e.g. Release notes' per-version pages:

```adoc
* Additional information
* xref:overview.adoc[Overview]
* xref:changelog/index.adoc[Changelog]
* xref:release-notes/index.adoc[Release notes]
** xref:release-notes/1-0-0.adoc[v1.0.0]
* xref:faq.adoc[FAQ]
```

See the `docouture-writing-docs-pages` skill for the full nav.adoc nesting rule.

---

## `overview` 🔴

### Purpose & audience

The entry page of the section. It carries the **contact and support** channels — including how to report a security vulnerability — and maps the section's pages. Written for a user who wants to know what changed, whether they must act, or how to reach the team.

The page works in two modes, per the sizing rule:

- **Short content:** each topic (changelog, release notes, FAQ, EoL…) is written directly on this page as its own `== ` section — no separate pages. A changelog that only links out to GitHub Releases or `CHANGELOG.md` is a `== Changelog` section here with that link.
- **Separate pages:** the topics live in their own pages, and this page ends with a `== Sections` grid linking them — placed at the end, below Contact and support.

### Section-by-section instructions

| Section                                     | Level | What to write                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _(intro, no heading)_                       | 🔴    | One or two sentences: this is the most up-to-date information about the product — changes, versions, support deadlines, and contact.                                                                                                                                                                                                                                                                   |
| `== <Topic>` (short-content mode, repeated) | 🔵    | The topic's content itself, written here as a section (a `== Changelog` with the external link, a short `== End of life` policy…).                                                                                                                                                                                                                                                                     |
| `== Contact and support`                    | 🔴    | Every channel the user can use, each with its preferred purpose (email → incidents, discussions → questions and ideas…). A channel without a stated purpose generates misrouted requests. Include a **Security** paragraph or `=== Security` subsection: report vulnerabilities **privately** through the stated channel (link `SECURITY.md` / GitHub private reporting), never through public issues. |
| `== Sections` (separate-pages mode)         | 🔴    | The closing grid of the pages documented separately in this section, as cards. Always the last section of the page.                                                                                                                                                                                                                                                                                    |

### Docouture blocks

| Use               | Block                                          |
| ----------------- | ---------------------------------------------- |
| The Sections grid | `[cards]` — one card per page of the section   |
| Channel list      | Plain bulleted list — one channel, one purpose |

### AsciiDoc skeleton

See [`skeletons/additional-information-overview.adoc`](skeletons/additional-information-overview.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Additional information
:description: Karate changes, versions, support, and contact information.

Here you can find the most up-to-date information about Karate:
what has changed and how, version support deadlines, and how to reach us.

== Contact and support

* link:https://github.com/example-org/karate/discussions[GitHub Discussions] — questions and ideas.
* link:https://github.com/example-org/karate/issues[Issue tracker] — bugs and feature requests.

=== Security

To report a security vulnerability, follow the process in our
link:https://github.com/example-org/karate/blob/main/SECURITY.md[security policy].
Report privately — do not open a public issue.

== Sections

[cards,columns="1 s:2 m:3"]
====
[card]
.xref:release-notes/overview.adoc[Release notes]
Highlights and major changes of each release.

[card]
.xref:changelog/overview.adoc[Changelog]
The complete list of additions, changes, fixes, and deprecations.

[card]
.xref:faq.adoc[FAQ]
Common questions and known issues.
====
```

### Quality checklist

- [ ] Every separately documented page appears in the closing Sections grid.
- [ ] Topics that amount to a couple of sentences are sections here, not dedicated pages.
- [ ] Every contact channel states its preferred purpose.
- [ ] The security reporting path is stated inside Contact and support: private channel linked, "no public issues" explicit, no duplication of `SECURITY.md`.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Long content parked here.** Changelog entries or FAQs pasted here beyond a couple of sentences belong in their pages.
- **Channels without owners.** Do not list a channel nobody monitors — it is worse than not listing it.
- **A dedicated security page for two sentences.** The reporting pointer lives in Contact and support; fixed CVEs belong in the changelog; open ones are handled privately.

---

## `changelog` 🔴 — overview + one page per version

### Purpose & audience

The complete, factual record of every change, version by version: additions, changes, fixes, deprecations. For someone auditing, debugging a regression, or pinning versions. Structure: an `overview` page acting as a menu (grouped by major version when standalone versions exist, otherwise by publication date) and one page per version — or a single link out to `CHANGELOG.md`/GitHub Releases when that is already the complete record (see the comparison above).

### Section-by-section instructions

**Overview page:**

| Section               | Level | What to write                                                                                                                                                                                                                                   |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_ | 🔴    | What the changelog records, and the link to the release notes for the curated view.                                                                                                                                                             |
| _(the index table)_   | 🔴    | A table relating everything, newest first: Version (linked to its page) · Date (`YYYY/MM/DD`) · Changelog link. If the product is **not versioned**, a changelog barely makes sense — if kept anyway, replace versions with `YYYY-MM-DD` dates. |

**Per-version page:**

| Section                                               | Level | What to write                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(header)_                                            | 🔴    | Version and release date as a label pill: `label:[Released YYYY-MM-DD]`.                                                                                                                                                                                                                       |
| `== Added` / `== Changed` / `== Fixed` / `== Removed` | 🔴    | The complete list, one bullet per change, factual. Include only the categories that apply. For changes that affect users, expand the bullet with: **Summary** · **Impact** (who/what is affected) · **Reasoning** (why the change) · **Actions required** (what the user must do — or "none"). |
| `== Contributors`                                     | 🟠    | Open source is people: thank the release's contributors and link their GitHub profiles ([as Spring does](https://github.com/spring-projects/spring-framework/releases)).                                                                                                                       |

### Docouture blocks

| Use                        | Block                                    |
| -------------------------- | ---------------------------------------- |
| Release date in the header | `label:[Released YYYY-MM-DD]` pill       |
| Marking breaking changes   | `label:red[Breaking]` pill on the bullet |

### AsciiDoc skeleton

Overview page:

See [`skeletons/changelog-overview.adoc`](skeletons/changelog-overview.adoc) for the copyable AsciiDoc starting point.

Per-version page:

See [`skeletons/changelog-version.adoc`](skeletons/changelog-version.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= v2.5.0 changelog
:description: Complete list of changes in Karate v2.5.0.

label:[Released 2026-08-27]

== Added

* `--threads` option in the CLI runner (link:<repo>/issues/412[#412]).

== Changed

* label:red[Breaking] The default report format is now HTML.
** *Impact:* pipelines parsing the old plain-text report.
** *Reasoning:* the HTML report includes per-step timings.
** *Actions required:* pass `--format text` to keep the previous output.

== Fixed

* Tag filters are no longer case-sensitive (link:<repo>/issues/431[#431]).

== Contributors

Thank you to all the contributors of this release:
link:https://github.com/octocat[@octocat], link:https://github.com/hubot[@hubot].
```

### Quality checklist

- [ ] Every released version has its entry — no gaps.
- [ ] Entries are factual one-liners; explanations live in release notes.
- [ ] Breaking changes are marked and carry Impact / Reasoning / Actions required.
- [ ] If the record lives in `CHANGELOG.md`/GitHub Releases, the docs link it and do not duplicate it.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Duplicating the repo changelog by hand.** Two records of the truth always diverge — link or generate, never retype.
- **Marketing tone.** "Amazing new feature!" belongs (rewritten) in release notes; here it is `Added: <feature>`.
- **Burying breaking changes.** A breaking change formatted like any other bullet is how users get burned; mark it and state the required action.

---

## `release-notes` 🔴 — overview + one page per version

### Purpose & audience

The curated highlights of each release: the features and improvements worth telling, explained and illustrated. This is communication, not record-keeping — an opportunity to engage users and show the product moving. For someone deciding whether and how to upgrade. Structure: an `overview` page acting as an index (grouped by major version, newest first) and one page per release.

### Section-by-section instructions

**Overview page:**

| Section               | Level | What to write                                                                                                                                                               |
| --------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_ | 🔴    | Cadence of releases when regular, and the link to the changelog for the complete list.                                                                                      |
| _(the index list)_    | 🔴    | One bullet per release, newest first, linked to its page: `vX.Y.Z — <one-sentence release title>`. If the product is **not versioned**, use `YYYY-MM-DD — <title>` instead. |

**Per-version page:**

| Section              | Level | What to write                                                                                                                                                                                                                               |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(header)_           | 🔴    | Release date as a label pill: `label:[Released YYYY-MM-DD]`, then one welcoming paragraph introducing the release's main theme.                                                                                                             |
| `== New & improved`  | 🔴    | The heart of the page. One `=== <Feature title>` per highlight, in descending order of importance: what it is, how it works, why it was built — with images, videos, or snippets when they help, and links to the docs pages that cover it. |
| `== Fixed & Removed` | 🔵    | Only what is worth announcing: critical or widely requested fixes, and removals or deprecations that affect users.                                                                                                                          |
| `== Migration`       | 🔵    | Link to the migration guide when upgrading requires action.                                                                                                                                                                                 |
| `== Changelog`       | 🔵    | Closing link to the complete changelog for this version.                                                                                                                                                                                    |

### Docouture blocks

| Use                        | Block                                               |
| -------------------------- | --------------------------------------------------- |
| Release date in the header | `label:[Released YYYY-MM-DD]` pill                  |
| Feature status             | `label:orange[Beta]`, `label:red[Deprecated]` pills |

### AsciiDoc skeleton

Overview page:

See [`skeletons/release-notes-overview.adoc`](skeletons/release-notes-overview.adoc) for the copyable AsciiDoc starting point.

Per-version page:

See [`skeletons/release-notes-version.adoc`](skeletons/release-notes-version.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= v2.5.0 release notes — parallel runs and HTML reports
:description: Highlights of Karate v2.5.0.

label:[Released 2026-08-27]

Welcome to Karate v2.5.0, where test suites get faster and reports get
readable: this release introduces parallel execution and a new HTML report.

== New & improved

=== Run suites in parallel

The new `--threads` option splits the suite across workers, cutting
execution time on large suites by up to 70%:

[source,bash]
----
karate run --threads 5 src/test/features
----

See xref:../../reference/cli.adoc[CLI reference] for the details.

=== A readable HTML report

Every run now produces an HTML report with per-step timings, replacing
the plain-text output.

== Fixed & Removed

=== Tag filters are no longer case-sensitive

`--tags @Smoke` and `--tags @smoke` now select the same scenarios.

== Changelog

For the complete list of changes, see the xref:../changelog/v2-5-0.adoc[v2.5.0 changelog].
```

### Quality checklist

- [ ] Highlights are ordered by importance, most important first.
- [ ] Each highlight explains what/how/why and links to its documentation.
- [ ] The page ends by pointing to the changelog (and migration guide when relevant).
- [ ] Tone is engaging but factual — no unverifiable superlatives.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Pasting the changelog.** If the page reads like a bullet dump, it is the changelog wearing a costume; curate and explain.
- **Highlights nobody asked about.** Internal refactors are changelog material; release notes tell users what changes _for them_.
- **No pointer to action.** Every release notes page should end with the next step: upgrade command, migration guide, or the feature's docs.

---

## `faq` 🟠 — with the troubleshooting pattern

### Purpose & audience

Two jobs on one page (splitting per the sizing rule when either grows): the **real** frequently asked questions, and **troubleshooting** — documented workarounds for known issues. Written for a user with a question or a problem, before they open a support request. If the product's Q&A already lives in a knowledge tool (GitHub Discussions), link it instead of duplicating.

Is best to include real questions: collected from issues, support channels, and discussions. An invented FAQ answers questions nobody asks and misses the ones everybody does.

**Write FAQs for SEO and GEO.** Q&A is chunkable content — exactly what AI-powered search engines pick to answer people's questions, and the part of the documentation most likely to be quoted as a direct answer. Phrase each question the way users actually search it, and make each answer **self-contained**: understandable on its own, with the product name spelled out and a link to the relevant page, so it still makes sense when lifted out of the page.

### Section-by-section instructions

| Section               | Level | What to write                                                                                                                                                                                                                                                                                       |
| --------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_ | 🔴    | What the page gathers and where to ask when the answer is not here (link to Contact and support).                                                                                                                                                                                                   |
| `== FAQ`              | 🔴    | One question, one collapsible answer. Group by topic (`=== <group>`) only when the list grows. Questions verbatim as users ask them.                                                                                                                                                                |
| `== Troubleshooting`  | 🟠    | One `=== <issue title>` per known issue, following the issue pattern: **Description** (the situation, when it occurs, the exact error message) → **Steps to fix** (numbered solution or workaround). Group error messages together on this single page rather than scattering them across the docs. |

### Docouture blocks

| Use                                 | Block                                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| The FAQ list                        | `[accordion]` grouping `[%collapsible]` questions (with `aria-label`) |
| The exact error message in an issue | `[source]` block — searchable text, never a screenshot                |

### AsciiDoc skeleton

See [`skeletons/faq.adoc`](skeletons/faq.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
== FAQ

[accordion,aria-label="Frequently asked questions"]
--
.Can I run Karate tests without writing Java code?
[%collapsible]
====
Yes. Karate tests are written in Gherkin `.feature` files and need no
Java code for most scenarios. See xref:../getting-started/quickstart.adoc[Quickstart].
====

.Does Karate support running a subset of the test suite?
[%collapsible]
====
Yes. Tag your scenarios and pass a tag filter to the runner. See
xref:../guides/run-tests-by-tags.adoc[Run tests by tags].
====
--

== Troubleshooting

=== Tests fail with "no tests were executed"

*Description:* the suite compiles but no scenario runs, usually because
the tag filter matches nothing.

[source]
----
Tests run: 0, Failures: 0, Errors: 0, Skipped: 0
----

*Steps to fix:*

. Check the tag expression for typos: tag filters are case-sensitive
  before v2.5.0.
. Run without filters to confirm the scenarios are discovered.
```

### Quality checklist

- [ ] Every question is real (traceable to issues, discussions, or support).
- [ ] Questions are phrased the way users search them; every answer is self-contained (SEO/GEO).
- [ ] Answers link to docs pages instead of re-explaining them.
- [ ] Every known issue includes the exact error message as searchable text.
- [ ] Every issue has a solution or an explicit workaround.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Invented questions.** "What makes _PRODUCT_ so fast?" is marketing, not FAQ.
- **Screenshots of errors.** Unsearchable; paste the text.
- **Workarounds that outlive the fix.** When a release fixes an issue, remove or annotate its entry — stale workarounds cause new problems.
- **Answering with essays.** Two sentences and a link beat four paragraphs.

---

## `eol` / `migration-guides` 🔵

### Purpose & audience

Only for products with deprecations or a major-version history. **EoL** answers "is my version still supported and until when?"; **migration guides** answer "how do I move to the next version?". Written for operators planning upgrades.

### Section-by-section instructions

**`eol`:**

| Section                 | Level | What to write                                                                                                                                                    |
| ----------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_   | 🔴    | The support policy in one paragraph: release cadence, how many versions receive support, and a warning to read the latest docs version.                          |
| `== Supported versions` | 🔴    | The table: Version · GA · End of full support · End of life, one row per version, discontinued ones marked. Dates in `YYYY-MM-DD`; state estimates as estimates. |

**`migration-guides`:** one `== Migrate to vX` per major migration, newest first, each with **Prerequisites** → **Steps to update** → **Considerations**. When a migration needs no action, say so explicitly ("No changes are needed") — silence reads as missing docs. Split heavy migrations into nested pages per the sizing rule.

### Docouture blocks

| Use             | Block                                                            |
| --------------- | ---------------------------------------------------------------- |
| Support table   | Standard table; `label:red[Discontinued]` pill for dead versions |
| Migration steps | Numbered lists; `[tabs]` for per-platform variants               |

### AsciiDoc skeleton

`eol` page:

See [`skeletons/eol.adoc`](skeletons/eol.adoc) for the copyable AsciiDoc starting point.

`migration-guides` page:

See [`skeletons/migration-guides.adoc`](skeletons/migration-guides.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= End of life
:description: Karate support policy and supported versions.

Karate releases a major version every year. Each major version receives
full support until the next major GA, and security fixes for 12 more
months. Always read the documentation for the latest supported version.

== Supported versions

[cols="1,1,1,1",options="header"]
|===
| Version | GA | End of full support | End of life

| v2.x
| 2026-01-15
| 2027-01-15 (estimated)
| 2028-01-15 (estimated)

| v1.x label:red[Discontinued]
| 2024-11-02
| 2026-01-15
| 2026-06-30
|===
```

`migration-guides` page:

```asciidoc
= Migration guides
:description: How to upgrade between Karate versions.

== Migrate to v2

=== Prerequisites

* Karate v1.9 or later installed.
* A backup of your `karate-config.js`.

=== Steps to update

. Update the dependency to `karate:2.0.0`.
. Rename the `report.format` option to `output.format` in `karate-config.js`.
. Run the suite once with `--dry-run` to validate the configuration.

=== Considerations

* Reports are now generated in HTML by default; pass `--format text`
  to keep the previous output.

== Migrate to v1.9

No changes are needed to upgrade from v1.8 to v1.9.
```

### Quality checklist

- [ ] Every released major/minor line appears in the EoL table with its dates.
- [ ] Every documented migration is complete: prerequisites, steps, considerations.
- [ ] "No changes needed" migrations state it explicitly.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Undated support promises.** "Supported for a while" is not a policy; commit to dates or to a rule (GA + N months).
- **Migration guides written after the fact.** Write them with the release, while the breaking changes are fresh — users migrate on day one.
