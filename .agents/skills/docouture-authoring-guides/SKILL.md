---
name: docouture-authoring-guides
description: "What to write on each page of a docouture documentation site: the purpose of every page, the section skeleton it needs, what to say in each section, a copyable AsciiDoc starting point and a quality checklist — for the six standard sections (Overview, Getting started, Guides, Reference, Additional information, Contributing) and the home page. USE WHEN drafting or reviewing a page's actual content/copy, deciding what belongs on a page or in which section, choosing between a Guides and a Reference treatment for the same topic, writing the home/landing page, or checking a draft against a quality bar. Complements docouture-writing-docs-pages (AsciiDoc syntax, this site's custom blocks) and docouture-docs-internals (nav/module mechanics) — this skill is about content, not markup or wiring. EXAMPLES: 'write the quickstart page', 'what goes on the architecture page', 'draft the FAQ', 'is this a guide or a reference page', 'write the home page', 'review this reference page against the quality checklist'."
---

# Documentation authoring guides

These guides define **what to write** on each page of a docouture documentation site: the purpose of every page, the sections it needs, what to say in each one, and what a good result looks like.

They complement the other docouture skills, they do not replace them:

- **`docouture-docs-internals`** / **`docouture-writing-docs-pages`** explain how the site works — Antora mechanics, `nav.adoc`, page patterns, AsciiDoc syntax, versioning.
- **This skill** explains the content — what each page must include, in which order, and to what quality bar.

It serves two audiences at once:

- **Human authors** who want to write or review a page and need to know what belongs in it.
- **AI agents** generating a first draft of the documentation from the repository code. An agent reading a page guide has everything it needs to produce a reviewable draft: section skeleton, per-section instructions, a copyable AsciiDoc starting point, and a quality checklist to self-verify.

## How to use this skill

1. Plan the site structure first with the `docouture-getting-started` skill (`reference/structure-planning.md`). These guides assume that structure and never contradict it.
2. For each page you are about to write, open the guide for its section (see the index below) and jump to that page.
3. Follow the section-by-section instructions, start from the linked AsciiDoc skeleton (`reference/skeletons/*.adoc`), and check the result against the quality checklist before considering the draft done.
4. Once a page needs an edit later (not a first draft), `docouture-documenting-changes` hands back here for the same page's content contract, so an edit still matches its section's pattern instead of drifting from it.

## The minimal structure

A docouture site scaffolds two Antora modules: `ROOT` (the home page only) and `main` (all content) — that is the only place where the word "module" applies; the documentation structure itself is organized in **sections**. Inside `main`, the navigation groups the pages into six ordered sections. Each page is tagged with a requirement level:

- 🔴 **required** — every documented repo should end up with this page.
- 🟠 **recommended** — include unless there is a specific reason not to.
- 🔵 **conditional** — include only if the repo actually has the surface it covers; skip cleanly (no stub) if it does not.
- ⚪ **optional** — include when it adds value, otherwise leave out.

These levels mark the **minimum, not a ceiling**. A product with more complex or more specific documentation needs can — and should — add more pages beyond the ones listed here: extra guides, extra reference pages, extra sections within a page. The guides define the floor every project must reach, and never forbid going further. Each section guide lists examples of these extra pages (basic installation and basic configuration in Getting started, a deployment guide per environment in Guides, a components catalog in Reference…).

| Section                   | Pages                                                                                                                                       | Guide                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Overview               | `about` 🔴 · `architecture` 🔴 · `glossary` ⚪                                                                                              | [reference/overview.md](reference/overview.md)                             |
| 2. Getting started        | `prerequisites` 🔴 · `quickstart` 🔴                                                                                                        | [reference/getting-started.md](reference/getting-started.md)               |
| 3. Guides                 | `overview` 🔴 · derived task pages 🔴 (≥1) · `development` 🟠                                                                               | [reference/guides.md](reference/guides.md)                                 |
| 4. Reference              | `overview` 🔴 · derived sub-catalog pages 🔵 (configuration, CLI/SDK/public API, integrations)                                              | [reference/reference.md](reference/reference.md)                           |
| 5. Additional information | `overview` 🔴 (includes contact, support & security reporting) · `changelog` 🔴 · `release-notes` 🔴 · `faq` 🟠 · `eol`/migration guides 🔵 | [reference/additional-information.md](reference/additional-information.md) |
| 6. Contributing           | `overview` 🔴                                                                                                                               | [reference/contributing.md](reference/contributing.md)                     |

