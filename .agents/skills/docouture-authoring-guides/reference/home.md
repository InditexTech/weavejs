# Home page — authoring guide

The home page is the `ROOT` module's `index.adoc`. It is the site's storefront, not a documentation page. Its job is communication: think of it as a **product landing page**. In one screen, it must answer the visitor's four questions — **what is this? what is it for? what does it do? is it what I'm looking for?** The _how_ is what the documentation sections answer; the home opens the doors to them.

Two audiences at once:

- The **evaluator**, who landed here from a search or a repo link and asks those four questions — the hero, the capabilities, and the FAQ answer them.
- The **returning user**, who just wants to jump to a section — the Get started cards are their shortcuts.

**Every block should carry a visual** (video, gif, image, icon…). A landing without visuals is a wall of text: use short videos or gifs (the most attractive), real screenshots, or — when the product is code-first — a code block that summarizes the most important thing in a few lines.

**The product name and logo are not written on this page.** The hero's title renders the **site title** from `antora-playbook.yml`, and the product mark comes from the playbook's `productLogo` key (with `productLogoDark` for dark mode) — the `= Home` title is required by Antora but never shown. Set the site title to the product name: it is the biggest text on the page.

**Two layouts render this same content.** `:page-layout: home` is the default, two-column shape (hero beside the content column); `:page-layout: home-single` is a single-column sibling — same authoring surface, same blocks, same attributes, only the hero stacks above the content instead of sitting beside it at every breakpoint. Pick per site: `home-single` when the two-column split doesn't earn its keep for this product's content, `home` otherwise.

---

## `index.adoc` (ROOT) 🔴

### Purpose & audience

Convert an interested visitor into a user in one screen: answer the four questions (what is this, what is it for, what does it do, is it what I'm looking for), prove it with visuals, and hand over the shortest path to a first success (the tool's link (if any) or the quickstart). Written like a product landing page: engaging but factual — every claim must be backed by the documentation it links to.

### Section-by-section instructions

The `home`/`home-single` layouts render the blocks in a proposed **order (try to respect it)**. Some blocks may be optional, but when present they appear in this order:

| Section               | Level | What to write                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(header attributes)_ | 🔴    | The hero. The title itself is the **site title** (the product name) plus the playbook's `productLogo` — not authored here. `:description:` is the couple-lines value proposition. `:page-action:` is the primary CTA — the quickstart, or the product itself when it is an app; `:page-action-secondary:` the quickstart when the product is an app. Skip the actions you don't need. The media slot: prefer `:page-hero-video:` (a short video or gif showing the product in motion, with `:page-hero-video-poster:` as the still shown before it plays) over `:page-hero-image:` — use the image only when no motion visual exists. Either media form can opt into `:page-hero-image-bordered:` (a bare, presence-only attribute — no value) for a framed 10px-radius panel instead of the default bare media slot. |
| _(intro, no heading)_ | 🔴    | Engaging paragraphs: who the product is for and what it lets them do. Mention the core capabilities. This is the elevator pitch — distilled from `about`, not copied.                                                                                                                                                                                                                                                                                                                                                                 |
| `== Get started`      | 🔴    | The entry-point cards: the shortcuts into the most relevant pages of the documentation, quickstart is always first (subheader "Start here").                                                                                                                                                                                                                                                                                                                                                                                          |
| `== Key capabilities` | 🔴    | The `[feature-tabs]` showcase: a handful of top-level capabilities framed as **what the product lets the user do**, not as technical components — "build collaborative canvases", not "nodes, stores, and plugins". Each with a visual (gif, screenshot, or a short code block that summarizes it) and short prose ending in a "Learn more" link into the docs. If you have no visuals, use cards.                                                                                                                                    |
| `== <CTA>`            | 🟠    | One `[cta]` block making the case for a single action. In open source, this is the community door: fork, star, or contribute — you can link to the project repo or, better, request starring and following the repo.                                                                                                                                                                                                                                                                                                                  |
| `== FAQ`              | 🔴    | **Pre-adoption** questions: what can I build with it, is it free, can I use it commercially, which license, how do I request a feature. Usage questions belong in the `faq` page of Additional information — link there instead of duplicating. Same SEO/GEO rules as that page: questions phrased as people search them, self-contained answers.                                                                                                                                                                                     |

### Docouture blocks

| Use                        | Block                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Hero media                | `:page-hero-video:` + `:page-hero-video-poster:` (preferred) or `:page-hero-image:` + alt; either with `:page-hero-image-bordered:` to opt into a framed panel |
| Entry-point shortcuts     | `[cards,type=image-square,columns="1 s:2 m:4",width=container]` with `subheader=` per card  |
| Capability showcase       | `[feature-tabs]` — one `[feature,label="…"]` per capability, visual + prose + `[.cta]` link |
| The single call to action | `[cta]` with a `[.primary]` link                                                            |
| Pre-adoption FAQ          | `[accordion,aria-label="Frequently asked questions"]` + `[%collapsible]` items              |

