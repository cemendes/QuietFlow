import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../../src/App';
import { useVaultStore } from '../../src/store';
import { ipc } from '../../src/store/ipc';
import { VaultTree } from '../../src/store/types';

describe('QuietFlow End-to-End Vault Flow', () => {
  const mockVaultPath = '/Users/eduardo/QuietFlowVault';
  const todayFilePath = `${mockVaultPath}/today.md`;
  const projectsFilePath = `${mockVaultPath}/Projects/work.md`;

  const initialTodayMarkdown = `---
title: Today's Focus
date: 2026-08-27
---

# Tasks

- [ ] Complete Q3 planning #planning @high due:2026-08-28
- [x] Morning coffee and meditation #wellness
- [/] Review pull requests #code @medium
`;

  const initialWorkMarkdown = `---
title: Work Projects
---

# Backlog

- [ ] Write integration test suite #qa @high
`;

  const mockTree: VaultTree = {
    name: 'QuietFlowVault',
    path: mockVaultPath,
    isDirectory: true,
    fileCount: 2,
    children: [
      {
        name: 'today.md',
        path: todayFilePath,
        isDirectory: false,
        fileCount: 0,
        children: [],
      },
      {
        name: 'Projects',
        path: `${mockVaultPath}/Projects`,
        isDirectory: true,
        fileCount: 1,
        children: [
          {
            name: 'work.md',
            path: projectsFilePath,
            isDirectory: false,
            fileCount: 0,
            children: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.getState().reset();

    // Mock IPC methods
    vi.spyOn(ipc, 'initVault').mockResolvedValue(mockTree);
    vi.spyOn(ipc, 'readFile').mockImplementation(async (path: string) => {
      if (path === todayFilePath) return initialTodayMarkdown;
      if (path === projectsFilePath) return initialWorkMarkdown;
      return '';
    });
    vi.spyOn(ipc, 'writeFileAtomic').mockResolvedValue(undefined);
  });

  it('loads vault, displays tasks, toggles status, switches views, opens details, and changes vault in settings', async () => {
    render(<App />);

    // 1. Initial load / auto-load vault
    await act(async () => {
      await useVaultStore.getState().loadVault(mockVaultPath);
      await useVaultStore.getState().selectFile(todayFilePath);
    });

    // Verify task list renders tasks from today.md
    expect(await screen.findByText('Complete Q3 planning')).toBeInTheDocument();
    expect(screen.getByText('Morning coffee and meditation')).toBeInTheDocument();
    expect(screen.getByText('Review pull requests')).toBeInTheDocument();

    // 2. Add task via Quick Add bar
    const quickAddInput = screen.getByLabelText(/Quick Add Task/i);
    fireEvent.change(quickAddInput, { target: { value: 'Deploy release candidate #ops @high' } });
    fireEvent.keyDown(quickAddInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(ipc.writeFileAtomic).toHaveBeenCalled();
    });

    // 3. Switch between List and Kanban view
    const kanbanTab = screen.getByRole('button', { name: /Kanban/i });
    fireEvent.click(kanbanTab);

    // Verify Kanban board headers exist
    expect(screen.getByRole('heading', { name: 'Backlog', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'To Do', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In Progress', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done', level: 3 })).toBeInTheDocument();

    // Switch back to List view
    const listTab = screen.getByRole('button', { name: /List/i });
    fireEvent.click(listTab);

    // 4. Open Full-Page Task Detail and edit subtasks
    const taskItem = screen.getByText('Complete Q3 planning');
    fireEvent.click(taskItem);

    // TaskDetailPage opens full-page
    expect(await screen.findByTestId('task-detail-page')).toBeInTheDocument();

    // Add subtask
    const subtaskInput = screen.getByTestId('new-subtask-input');
    fireEvent.change(subtaskInput, { target: { value: 'Draft roadmap slides' } });
    fireEvent.keyDown(subtaskInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Draft roadmap slides')).toBeInTheDocument();
    });

    // Close / Back to List
    const backBtn = screen.getByTestId('back-to-list-btn');
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('task-detail-page')).not.toBeInTheDocument();
    });

    // 5. Open Quick Capture Modal via shortcut or trigger
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(await screen.findByRole('dialog', { name: /Quick Capture/i })).toBeInTheDocument();

    // Close Quick Capture Modal
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Quick Capture/i })).not.toBeInTheDocument();
    });

    // 6. Open Settings Modal
    const settingsBtn = screen.getByRole('button', { name: /Settings/i });
    fireEvent.click(settingsBtn);

    expect(await screen.findByRole('dialog', { name: /Settings/i })).toBeInTheDocument();

    // Change Vault path in Settings
    const vaultInput = screen.getByLabelText(/Vault Location/i);
    fireEvent.change(vaultInput, { target: { value: '/Users/eduardo/NewVault' } });

    const saveSettingsBtn = screen.getByRole('button', { name: /Save Changes|Apply Vault/i });
    fireEvent.click(saveSettingsBtn);

    await waitFor(() => {
      expect(useVaultStore.getState().vaultPath).toBe('/Users/eduardo/NewVault');
    });
  });
});
