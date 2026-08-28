---
name: react-state-architecture
description: Best practices for React 18+, Zustand store optimization, Markdown parsing performance, custom hook design, and UI state synchronization.
---

# React State & Component Architecture Skill

Use this skill when building or refactoring React components, Zustand state stores, Markdown frontmatter parsers, or complex interactive UI views (Kanban, Drawers, Modals).

## 1. Zustand Store Architecture & Selectors
- **Atomic Selectors**: Always select only the minimum required state slice to avoid unnecessary component re-renders:
  ```tsx
  // Good: Re-renders only when activeTaskId changes
  const activeTaskId = useVaultStore((state) => state.activeTaskId);

  // Avoid: Re-renders on any store update
  const { activeTaskId, vaultTree } = useVaultStore();
  ```
- **Async Actions**: Keep asynchronous filesystem/IPC calls encapsulated inside store actions or dedicated service layers, keeping UI components purely declarative.

## 2. Markdown Parsing & Performance Optimization
- **Memoization**: Parsing frontmatter (`gray-matter`) and AST traversing large collections of Markdown files can block the main thread.
- Use `useMemo` or debounced indexing workers when computing derived task lists, tag aggregations, or Kanban column states.
- Cache parsed file metadata keyed by file path and modified timestamp (`mtime`).

## 3. Keyboard Shortcut & Focus Management
- For modals (e.g. Quick Capture Spotlight, Settings), trap focus and handle `Escape` keys cleanly.
- Clean up all event listeners and global Tauri shortcuts in `useEffect` return statements to avoid duplicate event dispatching or memory leaks.

## 4. Component Co-location & Clean Composition
- Keep domain components modular (`components/kanban/`, `components/tasks/`, `components/sidebar/`, `components/editor/`, `components/capture/`).
- Use class merging utility (`clsx` + `tailwind-merge` via `cn(...)`) for dynamic Tailwind styling.
