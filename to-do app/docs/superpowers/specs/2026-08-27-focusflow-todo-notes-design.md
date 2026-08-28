# Design Document: QuietFlow (macOS To-Do & Note-Taking App)

**Date:** 2026-08-27  
**Status:** Approved by User  
**App Name:** **QuietFlow**  
**Target Platform:** macOS (Desktop)  
**Primary Tech Stack:** Tauri 2.0 + React + TypeScript + Tailwind CSS + Lucide Icons  

---

## 1. Overview & Goals

**QuietFlow** is a lightweight, calm, and lightning-fast desktop application for macOS designed to manage tasks, deliverables, and quick notes without cognitive overwhelm. 

### Core Goals (Phase 1)
- **Fast & Lightweight:** Minimal memory footprint (~30–50MB RAM), near-instant startup, native macOS feel.
- **Visual Aesthetic (Warm Sand & Forest Emerald):** Calm, organic, premium artisan theme with warm linen/sand canvas (`#FAF9F6`), crisp elevated white cards, rich forest emerald (`#065F46`) primary accents, and terracotta priority badges.
- **Local & Google Drive Compatible:** Stores all tasks and notes as human-readable Markdown files (`.md`) with YAML frontmatter in a user-selected folder (e.g., local Google Drive sync directory).
- **Task-Centric with Context:** Tasks have rich Markdown notes, context, checklists, and metadata attached.
- **Calm & Structured:** Prevents overwhelm using a dedicated "Today's Focus" view, collapsible nested folder structure (e.g., Customers > Acme Corp), and interchangeable List & Kanban views.
- **Rapid Capture:** Global customizable floating capture shortcut (`Option+Shift+Space` default) and in-app keyboard-first quick add (`Cmd+N`).

### Future Extensibility (Phase 2 & Beyond)
- Direct Google Drive API integration and meeting notes import.
- Local/Cloud AI classification and automated deliverable extraction.

---

## 2. Architecture & Data Model

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       macOS Desktop                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Tailwind CSS)               │
│   • Today / Focus Dashboard                                 │
│   • Nested Folder Sidebar (Customers, Projects, Ops)        │
│   • Projects & Deliverables View (List & Kanban toggle)     │
│   • Split/Slideout Task Note Editor (Markdown + Checklist)  │
│   • Floating Quick-Capture Modal (Global Hotkey summon)     │
├──────────────────────────┬──────────────────────────────────┤
│                          │ Tauri IPC (Commands & Events)    │
│  Tauri Core (Rust)       ▼                                  │
│   • Window Manager (Main App Window + Quick Capture Window) │
│   • Global Shortcut Service (Option+Shift+Space)            │
│   • File System Service (CRUD Markdown & Atomic Writes)     │
│   • Directory Watcher (`notify` crate for live Drive sync)  │
├─────────────────────────────────────────────────────────────┤
│  Local Vault Directory (e.g., ~/Google Drive/QuietFlow/)    │
│   ├── .quietflow/config.json (Preferences & Keybinds)       │
│   ├── today.md (Daily focus scratchpad)                     │
│   ├── Customers/                                            │
│   │   ├── Acme Corp.md                                      │
│   │   └── Beta Health.md                                    │
│   ├── Internal/                                             │
│   │   └── Operations.md                                     │
│   └── archive/                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Storage Schema & Markdown Format

All data is human-readable Markdown with YAML frontmatter.

#### Example: `Customers/Acme Corp.md`
```markdown
---
id: cust-acme-corp
title: Acme Corp
category: Customers
created_at: 2026-08-27T22:00:00Z
updated_at: 2026-08-27T22:50:00Z
tags:
  - enterprise
  - q3-deliverables
---

# Deliverables & Tasks
- [ ] Review security audit checklist @due(2026-09-01) @priority(high) #deliverable
  - Notes: Coordinate with internal SecOps for findings report.
- [/] Draft master service agreement revision @status(in-progress)
- [x] Finalize contract renewal pricing @completed(2026-08-27)

# Meeting Notes & Context
### Q3 Planning Call (Aug 27)
- Key stakeholder: Sarah Connor (Head of Procurement)
- Goal: Finalize SLA terms before September 15.
- Budget approval confirmed.
```

#### Markdown Parsing Rules:
- **Non-Destructive Parsing:** The parser extracts tasks via regex/AST without modifying surrounding markdown headings, code blocks, or unstructured text.
- **Task Status Mapping:**
  - `- [ ]` -> `todo` (or `backlog` if no due date)
  - `- [/]` or `@status(in-progress)` -> `in-progress`
  - `- [x]` -> `done`
- **Metadata Annotations:**
  - `@due(YYYY-MM-DD)`: Due date
  - `@priority(low|medium|high)`: Task priority
  - `#tag`: Project / categorization tag
  - Indented sub-bullets (`- Notes:...` or `- [ ]...`): Task context or subtasks.

---

## 3. User Interface & Workflow

### 3.1 3-Panel Layout

