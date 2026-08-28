# 🏛️ QuietFlow Technical Architecture

QuietFlow is an offline-first, neurodivergent-optimized task and note management app. It bridges the speed and permanence of local plaintext Markdown with native desktop performance.

---

## 🏗️ High-Level System Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                          QuietFlow UI (React 18)                       │
│  • TaskList (Now / Later Focus Buckets)   • Zen Theater Focus Mode     │
│  • Kanban Board (WIP Limits)              • Magic Slicer (Gemini AI)   │
│  • Slide-Over Markdown Task Drawer        • Breadcrumb Re-entry Banner │
│  • 30+ Particle Celebration Engine        • Web Audio Feedback Ticks   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Zustand State Store
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Universal Storage Layer (IPC)                   │
├───────────────────────────────────┬────────────────────────────────────┤
│   macOS / Desktop (Tauri v2 Core) │   Browser / PWA Web Mode           │
│   • Rust FS Engine (Atomic write) │   • In-Memory Local Vault Engine   │
│   • FSEvents File Watcher         │   • LocalStorage Persistence       │
│   • Native Window Overlay         │   • Offline Web Worker             │
└───────────────────────────────────┴────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Plaintext Markdown Files                        │
│   • YAML Frontmatter Header: title, tags, date, status                 │
│   • Checkbox Checklist: - [ ] Task title @priority(high) #tag          │
│   • Indented Subtasks:   - [ ] Subtask step                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Data Model & Storage

QuietFlow treats the local filesystem as the single source of truth:
1. **Markdown Documents**: Every note is a `.md` file with standard YAML frontmatter (`title`, `tags`, `status`).
2. **Tasks Representation**: Tasks are parsed from GitHub Flavored Markdown `- [ ]` checklist items.
3. **Atomic File Writes**: Rust backend writes to temporary files first (`.tmp`), then renames atomically to prevent file corruption during OS power loss.
4. **Zero Cloud Lock-in**: Your vault is 100% portable and readable by Obsidian, Logseq, VS Code, or standard text editors.

---

## 🧠 Cognitive Neurodiversity Architecture

| Feature | ADHD / Neurodivergent Need Addressed | Technical Implementation |
| :--- | :--- | :--- |
| **"One-Thing" Zen Theater** | Eliminates task paralysis & decision fatigue. | Fades all background panels; renders 1 task with a 25m clockwise luminous SVG time-sweep (no ticking digits). |
| **"Magic Slicer"** | Dismantles the "Wall of Awful" (initiation barrier). | Calls `gemini-2.5-flash` API endpoint or offline heuristic engine to output 3–5 bite-sized `- [ ]` checklist subtasks. |
| **"Breadcrumb Trail"** | Resolves working memory leakage after distractions. | Detects idle time >15m via `visibilitychange` and offers a 1-click guilt-free resume toast. |
| **Dopamine Micro-Rewards** | Executive stimulation & task completion closure. | Canvas particle engine (Unicorns, Minions, Smurfs, Doge, Rainbows) + Web Audio mechanical clicks. |
| **Now / Later Buckets** | Binary triage without calendar dread. | Dynamically computes tasks into `NOW` (due today, overdue, in-progress) vs `LATER` (future due dates). |
