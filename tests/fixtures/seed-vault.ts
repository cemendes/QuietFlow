import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TestVaultInstance {
  vaultPath: string;
  cleanup: () => Promise<void>;
}

export async function createTestVault(customDir?: string): Promise<TestVaultInstance> {
  const targetDir = customDir || path.join(os.tmpdir(), `quietflow-test-vault-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

  // Ensure clean target directory
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Projects folder & notes
  const projectsDir = path.join(targetDir, '01 - Projects');
  fs.mkdirSync(projectsDir, { recursive: true });

  const q4RoadmapContent = `---
title: Q4 Roadmap
tags: [roadmap, core]
---

# Q4 Product Roadmap & Strategic Initiatives

Key product milestones and deliverables for the current quarter.

## Beta Launch

- [ ] Launch beta release #work #urgent
  - Notes: Beta release checklist and telemetry validation
  - Comment (You, 2026-09-18 10:00): Ready for QA
  - [ ] Polish onboarding modal
  - [x] Integrate snapshot backup system

- [ ] Complete user feedback synthesis #review
  - Notes: Collect notes from early customer cohorts

## Strategic Goals

- Continuous zero-manual regression testing
- Instant local-first markdown persistence
`;
  fs.writeFileSync(path.join(projectsDir, 'Q4 Roadmap.md'), q4RoadmapContent, 'utf-8');

  const clientOnboardingContent = `---
title: Client Onboarding
tags: [client, sales]
---

# Client Onboarding Process

Step by step procedures for new enterprise customers.

## Initial Setup Tasks

- [ ] Schedule technical kickoff call #sales
- [ ] Provision initial workspace environment
  - Notes: Verify VPC and peering parameters
- [x] Share security audit documentation
`;
  fs.writeFileSync(path.join(projectsDir, 'Client Onboarding.md'), clientOnboardingContent, 'utf-8');

  // 2. Areas folder & notes
  const areasDir = path.join(targetDir, '02 - Areas');
  fs.mkdirSync(areasDir, { recursive: true });

  const personalContent = `---
title: Personal
tags: [personal, health]
---

# Personal Well-being & Habits

Weekly habits and personal targets.

## Morning Routine

- [x] 20-minute morning meditation
- [ ] Hydrate with 500ml water #health
- [ ] Review daily task list #focus
`;
  fs.writeFileSync(path.join(areasDir, 'Personal.md'), personalContent, 'utf-8');

  // 3. Archive folder & notes
  const archiveDir = path.join(targetDir, '03 - Archive');
  fs.mkdirSync(archiveDir, { recursive: true });

  const oldNotesContent = `---
title: Old Notes
tags: [archive]
---

# Archived Notes from Previous Sprints

Historical reference data.

- [x] Sprint 42 retrospective
- [x] Legacy database schema migration
`;
  fs.writeFileSync(path.join(archiveDir, 'Old Notes.md'), oldNotesContent, 'utf-8');

  // 4. Inbox note
  const inboxContent = `---
title: Inbox
tags: [inbox]
---

# Quick Capture Inbox

Unsorted tasks and incoming ideas.

- [ ] Review pull request for TipTap editor #dev
- [ ] Draft blog post about local-first sync
  - Notes: Emphasize privacy and zero cloud dependencies
`;
  fs.writeFileSync(path.join(targetDir, 'Inbox.md'), inboxContent, 'utf-8');

  const cleanup = async () => {
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`[seed-vault] Failed to clean up ${targetDir}:`, e);
    }
  };

  return {
    vaultPath: targetDir,
    cleanup,
  };
}
