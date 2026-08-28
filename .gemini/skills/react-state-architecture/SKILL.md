---
name: react-state-architecture
description: Zustand store selector optimizations, Markdown frontmatter caching & indexing performance, keyboard focus management, and modular component composition.
---

# React State Architecture Skill

## Core Principles
1. **Zustand Selector Optimization**: Use fine-grained Zustand selector hooks (`useVaultStore((state) => state.activeFile)`) to minimize unnecessary component rerenders.
2. **Markdown Frontmatter & AST Caching**: Parse Markdown into structured ASTs non-destructively. Maintain clean document separation between metadata frontmatter and task list items.
3. **Keyboard Focus & Modal Accessibility**: Trap focus in modals (Quick Capture, Settings), handle `Escape` dismissing, and enable global macOS shortcuts (`Cmd+K`, `Option+Shift+Space`, `Cmd+N`).
4. **Optimistic State Updates**: Apply immediate local state transitions on user action, accompanied by async atomic disk persistence and background error recovery.
