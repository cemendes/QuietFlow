---
name: playwright-desktop-testing
description: Playwright E2E testing for desktop webviews, mocking Tauri IPC and virtual markdown filesystems, shortcut verification, and Kanban drag-and-drop testing.
---

# Playwright Desktop Testing Skill

## Core Principles
1. **End-to-End User Journeys**: Test complete workflows from cold launch to task capture, markdown preview, Kanban column transitions, and preference modifications.
2. **Computed Style & DOM Verification**: Always assert computed styles (`getComputedStyle`), DOM class mutations, and real visual state changes rather than solely shallow click triggers.
3. **Multi-Platform IPC Mocking**: Ensure the browser testing runner accurately reflects filesystem operations, directory tree changes, and optimistic UI updates.
4. **Visual Regression Snapshots**: Save high-resolution viewport screenshots at each step to catch layout collisions, text overflows, or theme contrast issues.
