# The four names that must agree

Four independent files each carry a name that has to match another one, or the site
builds to zero pages, or fails outright with "start page not found". `docouture doctor` checks
every pair automatically — run it after any rename.

| name           | set in                                                  | must match                                                                                                                                 |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| component name | `docs/src/antora.yml` → `name`                          | the `<component>::` prefix of the playbook's `site.start_page`                                                                             |
| start page     | `antora-playbook.yml` → `site.start_page`               | a real file under `modules/ROOT/pages/` (or whichever module it names)                                                                     |
| content path   | `antora-playbook.yml` → `content.sources[0].start_path` | where `docs/src/antora.yml` actually is, repo-root relative — `docs/src` for a site scaffolded as-is                                       |
| package name   | `docs/package.json` → `name`                            | no hard requirement on its own, but conventionally matches the component name — this is what `docouture new <name>` sets both to initially |

## Why each one matters

- **Component name vs. start page.** `site.start_page: my-site::index.adoc` names a
  component (`my-site`) and a page (`index.adoc`) inside it. If `docs/src/antora.yml`'s
  own `name:` says something else, Antora has no component by that name to serve the
  start page from — the whole site 404s at `/`.
- **Start page vs. an actual file.** `site.start_page` must point at a page that exists
  under that component's `pages/` tree (respecting the module, if the reference names
  one: `my-site:some-module:index.adoc`). A typo here is "start page not found" at build
  time, not a runtime 404.
- **Content path vs. where the descriptor really is.** `content.sources[0].start_path` is
  repo-root relative. Move `docs/src/antora.yml` (or rename the outer `docs/` directory)
  without updating `start_path` and Antora aggregates zero pages — no error, just an
  empty site, because the path it looked in wasn't a component root at all.
- **Package name.** Not load-bearing for Antora itself, but drift here is a strong signal
  something else drifted too (a manual rename that missed a file) — `docouture doctor` flags
  it for that reason.

## Fixing a drift

Renaming the site after scaffolding means touching three of the four in lockstep:

1. `docs/src/antora.yml` → `name:`
2. `antora-playbook.yml` → `site.start_page`'s component prefix
3. `docs/package.json` → `name`

`content.sources[0].start_path` only needs touching if the _directory_ moved, not if just
the component's `name:` changed.
