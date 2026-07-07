# Domain Docs

Configured layout: single-context.

Engineering skills should consume this repo's domain documentation from the root context.

## Before exploring, read these

- `CONTEXT.md` at the repo root.
- `docs/adr/` for ADRs that touch the area you're about to work in.

If any of these files don't exist, proceed silently. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure

```text
/
|-- CONTEXT.md
|-- docs/
|   `-- adr/
`-- src/
```

## Use the glossary's vocabulary

When your output names a domain concept, use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, either reconsider the language or note the gap for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding.
