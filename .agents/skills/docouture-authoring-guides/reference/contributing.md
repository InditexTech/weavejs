# Contributing section — authoring guide

The Contributing section explains how to take part in the project and where the contribution rules live. In an open source project this section is the handshake with the community — but the canonical rules live in the repository (`CONTRIBUTING.md`, code of conduct, license), not in the docs. The docs page **summarizes and points**; it never duplicates.

Pages in this section:

| Page       | Level       | One-line purpose                                               |
| ---------- | ----------- | -------------------------------------------------------------- |
| `overview` | 🔴 required | The ways to contribute + links to the canonical repo documents |

This list is the minimum, not a ceiling: a product with more complex or more specific documentation needs can add more pages to this section (see [the skill guide](../SKILL.md#the-minimal-structure)) — like separate guidelines for third-party contributors and for product (core) developers.

### Adding this page to the nav

Even with a single required page, keep it a flat sibling under its section heading — no different from Guides or Reference once a repo adds a second Contributing page (e.g. separate guidelines for core vs. third-party contributors):

```adoc
* Contributing
* xref:overview.adoc[Overview]
```

See the `docouture-writing-docs-pages` skill for the full nav.adoc nesting rule.

---

## `overview` 🔴

### Purpose & audience

A warm, short page that tells a potential contributor the ways they can help and where the actual rules are. Two audiences at once: the **third-party contributor** who needs the process (fork, branch, PR, review) and the community norms; and the **user who just wants to help a little** (report a bug, fix a typo, improve a doc page) and should not need to read a process manual for that.

### Section-by-section instructions

| Section                 | Level | What to write                                                                                                                                                                               |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_   | 🔴    | A welcoming paragraph: contributions are wanted, and this page shows where to start.                                                                                                        |
| `== Ways to contribute` | 🔴    | The concrete entry doors, easiest first: report bugs (link to the issue tracker), suggest features, improve the documentation, contribute code. One line each with its direct link.         |
| `== Before you start`   | 🔴    | Links to the canonical documents with one line on what each covers: `CONTRIBUTING.md` (the process), the code of conduct, the license. Summarize in one sentence; never copy their content. |
| `== Development setup`  | 🔵    | Only a link to the development guide in Guides (when it exists) — not the setup itself.                                                                                                     |

### Docouture blocks

| Use                                       | Block                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Entry doors, when you want them prominent | `[cards]` (one card per way to contribute) — a plain list is equally valid for sober docs |

### AsciiDoc skeleton

See [`skeletons/contributing-overview.adoc`](skeletons/contributing-overview.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Contributing
:description: How to contribute to Karate.

We welcome contributions to Karate — from bug reports and typo fixes to
new features. This page shows you where to start.

== Ways to contribute

* *Report a bug* — open an issue in our
  link:https://github.com/example-org/karate/issues[issue tracker].
* *Suggest a feature* — open an issue explaining your idea. We'll refine
  it and decide next steps from there.
* *Improve the docs* — open an issue, or submit the fix directly in a
  pull request.
* *Contribute code* — read the contribution guide below and pick a
  link:https://github.com/example-org/karate/labels/good%20first%20issue[good first issue].

== Before you start

* link:https://github.com/example-org/karate/blob/main/CONTRIBUTING.md[Contribution guide] —
  the process: how to set up, branch, and submit a pull request.
* link:https://github.com/example-org/karate/blob/main/CODE_OF_CONDUCT.md[Code of conduct] —
  the behavior we expect in all project spaces.
* link:https://github.com/example-org/karate/blob/main/LICENSE[License] —
  what you agree to when you contribute.
```

### Quality checklist

- [ ] Every way to contribute has a direct, working link.
- [ ] `CONTRIBUTING.md`, the code of conduct, and the license are linked — and summarized in at most one sentence each, never copied.
- [ ] The low-effort doors (bug report, typo fix) come before the high-effort ones (code).
- [ ] Tone is welcoming — this page recruits.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Duplicating `CONTRIBUTING.md`.** The moment the process is written twice, one copy is wrong. The repo file is canonical; the docs page points to it.
- **Process-first pages.** Opening with branch naming conventions scares away the person who came to report a typo; lead with the easy doors.
- **Dead links to missing files.** If the repo has no `CODE_OF_CONDUCT.md` yet, omit the bullet — do not link a 404.