The **home page** (`ROOT`'s `index.adoc`) sits outside the six sections — it is the site's entry point, not a member of Overview. It has its own guide: [reference/home.md](reference/home.md).

## General rules

These rules apply to every page. The per-page guides assume them and do not repeat them.

### Routing rule: where does this content go?

Ask what the reader is trying to do at that moment:

| The reader wants to…                                             | It goes in…                |
| ---------------------------------------------------------------- | --------------------------- |
| Understand what the product is and how it is built               | **Overview**               |
| Get from zero to a first working result                          | **Getting started**        |
| Accomplish a specific task (goal → steps → verification)         | **Guides**                 |
| Look up an exact fact (an option, a command, a property, an API) | **Reference**              |
| Check version history, FAQ, security policy, migrations          | **Additional information** |
| Contribute to the project                                        | **Contributing**           |

One piece of content, one home. If a topic seems to belong in two places, write it once in the section that matches the reader's intent and cross-reference it from the other.

### Guides vs Reference

The border where authors get lost most often — worth its own rule. Both sections talk about the same product surface, but they answer different questions:

- **Guides are procedural**: they show the reader how to accomplish a specific goal by following a set of structured steps. The reader is _doing something_ and follows the page top to bottom, once.
- **Reference is informational**: it focuses on cause and effect — which actions produce which results. The reader is _looking something up_, lands mid-page from a search, reads one fact, and leaves.

**The decision test** — ask these questions about the content in doubt:

| Question                                                                    | If yes →      |
| ---------------------------------------------------------------------------- | ------------- |
| Does it have a goal and an order? ("first…, then…")                         | **Guides**    |
| Would you sort it alphabetically (or by namespace) without losing anything? | **Reference** |
| Does it cover _one_ scenario, with choices made for the reader?             | **Guides**    |
| Does it cover _every_ option, including the ones most readers never use?    | **Reference** |
| Would a reader follow it start to finish, once?                             | **Guides**    |
| Would a reader return to it repeatedly to check one detail?                 | **Reference** |

**Examples:**

- "Configure authentication" (pick a method, set three properties, verify it works) → **guide**. The exhaustive table of all `auth.*` properties it mentions → **reference**, linked from the guide.
- "Deploy to production" → **guide**. The complete list of CLI flags of the `deploy` command → **reference**.
- What `pool-size` does and its default → **reference**. When and why to raise it for your workload, step by step → **guide**.

**Antipatterns:**

- **The tutorial-table hybrid.** A reference table interrupted by "now restart the server and check the logs" — the steps belong in a guide; the table states facts.
- **The exhaustive guide.** A how-to that documents every flag "while we are here" becomes unfollowable; a guide makes choices for the reader and links the reference for the rest.
- **Duplicated property docs.** The same option explained in a guide _and_ in the reference table drifts apart within months. Facts live in Reference; guides link them.

The rule of thumb when still in doubt: **steps go to Guides, tables go to Reference** — and each links the other.

### Sizing rule: one page or many?

The number of pages depends on the real volume of content, not on the structure map. Start small: if a section has little content, write everything on its entry page as level-2 sections and skip the separate page files. Split a section into its own page only when it exceeds roughly two screens of content, or when readers need to link to it or find it directly.

The rule travels inside the AsciiDoc skeletons as comments, so authors and agents see it at the point of decision:

On the entry page of each section:

```asciidoc
// SIZING RULE: Start small. If this section has little content, write
// everything on this page as level-2 sections (== About, == Architecture...)
// and delete the separate page files + their nav entries.
// Split a section into its own page only when it exceeds ~2 screens
// or needs to be linked/found directly.
```

On the other pages of the section:

```asciidoc
// PAGE OR SECTION: use standalone, or merge into the section entry page
// demoting headings one level (= → ==). See the sizing rule there.
```

The rule works in both directions: a small project collapses a whole section into one page; a large project promotes a heavy H2 into its own page (or a page into a group of nested pages).

### Variants always go in tabs

Whenever the same content exists in equivalent variants — per operating system, package manager, language, or configuration format — present the variants with the `[tabs]` custom block: one tab per variant, same internal structure in every tab, the most common variant first. Never write sequential subsections per OS or parallel bullet lists; the reader cares about exactly one variant and tabs let them see only that one.

This applies across the whole site (requirements, installation commands, code samples, config snippets), so the per-page guides mention `[tabs]` only where it is especially common and do not repeat this rule.

### Naming conventions

- The entry page of a section is named `overview` — it presents the section and links to its content. Two sections use a more natural entry page instead: **Overview** enters through `about`, and **Getting started** enters through `prerequisites`.
- Page file names are lowercase kebab-case (`release-notes.adoc`, not `ReleaseNotes.adoc`).
- Section and page titles use sentence case (`Getting started`, not `Getting Started`).
- Task page titles use bare infinitives (`Create a repository`); conceptual page titles use noun phrases (`Migration to v2`). Avoid -ing forms as the first word of a heading.

### Style guide

All documentation follows the AMIGA Tech Docs style guide, completed by the [Google developer documentation style guide](https://developers.google.com/style) for anything not covered. When the two disagree, AMIGA Tech Docs wins. The rules that matter most in practice:

- **Language:** American English, present tense, active voice. Prefer impersonal instructions (`Run the command`), and `you` over `we` when a pronoun is unavoidable. No contractions.
- **Tone:** conversational and friendly without being frivolous. Short sentences. No filler words (`just`, `simply`, `please`). Never pre-announce future features.
- **No cold opens:** every page starts with a descriptive title and a short introduction stating what the page covers.
- **Formatting:** UI elements in **bold**; code-related text in `code font`; placeholders in `_ALL_UPPERCASE_` italics with underscores (`_PRODUCT_NAME_`); numbered lists for sequences, bullets otherwise; descriptive link text (never `click here`); serial comma in enumerations.
- **Inclusive language:** neutral terms (`allowlist`/`denylist`, `primary`/`secondary`).
- **Examples:** never use identifiable data (real names, tokens, emails).

## Anatomy of a page guide

Every page guide in `reference/` follows the same contract, so both humans and agents always know where to look:

1. **Purpose & audience** — what the page is for and who reads it.
2. **Requirement level** — 🔴 / 🟠 / 🔵 / ⚪.
3. **Section-by-section instructions** — the H2 skeleton of the page, and for each section: what to say, what not to say, and its own requirement level.
4. **Docouture blocks** — which of the site's custom blocks and extensions (`[tabs]`, `[cards]`, `[accordion]`, `[feature-tabs]`, `[cta]`, `label:`, `mono:`, video/table sizing) the page typically uses — and which ones not to use there. Only clear-cut fits are listed; when in doubt, plain AsciiDoc wins. Block syntax lives in the `docouture-writing-docs-pages` skill (`reference/docouture-blocks.md`), not here.
5. **AsciiDoc skeleton** — a copyable starting point, linked from `reference/skeletons/*.adoc` (kept as standalone `.adoc` files rather than inline fences, so a block-delimiter-heavy skeleton like the home page's never has to nest inside a wrapping code fence).
6. **Example** — a short excerpt of a good result, inline in the guide (illustrative reading, not meant to be copy-pasted the way the skeleton is).
7. **Quality checklist** — what to verify before considering the page done.
8. **Common mistakes** — the failure modes to avoid.

## Index

- [Overview section](reference/overview.md) — `about`, `architecture`, `glossary`
- [Getting started section](reference/getting-started.md) — `prerequisites`, `quickstart`
- [Guides section](reference/guides.md) — `overview`, how-to task pages, `development`
- [Reference section](reference/reference.md) — `overview`, `configuration`, API/CLI/SDK surface pages
- [Additional information section](reference/additional-information.md) — `overview` (contact, support & security), `changelog`, `release-notes`, `faq`, `eol`/migrations
- [Contributing section](reference/contributing.md) — `overview`
- [Home page](reference/home.md) — `ROOT`'s `index.adoc`, the site's storefront
