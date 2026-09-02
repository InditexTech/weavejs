# Maintenance loop

This skill is meant to be re-entered continually, not run once and abandoned. This file is
how a later pass picks up where an earlier one left off, without re-deriving everything
from zero.

## The documentation-state ledger, in `AGENTS.md`

`AGENTS.md` (this repo's own copy, at the repository root) carries a `## Documentation
state` section — a table of every page `docouture-getting-started`/`docouture-documenting-changes`
has drafted from the code itself, what it was derived from, and its last-known status:

```markdown
## Documentation state

<!-- maintained by the docouture-documenting-changes skill — do not hand-edit structure, only content -->

| doc page              | derived from              | status  |
| --------------------- | -------------------------- | ------- |
| reference/client.adoc | src/api/client.ts exports | current |
| guides/cli-usage.adoc | src/cli/*.ts command defs | current |
| index.adoc (home)     | manual (hand-written)      | —       |
```

Rules for this table:

- Add a row **only** for pages sourced from the repo's code (`content-sourcing.md`'s step
  3, in `docouture-getting-started`). A page sourced from existing docs/README, or written by
  hand, gets `derived from: manual` and `status: —` — this marks it as human-owned; never
  regenerate it from code without being asked.
- `derived from` should be specific enough that a future pass can check whether it's still
  accurate — a file path, an export list, a schema file, a command name — not just "the
  code".
- `status` is one of: `current` (checked recently, still matches), `stale` (the source has
  changed since this page was last touched), `new` (a source exists with no page yet — see
  below).
- This skill is the only thing that edits this section. If a human directly edits a
  code-derived page's prose, that's fine and expected — but flip its `status` to something
  worth re-checking next time rather than silently trusting the table, since the ledger
  itself won't have seen the edit.

## What counts as drift, on re-entry

On each re-entry, before drafting anything new:

1. Re-scan the repo's surface the same way `docouture-getting-started`'s
   `content-sourcing.md` step 3 describes — exports, CLI commands, config keys, API
   definitions.
2. Diff that surface against the ledger's `derived from` entries: a new export/command/key
   with no matching row is `new` (undocumented); a row whose source has materially changed
   (signature changed, command removed, config key renamed) is `stale`.
3. Also check `nav.adoc` against the modules/pages that actually exist — a module or page
   present in the ledger or on disk but absent from `nav.adoc` is unreachable, not just
   undocumented (see `docouture-docs-internals`).
4. **Check for a new candidate artifact module** — in a monorepo already using the
   per-artifact-module strategy (`docouture-getting-started`'s `reference/structure-planning.md`),
   a new publishable package with no matching `docs/src/modules/<artifact>/` is a
   candidate for its own module, same "propose, don't auto-commit" rule as the initial
   pass — flag it, don't create it unasked.
5. Handle `new` and `stale` rows (and any flagged candidate module) before anything else;
   leave `current` and `manual` rows alone.

## Revisiting the home page

The home page is drafted early (rough) and deliberately left unfinished — see
`docouture-getting-started`'s `structure-planning.md`. Revisit and tighten it:

- once every planned module/page from the first structure pass exists with real content,
  not stubs, or
- whenever a re-entry adds or removes a whole module (the home page's "key capabilities"
  section should reflect what the site now actually covers).

There is no ledger row requirement for the home page itself when it's substantially
hand-written — mark it `manual` once someone has actually rewritten its prose, same as any
other hand-authored page.
