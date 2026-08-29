import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../../src/App';
import { useVaultStore } from '../../src/store';
import { ipc } from '../../src/store/ipc';
import { VaultTree } from '../../src/store/types';

describe('Task Detail Full-Page Flow End-to-End Test', () => {
  const mockVaultPath = '/Users/eduardo/QuietFlowVault';
  const ccoFilePath = `${mockVaultPath}/CCO/2026-08-28.md`;

  let ccoMarkdown = `---
title: 2026-08-28
---

# Tasks

- [ ] Implement AI Model Training pipeline @high @due(2026-08-30) #infra
  - Notes: Infrastructure rollout for Q3.
  - [x] Provision H100 GPU cluster
  - [ ] Run synthetic benchmark suite
  - Comment (Eduardo, 2026-08-29 07:15): Cluster provisioned in us-east-4 with 8x H100.
`;

  const mockTree: VaultTree = {
    name: 'QuietFlowVault',
    path: mockVaultPath,
    isDirectory: true,
    fileCount: 1,
    children: [
      {
        name: 'CCO',
        path: `${mockVaultPath}/CCO`,
        isDirectory: true,
        fileCount: 1,
        children: [
          {
            name: '2026-08-28.md',
            path: ccoFilePath,
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

    vi.spyOn(ipc, 'initVault').mockResolvedValue(mockTree);
    vi.spyOn(ipc, 'readFile').mockImplementation(async (path: string) => {
      if (path === ccoFilePath) return ccoMarkdown;
      return '';
    });
    vi.spyOn(ipc, 'writeFileAtomic').mockImplementation(async (path: string, content: string) => {
      if (path === ccoFilePath) {
        ccoMarkdown = content;
      }
    });
  });

  it('navigates from Kanban to full-page task detail, edits notes, posts comments, and returns to Kanban', async () => {
    render(<App />);

    // 1. Initial load & switch to Kanban view
    await act(async () => {
      await useVaultStore.getState().loadVault(mockVaultPath);
      await useVaultStore.getState().selectFile(ccoFilePath);
      useVaultStore.getState().setActiveView('kanban');
    });

    // Verify task is visible on the Kanban board
    expect(await screen.findByText('Implement AI Model Training pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();

    // 2. Click on the task card to navigate to Full-Page Task Detail View
    const taskCardText = screen.getByText('Implement AI Model Training pipeline');
    await act(async () => {
      fireEvent.click(taskCardText);
    });

    // 3. Verify Kanban is unmounted and Full-Page Task Detail View is mounted
    expect(screen.queryByTestId('kanban-board')).not.toBeInTheDocument();
    const detailPage = screen.getByTestId('task-detail-page');
    expect(detailPage).toBeInTheDocument();
    expect(screen.getByTestId('back-to-list-btn')).toHaveTextContent('Back to Kanban');
    expect(screen.getAllByText('CCO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2026-08-28').length).toBeGreaterThanOrEqual(1);

    // 4. Add a new subtask
    const subtaskInput = screen.getByTestId('new-subtask-input');
    await act(async () => {
      fireEvent.change(subtaskInput, { target: { value: 'Verify dataset sync' } });
      fireEvent.keyDown(subtaskInput, { key: 'Enter' });
    });

    // 5. Post a new comment
    const commentInput = screen.getByTestId('new-comment-textarea');
    const postBtn = screen.getByTestId('post-comment-btn');
    await act(async () => {
      fireEvent.change(commentInput, { target: { value: 'Dataset sync verified in staging.' } });
    });
    await act(async () => {
      fireEvent.click(postBtn);
    });

    // Verify comment appears in the activity feed
    expect(screen.getByText('Dataset sync verified in staging.')).toBeInTheDocument();

    // Verify atomic file write was called with serialized markdown
    await waitFor(() => {
      expect(ipc.writeFileAtomic).toHaveBeenCalled();
    });
    expect(ccoMarkdown).toContain('Verify dataset sync');
    expect(ccoMarkdown).toContain('Comment (2026-08-29');
    expect(ccoMarkdown).toContain('Dataset sync verified in staging.');

    // 6. Click Back to Kanban button
    const backBtn = screen.getByTestId('back-to-list-btn');
    await act(async () => {
      fireEvent.click(backBtn);
    });

    // 7. Verify Task Detail is unmounted and Kanban view is restored
    expect(screen.queryByTestId('task-detail-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    expect(screen.getByText('Implement AI Model Training pipeline')).toBeInTheDocument();
  });
});