```
┌──────────────┬───────────────────────────────────┬─────────────────────────────────┐
│ Sidebar      │ Main View (Focus / Project)       │ Task Detail & Notes Panel       │
├──────────────┼───────────────────────────────────┼─────────────────────────────────┤
│ 🎯 Today     │ 🎯 Today's Focus                  │ 📝 Task Detail                  │
│ 📥 Inbox     │ [ Quick Add: Press 'Cmd+N' ]      │ Title: Review security audit    │
│ ⭐ Starred   │ ───────────────────────────────── │ Status: [ In Progress ▾ ]       │
│ ───────────  │ ▢ Review security audit checklist │ Due: Sep 01, 2026               │
│ FOLDERS      │   📅 Sep 01  🏷️ #deliverable       │ Priority: [ High ▾ ]            │
│ ▼ 📁 Customers│ ▣ Draft master service agreement │ Folder: Customers > Acme Corp   │
│   ├── Acme   │   ⏳ In Progress                  │ ─────────────────────────────── │
│   └── Beta   │                                   │ Markdown Notes & Context:       │
│ ▸ 📁 Internal│ [ View:  ☰ List | ☷ Kanban ]      │ • Coordinate with SecOps        │
│ ───────────  │                                   │ • Findings report attached      │
│ 🗄️ Archive   │                                   │ • [Subtask checklist...]        │
│ ⚙️ Settings  │                                   │                                 │
└──────────────┴───────────────────────────────────┴─────────────────────────────────┘
```

1. **Collapsible Sidebar:**
   - **System Views:** `🎯 Today` (tasks due today or focused), `📥 Inbox` (unassigned quick notes/tasks), `⭐ Starred`.
   - **Nested Folder Tree:** Real filesystem subdirectories with accordion collapse (`📁 Customers > 📄 Acme Corp`).
   - **Archive & Settings:** Manage vault preferences, shortcuts, and completed task archives.
2. **Main Content Area:**
   - **Top Quick-Add Bar:** Add task with natural language parsing (`Cmd+N`).
   - **Dual Views Switcher:**
     - **List View:** Clean prioritized list with drag-and-drop reordering, inline checkboxes, and tag chips.
     - **Kanban Board:** Columns for *Backlog*, *To Do*, *In Progress*, and *Done* with drag-and-drop card movement.
3. **Slide-Out Task Context & Note Editor:**
   - Appears on the right when a task is selected.
   - Provides full Markdown editing (bullet points, bold, headings, checklists) attached directly to the task context.

---

## 4. Quick Capture & Keyboard Workflows

### 4.1 Global Quick-Capture Window
- **Default Hotkey:** `Option+Shift+Space` (registered at the macOS system level).
- **Behavior:** Summons a minimalist, translucent floating window above any active macOS application.
- **Input:** Single-line input with auto-suggestions for destination folder (`Customers/Acme Corp`) and priority.
- **Action:** Pressing `Enter` writes directly to disk and dismisses the window immediately.

### 4.2 In-App Keyboard Shortcuts
- `Cmd+N`: New Task in active folder/view.
- `Cmd+Shift+F` / `Cmd+K`: Search & Command Palette.
- `Cmd+1` / `Cmd+2` / `Cmd+3`: Switch between *Today*, *Inbox*, and *Folder Tree*.
- `Cmd+B`: Toggle Sidebar for minimal distraction-free mode.
- `Space`: Toggle checkbox status (when task row selected).
- `Enter`: Open task detail & notes panel.
- `Esc`: Close notes panel / dismiss modals.

---

## 5. Reliability, File Watching & Sync

### 5.1 Real-Time Local Sync
- **Watcher:** The Rust backend registers a recursive file watcher (`notify` crate) on the vault root.
- **External Edits:** If Google Drive synchronizes changes from another device or the user edits files in another text editor, the UI updates reactively without clobbering active input.

### 5.2 Safe Atomic File Writes
- Writes are executed by saving to `.filename.tmp` and performing an atomic rename, ensuring zero file corruption during system sleep, sudden exit, or concurrent cloud sync events.

---

## 6. Testing & Validation Plan

1. **Markdown Engine Unit Tests:**
   - Test AST parsing of varied Markdown structures, YAML frontmatters, indentation depths, and custom checkboxes (`- [ ]`, `- [/]`, `- [x]`).
   - Verify that modifying a task never removes or alters unrelated markdown content or meeting notes.
2. **File System & Watcher Integration Tests:**
   - Test folder creation, file renames, atomic saves, and rapid concurrent file updates.
   - Test external file modification propagation through Tauri IPC events.
3. **UI & Keyboard Navigation Tests:**
   - Verify hotkey triggers (`Cmd+N`, `Cmd+K`, `Space`, `Esc`).
   - Verify drag-and-drop state updates in both List and Kanban views.
   - Verify folder tree expansion, collapse, and active item highlighting.

---

## 7. UI Wireframes (Stitch Project)

**Stitch Project ID:** `16839941045420800332`  
**Design System:** Contemporary Minimalist macOS (`QuietFlow`)

| Screen | Description | Stitch Screen ID |
| :--- | :--- | :--- |
| **Dashboard & Task Detail** | 3-column macOS layout: nested folder tree, Today's Focus list, and slide-out markdown note editor. | `4e4bb32cd7654978b14261c29d2e59c3` |
| **Kanban Board View** | Stage columns (*Backlog*, *To Do*, *In Progress*, *Done*) with draggable cards and metadata pills. | `73b0af9e69c24686aed1a7164d9527b9` |
| **Quick Capture Spotlight** | Floating translucent modal (`Option+Shift+Space`) with fast natural-language capture and folder routing. | `9f0ab5161e294f78b2fe158fcea0849e` |
