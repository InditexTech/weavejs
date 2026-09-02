# @inditextech/docouture-antora-extensions

Registered under `antora-playbook.yml`'s **`antora.extensions`** key — a different key,
and a different kind of extension, from `docouture-writing-docs-pages`' `asciidoc.extensions`
(`@inditextech/docouture-asciidoc-extensions`). This one hooks Antora's own site-generation
pipeline rather than the AsciiDoc processor; listing either package under the other's key
makes Antora log a warning and skip it.

One package require registers five sub-extensions together — they can't be enabled
individually:

| sub-extension         | reads                                                             | does                                                                                                                                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| module switcher       | `nav_modules:` in `docs/src/antora.yml`                           | stamps each nav tree with its module/title/description/icon, so the UI can show one module's nav at a time with a switcher — see `reference/page-patterns.md`'s "Mono-module vs. multi-module" section. A no-op until `nav_modules:` is authored                                                       |
| site footer           | `footer:` in `docs/src/antora.yml`                                | resolves a structured `footer: groups: […]` list of link groups and attaches it to the component version, for the UI's footer partial. A no-op until `footer:` is authored                                                                                                                             |
| search index          | (nothing authored)                                                | builds a full-text search index at build time, published per component version. **This is what the UI bundle's own search dialog reads** — without this extension registered, the search UI renders but has nothing to search                                                                          |
| `llms.txt` generation | `llms:` in `docs/src/antora.yml` (optional `summary`/`exclude`)   | generates `llms.txt` and `llms-full.txt` at the site root — a Markdown index and full dump, meant for LLM ingestion (see `https://llmstxt.org`), so an AI agent (or another tool) can read the site without scraping rendered HTML                                                                     |
| Shiki prewarm         | `asciidoc.attributes.source-highlighter` in `antora-playbook.yml` | pre-builds the Shiki syntax highlighter once, up front. Only useful if `source-highlighter: shiki` is actually set — this site keeps Antora's default `highlight.js` instead, so this sub-extension runs unconditionally but has nothing to prewarm for. Harmless, just a small unused build-time cost |

## Authoring the optional keys

All three authored keys (`nav_modules`, `footer`, `llms`) live in `docs/src/antora.yml`,
not the playbook — `site.keys` there is declared as a flat primitive map and can't carry
a nested list, so the component descriptor is the one place a nested structure can be
authored:

```yaml
# docs/src/antora.yml
nav_modules:
  - module: framework
    title: Framework
    description: One-line description.
    icon: design/grid-outlined

footer:
  groups:
    - title: Resources
      links:
        - text: Home
          url: ROOT:index.adoc
        - text: Repository
          url: https://github.com/example/example

llms:
  summary: >-
    One or two sentences describing what this site documents — becomes the
    blockquote under the site title in the generated llms.txt.
  # exclude:
  #   - module:some-internal-page.adoc
```

`url`/`links[].url` values are either a page ID (the same string `xref:...[]` accepts) or
a literal URL — a page ID that resolves to nothing is dropped with a warning rather than
rendered dead.
