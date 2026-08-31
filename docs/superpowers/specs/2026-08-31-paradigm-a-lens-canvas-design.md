# 🌿 QuietFlow — Paradigm A: The "Lens" Document Canvas Design Spec

## 1. Executive Summary & Goals

QuietFlow organizes files into customer/project folders (e.g. `Acme Corp/`, `Stripe/`, `Internal/`). However, documents have historically only exposed `- [ ]` checklist lines, dropping surrounding meeting minutes, technical requirements, and context into unrendered text.

**Paradigm A: The "Lens" Document Canvas** upgrades every `.md` document in the vault into a dual-zone workspace:
- **Top Zone (Action Items)**: Automatically hoists and renders all `- [ ]` tasks as interactive cards with priority tags, subtasks, and deadlines.
- **Bottom Zone (Meeting Notes & Prose)**: Renders freeform markdown notes, meeting takeaways, and code snippets.
- **3-Way Lens Toggle**: A 1-click header pill (`[ ✨ Split View | ✅ Tasks Only | 📝 Notes Only ]`) that lets users fold away notes during task execution, or fold tasks during deep reading and writing.

---

## 2. Information Architecture & Visual Layout

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁 Customers / 📄 Acme Corp — Q3 Cloud Migration.md                         │
│ 🏷️ #client/acme  #q3-roadmap      👁️ View: [✨ Split | ✅ Tasks | 📝 Notes] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌── 🎯 ACTION ITEMS (Top Zone) ───────────────────────────────────────────┐ │
│ │ [ ] Deliver revised SOW for Cloud Migration [high]  📅 Sep 5            │ │
│ │     - [x] Security review signoff                                       │ │
│ │     - [ ] Legal approval on Section 4                                   │ │
│ │ [x] Initial discovery call with VP of Eng                               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── │
│                                                                             │
│ ┌── 📝 MEETING NOTES & PROSE (Bottom Zone) ───────────────────────────────┐ │
│ │ ### Discovery Call Takeaways (Aug 31)                                   │ │
│ │ - Client is migrating 40 legacy VMs to Cloud Run.                       │ │
│ │ - Budget approved for $120k initial phase.                             │ │
│ │ - Main pain point: Existing team lacks Terraform experience.            │ │
│ │                                                                         │ │
│ │ ```terraform                                                            │ │
│ │ module "cloud_run" { source = "./modules/run" }                         │ │
│ │ ```                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Architecture & Invariant Preservation

### 3.1 Domain Model (`src/core/markdown/types.ts`)
```typescript
export interface DocumentSpan {
  id: string;
  type: 'heading' | 'prose' | 'code' | 'task' | 'callout' | 'thematic-break';
  rawText: string;
  startLine: number;
  endLine: number;
  taskId?: string;
}

export interface VaultDocument {
  filePath: string;
  frontmatter: Frontmatter;
  tasks: TaskItem[];
  spans: DocumentSpan[];
  rawContent: string;
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
  lastModified: number;
}
```

### 3.2 Non-Destructive Two-Way Sync
1. Checking off a task in the **Top Zone** or on the **Global Kanban** uses `patchTaskInDocumentContent` to mutate only the task's line range in the `.md` file.
2. Editing text in the **Bottom Zone** updates the document's body while preserving the top tasks.
3. Every write captures an automatic pre-write snapshot in `.quietflow/snapshots/`.
