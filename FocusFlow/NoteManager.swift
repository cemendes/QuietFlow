import Foundation

// MARK: - Note Manager
/// Manages per-task markdown notes on Google Drive.
///
/// Directory layout (all under ~/My Drive/FocusFlow/):
///   notes/<task-id>.md          — active note
///   notes/archive/<task-id>.md  — archived (task deleted / completed)
///   AGENTS.md                   — AI agent orientation file

final class NoteManager: @unchecked Sendable {

    static let shared = NoteManager()

    private let fm = FileManager.default

    // MARK: - Root URLs

    var focusFlowRoot: URL {
        fm.homeDirectoryForCurrentUser
            .appendingPathComponent("My Drive/FocusFlow")
    }

    private var notesDir:   URL { focusFlowRoot.appendingPathComponent("notes") }
    private var archiveDir: URL { notesDir.appendingPathComponent("archive") }

    private init() {
        ensureDirectories()
    }

    // MARK: - Setup

    func ensureDirectories() {
        [focusFlowRoot, notesDir, archiveDir].forEach {
            try? fm.createDirectory(at: $0, withIntermediateDirectories: true)
        }
        createAgentsMDIfNeeded()
    }

    // MARK: - URL Helpers

    func noteURL(for taskId: String) -> URL {
        notesDir.appendingPathComponent("\(taskId).md")
    }

    func archiveURL(for taskId: String) -> URL {
        archiveDir.appendingPathComponent("\(taskId).md")
    }

    func hasNote(for taskId: String) -> Bool {
        fm.fileExists(atPath: noteURL(for: taskId).path)
    }

    // MARK: - CRUD

    /// Loads note content. Returns nil if no note exists yet.
    func loadNote(for taskId: String) -> String? {
        let url = noteURL(for: taskId)
        guard fm.fileExists(atPath: url.path) else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }

    /// Creates a new note with YAML frontmatter. Idempotent — returns existing content if file exists.
    @discardableResult
    func createNote(for task: TaskItem) -> String {
        let url = noteURL(for: task.id)
        if fm.fileExists(atPath: url.path),
           let existing = try? String(contentsOf: url, encoding: .utf8) {
            return existing
        }

        let project = task.resolvedProject ?? "General"
        let today   = String(ISO8601DateFormatter().string(from: Date()).prefix(10))
        let body    = task.details.flatMap { $0.isEmpty ? nil : $0 } ?? ""

        let content = """
        ---
        taskId: \(task.id)
        project: \(project)
        created: \(today)
        ---

        # \(task.cleanTitle)

        \(body)
        """
            .trimmingCharacters(in: .whitespacesAndNewlines) + "\n"

        try? content.write(to: url, atomically: true, encoding: .utf8)
        return content
    }

    /// Writes content to disk atomically.
    func saveNote(for taskId: String, content: String) {
        let url = noteURL(for: taskId)
        try? content.write(to: url, atomically: true, encoding: .utf8)
    }

    /// Moves note to archive/. Safe to call even if no note exists.
    func archiveNote(for taskId: String) {
        let src = noteURL(for: taskId)
        let dst = archiveURL(for: taskId)
        guard fm.fileExists(atPath: src.path) else { return }
        try? fm.removeItem(at: dst)
        try? fm.moveItem(at: src, to: dst)
    }

    // MARK: - AGENTS.md

    private func createAgentsMDIfNeeded() {
        let url = focusFlowRoot.appendingPathComponent("AGENTS.md")
        guard !fm.fileExists(atPath: url.path) else { return }

        let content = """
        # FocusFlow Workspace — Agent Guide

        This directory is the FocusFlow data workspace.
        Any AI agent (Gemini CLI, Claude Code, Codex CLI) can read and write
        here without additional integration.

        ## File Layout

        ```
        FocusFlow/
          tasks.json           — All tasks (primary database)
          AGENTS.md            — This file
          notes/
            <task-id>.md       — Per-task markdown notes (active)
            archive/
              <task-id>.md     — Notes for deleted/completed tasks
        ```

        ## tasks.json Schema

        Each task object has these fields:

        | Field        | Type        | Notes                                     |
        |---|---|---|
        | id           | String      | UUID, stable identifier                   |
        | title        | String      | Format: "[Project] Action title"          |
        | project      | String?     | Project name (also in title prefix)       |
        | details      | String?     | One-sentence description                  |
        | link         | String?     | Gmail/Drive permalink                     |
        | status       | String      | "needsAction" | "completed"              |
        | duration     | Int?        | Estimated minutes                         |
        | priority     | String?     | "High" | "Medium" | "Low"               |
        | category     | String?     | "Share" | "Code" | "Meeting" | etc.    |
        | date         | String?     | "MMM d" format, e.g. "Apr 29"             |
        | parentTaskId | String?     | Set for subtasks                          |

        ## Per-Task Notes

        Each note starts with YAML frontmatter:

        ```yaml
        ---
        taskId: <uuid>
        project: Privia
        created: 2026-04-29
        ---

        # Task title here

        Your notes below...
        ```

        ## How to Work with This Workspace

        **Read all tasks:**
        ```bash
        cat ~/My\\ Drive/FocusFlow/tasks.json | jq '.[].title'
        ```

        **Read a task note (if you have the task ID):**
        ```bash
        cat ~/My\\ Drive/FocusFlow/notes/<task-id>.md
        ```

        **Add a note to a task:**
        ```bash
        echo "\\n## My Note\\n\\nContent here." >> ~/My\\ Drive/FocusFlow/notes/<task-id>.md
        ```

        **Find tasks by project (using top-level field):**
        ```bash
        cat ~/My\\ Drive/FocusFlow/tasks.json | jq '[.[] | select(.project == "Privia")]'
        ```

        **Mark a task complete** — update the `status` field to `"completed"` in tasks.json:
        ```bash
        # Use jq to flip status for a specific task ID
        jq '(.[] | select(.id == "<task-id>") | .status) |= "completed"' tasks.json
        ```

        ## Conventions

        - The `project` is always the first bracketed token in the title: `[Privia] Open ticket`
        - Notes are plain markdown — no proprietary format
        - Never hard-delete tasks.json entries; set `status: "completed"` instead
        - Note files are never deleted; completed task notes move to `notes/archive/`
        """

        try? content.write(to: url, atomically: true, encoding: .utf8)
    }
}
