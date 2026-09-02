# Overview section — authoring guide

The Overview section is the **conceptual documentation** of the product: it helps users understand the concepts and ideas behind it — what the product is, why to use it, and how it works — without drifting into usage instructions (those live in Getting started and Guides). It is where a potential user decides whether the product fits their needs, and where a new team member builds a mental map before touching anything.

Pages in this section:

| Page           | Level       | One-line purpose                                 |
| -------------- | ----------- | ------------------------------------------------ |
| `about`        | 🔴 required | What the product is, for whom, and why it exists |
| `architecture` | 🔴 required | How the product is built and why                 |
| `glossary`     | ⚪ optional | The product's own vocabulary                     |

This list is the minimum, not a ceiling: a product with more complex or more specific documentation needs can add more pages to this section (see [the skill guide](../SKILL.md#the-minimal-structure)) — like a roadmap, or the product story (how and why the product came to be).

The entry page of this section is `about` (see the naming conventions in [the skill guide](../SKILL.md)). The [sizing rule](../SKILL.md#sizing-rule-one-page-or-many) applies: a small project can fold `architecture` (and `glossary`) into `about` as level-2 sections; a large project can grow `architecture` into a group of nested pages.

---

## `about` 🔴

### Purpose & audience

The main place where the product is described. Written for two readers at once:

- A potential user with no prior knowledge of the product.
- Someone deciding whether the product is a good fit for their needs.

Both are evaluating, not yet using. Everything on this page should help them answer "is this for me?" quickly and honestly.

### Section-by-section instructions

| Section                         | Level | What to write                                                                                                                                                                                                                                                                               |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_           | 🔴    | Two or three paragraphs: what the product is, a rough idea of how it works, and its purpose — what problem it solves and why it is necessary. If adopting it changes how teams work, say so roughly and link to the page that covers it.                                                    |
| `== Key features`               | 🔴    | A bulleted list of the product's main capabilities, each one line, each cross-referenced to the page that covers it in depth. Features, not marketing: name what it does, not how great it is.                                                                                              |
| `== Benefits`                   | 🟠    | Why choose this over the alternatives or the previous situation. A bulleted list — `*Benefit:* how and why` — with the value proposition of each. This is the section for the reader assessing whether onboarding effort will pay off.                                                      |
| `== What _PRODUCT_NAME_ is not` | ⚪    | Honest scope boundaries: the use cases the product does not cover and, when possible, what to use instead. Saves the reader a wrong adoption — one of the most valuable sections on the page.                                                                                               |
| `== Status and roadmap`         | 🟠    | Current maturity (stable, beta, active development), what exists today, and the direction ahead. Present tense, no promises with dates: describe the direction, not a delivery plan. If the product is adapted from an existing technology, say which one and which version it is based on. |
| `== Vision`                     | ⚪    | How the team imagines the product growing in the mid/long term. Only if there is a real vision to tell — otherwise fold it into Status and roadmap.                                                                                                                                         |

Add as many other sections as the product genuinely needs — these are the floor, not the ceiling.

### Docouture blocks

This page is prose-first: paragraphs, bullet lists, and xrefs cover it. Custom blocks with a clear fit:

| Use                                                   | Block                                  |
| ----------------------------------------------------- | -------------------------------------- |
| A prerequisite or warning worth surfacing immediately | Standard `NOTE`/`IMPORTANT` admonition |

Do **not** use `[feature-tabs]`, or `[cta]` here — they belong to the home page. If this page starts looking like a showcase, it is duplicating the home page (see Common mistakes).

### AsciiDoc skeleton

See [`skeletons/about.adoc`](skeletons/about.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= About Weave.js
:description: What Weave.js is, who it is for, and why it exists.

Weave.js is a frontend framework for building real-time collaborative
whiteboard applications. It provides the rendering canvas, the data
synchronization layer, and a catalog of ready-made nodes so that teams can
ship a collaborative editor without building the infrastructure themselves.

An application built with Weave.js runs in the browser and synchronizes
state across peers through a shared store. Developers declare nodes
(shapes, text, images), actions (tools the user can activate), and plugins
(cross-cutting behaviors), and Weave.js renders and synchronizes them.

Building collaborative editing from scratch requires solving canvas
rendering, conflict-free state replication, and multi-user awareness at
once. Weave.js solves the three together so that product teams can focus
on their domain features.

== Key features

* *Real-time collaboration* — conflict-free shared state out of the box,
  see xref:architecture.adoc[Architecture].
* *Extensible node catalog* — ships with shapes, text, and images; add
  your own, see xref:guides/overview.adoc[Guides].
```

### Quality checklist

- [ ] A reader with zero context can say what the product is after the first paragraph.
- [ ] The problem the product solves is stated explicitly — not implied.
- [ ] Every key feature links to the page that covers it in depth.
- [ ] Scope boundaries are honest: at least one thing the product does not do.
- [ ] No marketing adjectives doing the work of facts (`powerful`, `seamless`, `blazing fast`).
- [ ] No pre-announced features or dated promises.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Starting with how to install it.** Installation belongs in Getting started; this page answers _what_ and _why_, not _how_.
- **Describing the repository instead of the product.** The reader cares about what the product does for them, not about the folder layout (that is `architecture`).
- **Feature list without cross-references.** A feature name alone is a dead end; every claim should lead somewhere.
- **Hiding the limitations.** Readers who discover scope boundaries after adopting the product become detractors; readers who learn them here self-select correctly.
- **Duplicating the home page.** The home page is a showcase with calls to action; `about` is the substance behind it. If they read the same, one of the two is wrong.

---

## `architecture` 🔴

### Purpose & audience

Explains how the product is built and why: components, how they communicate, and the technical decisions behind them. It serves two purposes at once — a mind map of where the product fits in its ecosystem, and a technical validation that the decisions made were sound. The audience has a technical background: do not be afraid of detail, they will catch up.

### Section-by-section instructions

| Section                                    | Level | What to write                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_                      | 🔴    | One short paragraph stating what this page covers.                                                                                                                                                                                                                                                                                           |
| `== Overview`                              | 🔴    | The architecture diagram plus its explanation. Some sort of flow diagram is crucial — the reader must visualize the product's role within its ecosystem. Never paste the diagram alone: walk through the flow stages and how the pieces communicate and work together. Explain the key technical decisions and the determinants behind them. |
| `== Project structure`                     | 🟠    | How the codebase is organized. When the product ships several artifacts (packages, services, binaries), detail each artifact and its purpose separately.                                                                                                                                                                                     |
| `== <Lifecycle / Plugins / Data flow / …>` | 🔵    | As many extra sections as the architecture genuinely needs, one concern per section, each explaining a piece of the process separately.                                                                                                                                                                                                      |

If the H2 sections grow heavy, keep `== Overview` (with the diagram) on this page and promote the other sections to nested pages under it — the sizing rule in the other direction.

### Docouture blocks

| Use                                                 | Block                                                                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The architecture diagram (required) and screenshots | Standard `image::` macro                                                                                                                     |
| Component/artifact tables                           | Standard tables; `mono:[]` for columns where every cell is a bare name (component, package), `nowrap-cols` to keep those columns on one line |

No switcher blocks here: `[tabs]` is for equivalent alternatives (package managers, config formats), and architecture explanations are not alternatives.

### AsciiDoc skeleton

See [`skeletons/architecture.adoc`](skeletons/architecture.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
== Overview

image::karate-tools-flow.png[Karate Tools generation flow]

Karate Tools sits between an OpenAPI definition and a runnable test suite.
The generator (1) parses the API contract and produces feature files and
mock definitions; the runtime (2) executes them against the target
environment using the configuration resolved from `karate-config.js`; the
clients (3) extend the runtime with protocol-specific steps (JDBC, Kafka,
JMS, MongoDB).

The generator and the runtime are deliberately decoupled: generated tests
are plain Karate features with no dependency on the generator, so teams
can regenerate at any time — or stop generating — without touching the
suite that already exists.
```

### Quality checklist

- [ ] There is a diagram, and every component and arrow in it is explained in prose.
- [ ] The reader can place the product within its ecosystem (what talks to it, what it talks to).
- [ ] Key technical decisions are justified, not just enumerated.
- [ ] Detail level trusts the reader: technical, concrete, no hand-waving.
- [ ] If sections grew heavy, the page was split per the sizing rule (diagram stays here).
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **A diagram with no explanation.** The diagram orients; the prose convinces. Both or neither.
- **Describing the current implementation as if it were inevitable.** State the determinants and the trade-offs; that is what makes the page a technical validation.
- **Repository tour instead of architecture.** `src/utils/` is not a component. Describe runtime pieces and their communication, then map them to the code in Project structure.
- **Letting the page rot.** An architecture page that contradicts the code is worse than none. When a decision changes, this page changes.

---

## `glossary` ⚪

### Purpose & audience

A collection of terms and definitions that are specific to the product, its field, or its industry. For every reader, at any stage — it exists so that the rest of the documentation can use precise terminology consistently and with a single place to point to.

Include this page only if the product actually uses special vocabulary. A product whose terms are all industry-standard does not need one — skip it cleanly, no stub.

### Definitions as partials

Write each definition in its own partial (`partials/glossary/<term>.adoc`) and build the glossary page by including them. This makes every definition reusable: any other page that mentions the concept can include the same partial, and the definition stays identical everywhere — edit the partial, and every page that uses it updates.

### Section-by-section instructions

| Section                | Level | What to write                                                                                                                                                                                                                            |
| ---------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_  | 🔴    | One short paragraph: what this glossary covers and an invitation to use this terminology for clarity and consistency.                                                                                                                    |
| `== <Term>` (repeated) | 🔴    | One section per term, **in alphabetical order**. Define the term in one or two sentences, in this product's context — the definition itself lives in the term's partial (see above). Nest sub-concepts as `===` under their parent term. |

### Docouture blocks

| Use                                         | Block                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Marking a term's status next to its heading | `label:` pill — for example, `label:red[Deprecated]` or `label:orange[Beta]` |

Nothing else: a glossary is plain sections and prose by design.

### AsciiDoc skeleton

See [`skeletons/glossary.adoc`](skeletons/glossary.adoc) for the copyable AsciiDoc starting point.

And each partial (`partials/glossary/<term>.adoc`):

See [`skeletons/glossary-term-partial.adoc`](skeletons/glossary-term-partial.adoc) for the copyable AsciiDoc starting point.

### Quality checklist

- [ ] Every term is specific to the product or has a product-specific meaning — no dictionary entries for industry-standard words.
- [ ] Terms are in alphabetical order.
- [ ] Definitions are self-contained: no circular definitions (`Node: see Nodes`).
- [ ] Each definition lives in its own partial under `partials/glossary/`, and the page includes them.
- [ ] The terminology defined here is the one actually used across the rest of the docs.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Creating the page as a stub "for later".** An empty or two-term glossary is noise; per its ⚪ level, skip it until there is real vocabulary to define.
- **Defining generic terms.** `API` or `repository` do not belong here unless the product redefines them.
- **Glossary drift.** A term defined one way here and used another way in a guide is worse than no definition at all.