### AsciiDoc skeleton

See [`skeletons/home.adoc`](skeletons/home.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Home
:page-layout: home
:page-nav-module: main
:description: Karate — the open-source test automation framework that unifies API and UI testing.
:page-tags: testing, automation, api
:page-action: Quickstart
:page-action-url: main:getting-started/quickstart.adoc
:page-action-secondary: See it in action
:page-action-secondary-url: https://karate.example.com/demo
:page-hero-video: home-hero.mp4
:page-hero-video-poster: home-hero.png

Created for developers, Karate is an open-source framework that lets you
write API and UI tests in plain, readable Gherkin — no glue code required.

- *One syntax for API and UI tests*. Write both in the same `.feature` files.
- *Parallel execution built in*. Split suites across workers with one flag.
- *Reports people actually read*. HTML reports with per-step timings.

== Get started

[cards,type=image-square,columns="1 s:2 m:4",width=container]
====
[card,subheader="Start here"]
.xref:main:getting-started/quickstart.adoc[Quickstart]
--
image::card-quickstart.png["Abstract study of folded paper, warm grey"]

Write and run your first test in ten minutes.
--

[card,subheader="Tasks"]
.xref:main:guides/overview.adoc[Guides]
--
image::card-guides.png["Abstract study of folded paper, cool grey"]

Step-by-step guides for the tasks you'll do most.
--

[card,subheader="Look it up"]
.xref:main:reference/overview.adoc[Reference]
--
image::card-reference.png["Abstract study of folded paper, sand"]

Every option, command, and API — exact and complete.
--

[card,subheader="Community"]
.xref:main:contributing/overview.adoc[Contributing]
--
image::card-contributing.png["Abstract study of folded paper, slate"]

Report bugs, improve the docs, or contribute code.
--
====

== Key capabilities

[feature-tabs]
====
[feature,label="Write tests your whole team can read"]
--
[source,gherkin]
----
Scenario: get a user
  Given url 'https://api.example.com/users/42'
  When method get
  Then status 200
  And match response.name == 'Ada'
----

Tests are plain Gherkin: anyone on the team can read and review them,
and most scenarios need no Java code at all.

[.cta]
xref:main:guides/write-your-first-suite.adoc[Learn more]
--

[feature,label="Cut your suite time with parallel runs"]
--
image::feature-parallel.gif[A suite splitting across five workers]

One flag splits your suite across workers, cutting execution time on
large suites by up to 70%.

[.cta]
xref:main:reference/cli.adoc[Learn more]
--
====

== Free & open source

[cta]
====
Karate is actively maintained and open for contributions — from bug
reports and typo fixes to new features.

[.primary]
https://github.com/example-org/karate/fork[Create a fork]
====

== Frequently asked questions

Have more questions? Check the xref:main:additional-information/faq.adoc[FAQ]
or contact us — we'll respond as quickly as possible.

[accordion,aria-label="Frequently asked questions"]
--
.Is Karate free to use and open source?
[%collapsible]
====
Yes. Karate is distributed under the Apache 2.0 License: you can use,
modify, and distribute it, including in commercial applications.
====

.Do I need to know Java to use Karate?
[%collapsible]
====
No. Tests are written in plain Gherkin `.feature` files; Java is only
needed for advanced custom extensions. See the
xref:main:getting-started/quickstart.adoc[Quickstart].
====
--
```

### Quality checklist

- [ ] The page answers the four questions in one screen: what is this, what is it for, what does it do, is it what I'm looking for.
- [ ] `:page-layout: home` (or `home-single`) and `:page-nav-module:` are set; the primary action points to the quickstart (or a live demo); the site title in `antora-playbook.yml` is the product name.
- [ ] The hero has a media: a video or gif of the product in motion when possible, an image otherwise.
- [ ] Capabilities are framed as what the product lets the user do, not as technical components.
- [ ] Every block carries a visual: video, gif, screenshot, or a summarizing code block.
- [ ] The intro pitch matches `about` — distilled, not contradictory, and not copied.
- [ ] Every block links into the documentation; the page adds no content that exists nowhere else.
- [ ] Cards cover entry points, quickstart first — not one card per page.
- [ ] FAQ holds pre-adoption questions only and links to the full FAQ page.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **A wall of marketing with no doors.** Superlatives without links convert nobody; every claim gets a "Learn more" into the docs.
- **Features named after the architecture.** "Nodes, stores, and plugins" tells the visitor nothing; "build collaborative canvases" does. Name what the user gets, not what the code contains.
- **The about page pasted on the home.** The home distills; `about` explains. If the two read the same, the home is too long or `about` too thin.
- **Feature tabs without visuals.** The block exists to show the product; without a gif, screenshot, or code block it is a slow bullet list — use cards instead.
- **Duplicated FAQs.** The same question answered here and in the `faq` page will diverge; split by intent (pre-adoption here, usage there) and cross-link.
