# QuietFlow Neurodiversity & Cognitive Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform QuietFlow into a gold-standard calm, neurodiversity-accessible desktop app by reducing visual clutter (2-panel layout with slide-over drawer), ensuring zero-friction quick capture into Inbox, adding WIP limits on Kanban boards, implementing "Now vs. Not Now" focus filtering, and delivering sensory completion micro-rewards.

**Architecture:** 
1. **Layout & Focus:** Refactor the 3-column layout in `App.tsx` and `TaskDetailPanel.tsx` into a 2-panel default (Sidebar + Main Canvas) with an animated slide-over overlay drawer for task details that prevents layout shifts.
2. **Frictionless Capture:** Update `QuickCaptureModal.tsx` and global shortcut handling to default directly to `Inbox.md` with zero required dropdown clicks.
3. **Cognitive Constraints & Filtering:** Update `KanbanBoard.tsx` and `useVaultStore` to enforce configurable WIP limits (default max 3 on *In Progress*) and provide a "Now vs. Not Now" filter bucket.
4. **Sensory Micro-Rewards:** Add web audio / haptic vibration triggering on checkbox click and a daily progress counter widget in the `Today` focus header.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Lucide Icons, Vitest, React Testing Library.

## Global Constraints
- Do not break existing Markdown frontmatter or non-destructive parsing rules in `src/store/parser.ts`.
- Ensure full keyboard accessibility (`Cmd+B`, `Cmd+N`, `Escape`, `Space`).
- Maintain the Warm Sand (`#FAF9F6`) and Forest Emerald (`#065F46`) color theme.

---

### Task 1: 2-Panel Layout & Slide-Over Drawer Overlay
- [ ] Step 1: Write failing test suite in `src/components/editor/TaskDetailPanel.test.tsx` for Slide-Over Drawer overlay and Escape dismissal
- [ ] Step 2: Run test suite to verify it fails (`npm test src/components/editor/TaskDetailPanel.test.tsx`)
- [ ] Step 3: Implement slide-over overlay in `TaskDetailPanel.tsx` and update `App.tsx`
- [ ] Step 4: Run test suite to verify it passes
- [ ] Step 5: Commit changes

### Task 2: Zero-Friction "Inbox-First" Global Quick Capture
- [ ] Step 1: Write the failing test in `src/components/capture/QuickCaptureModal.test.tsx` for Inbox-first capture
- [ ] Step 2: Run test suite to verify it fails (`npm test src/components/capture/QuickCaptureModal.test.tsx`)
- [ ] Step 3: Update `QuickCaptureModal.tsx` for immediate autofocus and instant Enter submission
- [ ] Step 4: Run test suite to verify it passes
- [ ] Step 5: Commit changes

### Task 3: Kanban Work-In-Progress (WIP) Limits
- [ ] Step 1: Write the new test suite `src/components/kanban/KanbanWipLimit.test.tsx` for WIP limit warnings
- [ ] Step 2: Run test suite to verify it fails (`npm test src/components/kanban/KanbanWipLimit.test.tsx`)
- [ ] Step 3: Implement WIP limit logic and soft visual badge in `KanbanColumn.tsx` and `KanbanBoard.tsx`
- [ ] Step 4: Run test suite to verify it passes
- [ ] Step 5: Commit changes

### Task 4: "Now vs. Not Now" Focus Filtering & Daily Progress Ring
- [ ] Step 1: Write the new test suite `src/components/tasks/FocusHeader.test.tsx` for completion tally and Now/Not Now filter
- [ ] Step 2: Run test suite to verify it fails (`npm test src/components/tasks/FocusHeader.test.tsx`)
- [ ] Step 3: Implement `FocusHeader.tsx` with progress ring, subtle counter, and Now/Not Now toggle
- [ ] Step 4: Run test suite to verify it passes
- [ ] Step 5: Commit changes

### Task 5: Tactile Completion Feedback & Audio/Haptic Micro-Rewards
- [ ] Step 1: Write the new test suite `src/utils/feedback.test.ts` for audio synthesizer click fallback
- [ ] Step 2: Run test suite to verify it fails/passes (`npm test src/utils/feedback.test.ts`)
- [ ] Step 3: Implement Web Audio API subtle mechanical click sound + strike-through animation
- [ ] Step 4: Run full verification test suites across entire app (`npm test`, `npm run build`, `cargo check --manifest-path src-tauri/Cargo.toml`)
- [ ] Step 5: Commit changes
