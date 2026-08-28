# Design Document: QuietFlow Usability, Folder Auto-Seeding, 30+ Celebrations & Playwright E2E Testing

**Date:** 2026-08-28  
**Status:** Approved by User  
**App Name:** **QuietFlow**  

---

## 1. Overview & User Journey Objectives

This specification addresses usability friction and introduces delight features to elevate QuietFlow into a polished, cognitive-friendly task and note manager for macOS.

### Key Goals:
1. **First-Level Folder Auto-Seeding:** Creating a top-level folder immediately auto-creates its primary note (e.g. `PRivia/PRivia.md`), seeds default headers, and selects it.
2. **Context-Aware Note Naming:** Creating notes inside folders defaults to `[FolderName] - [Month DD]` (e.g. `PRivia - Aug 28`) with an inline rename prompt.
3. **Restructured Focus Bucket Logic:**
   - **NOW:** Tasks due today, overdue, OR in-progress (`status === 'in-progress' || isDueToday || isOverdue`).
   - **LATER / BACKLOG:** Future scheduled due dates OR `status === 'backlog'` (without high priority due today).
   - **ALL:** Full task scope.
4. **Fix 100% SVG Progress Ring Artifact:** Correct the stroke offset computation and `strokeLinecap="round"` overlapping bug when `percentage === 100`.
5. **Dopamine Celebration Engine (30+ Varied Animations):**
   - High-performance canvas confetti/particle system with 30+ distinct celebration themes: Unicorn bursts, Rainbow sparkles, Emerald gemstones, Solar flares, Zen pebbles, Fireworks, Neon comets, Origami cranes, Starfall, Sakura petals, etc.
   - Triggers randomly upon completing a task or reaching 100% completion on a note.
6. **Folder & Note Context Menu (Left-Click "..." & Right-Click):**
   - Rename, Add Note, Add Subfolder, Delete, and **Set Folder Icon / Upload Company Logo** (with auto-resize/crop to neat avatar proportions).
7. **Organized Collapsed Sidebar with Folder Icons & Tooltips:**
   - Shows chosen emojis/icons/uploaded logos with smooth floating native tooltips on hover.
8. **Interactive Archive & Task Restore Modal:**
   - Lists archived/completed tasks grouped by date and origin note with instant "Restore Task" action.
9. **Global & Folder-Scoped Kanban:**
   - Clicking a folder or note scopes both List and Kanban views to all tasks in that subtree.
10. **QuickAddBar Length Optimization:**
    - Refactored max-width to `max-w-2xl` for balanced, non-stretched input ergonomics.
11. **Drag-and-Drop Fixes:**
    - Resolves drag-and-drop targeting for Inbox tasks and folder targets.
12. **Playwright & Desktop Driver Journey Tests:**
    - Complete end-to-end user journey tests for all new features saved under `tests/e2e/playwright-user-journey.spec.ts`.

---

## 2. Component & Architectural Changes

### 2.1 Celebrations Engine (`src/utils/celebrations.ts`)
- Lightweight canvas particle renderer with 32 distinct theme configurations (shapes, color palettes, physics, unicorn/star/gemstone assets).
- Graceful animation frame cleanup.

### 2.2 Folder & File Context Actions (`src/components/sidebar/FolderContextMenu.tsx`)
- Popover/context-menu supporting:
  - Inline rename
  - Create Note (`[FolderName] - [Month DD]`)
  - Create Subfolder
  - Upload Custom Folder Logo / Choose Emoji
  - Delete

### 2.3 Archive & Task Restoration Modal (`src/components/archive/ArchiveModal.tsx`)
- Reads archive markdown files / completed tasks.
- Renders task cards with tags, completed timestamp, original source path, and "Restore" button that calls `useVaultStore.addTask` and removes from archive.

---

## 3. Verification Plan

1. **Playwright E2E User Journey Test Suite (`tests/e2e/playwright-user-journey.spec.ts`):**
   - Journey 1: Create folder -> auto-created primary note -> add task -> check note name.
   - Journey 2: Focus bucket filtering (Now vs Later vs All).
   - Journey 3: 100% progress ring completion & celebration trigger.
   - Journey 4: Context menu actions (rename, set icon/logo, delete).
   - Journey 5: Archive modal opening and task restoration.
   - Journey 6: Drag-and-drop task from Inbox into folder.
2. **Vitest Suite (`npm test`):**
   - Ensure all unit and component tests pass.
3. **Build Checks:**
   - `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.
