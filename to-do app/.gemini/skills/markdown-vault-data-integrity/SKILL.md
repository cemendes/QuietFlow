---
name: markdown-vault-data-integrity
description: Rules and architectural constraints for manipulating local Markdown files, preserving YAML frontmatter, atomic file writing, and parsing task items.
---

# Markdown Vault & Data Integrity Skill

QuietFlow is an **offline-first, local-first** application. Users trust QuietFlow with their personal notes. Follow these strict data invariants when modifying Markdown parsing or file I/O.

## 1. Atomic File Writes (Zero Corruption)
Never write directly over an existing `.md` file with a raw destructive write. Always use atomic writing patterns:
1. Write content to a temporary UUID file: `[path].tmp.[uuid]`
2. Atomically rename/replace the target file: `fs::rename(tmp_path, target_path)`

## 2. YAML Frontmatter Preservation
- When reading or updating notes, never strip unknown frontmatter keys.
- Preserve frontmatter delimiter markers (`---`).
- Standard fields: `title`, `date`, `tags`, `status`.

## 3. GitHub Flavored Markdown Task Standards
Tasks are parsed line-by-line using standard checkbox syntax:
- `[ ]` $\rightarrow$ Todo (`status: 'todo'`)
- `[/]` $\rightarrow$ In-Progress (`status: 'in-progress'`)
- `[x]` or `[X]` $\rightarrow$ Done (`status: 'done'`)
- Indented child checkboxes (`  - [ ]`) $\rightarrow$ Subtasks (`subtasks: []`)

## 4. Metadata Tags & Attributes
- Priorities: `@priority(high)`, `@priority(medium)`, `@priority(low)` or `@high`, `@med`, `@low`.
- Due dates: `@due(YYYY-MM-DD)`.
- Tags: `#tag-name`.
