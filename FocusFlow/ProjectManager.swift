import Foundation
import SwiftUI

// MARK: - Project Item

struct ProjectItem: Identifiable, Hashable, Sendable {
    let id: String        // slug — filename without .md, e.g. "privia"
    let name: String      // display name from frontmatter or title-cased slug
    let status: String    // active | paused | completed
    let noteURL: URL

    /// Deterministic HSL color — same slug always yields the same color.
    var color: Color { Color.projectColor(for: name) }

    static func == (lhs: ProjectItem, rhs: ProjectItem) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

// MARK: - Project Manager

/// Manages the `~/My Drive/FocusFlow/projects/` directory.
/// Injected as an `@Environment` object; all views observe it automatically.
@Observable
@MainActor
final class ProjectManager {

    var projects: [ProjectItem] = []

    private let fm = FileManager.default
    private var fileMonitor: DispatchSourceFileSystemObject?

    private var projectsDir: URL {
        fm.homeDirectoryForCurrentUser
            .appendingPathComponent("My Drive/FocusFlow/projects")
    }

    // MARK: - Bootstrap

    func bootstrap() {
        ensureDirectoryExists()
        fetchProjects()
        startMonitoring()
    }

    // MARK: - Fetch

    func fetchProjects() {
        ensureDirectoryExists()
        guard let urls = try? fm.contentsOfDirectory(
                at: projectsDir,
                includingPropertiesForKeys: nil
            ).filter({ $0.pathExtension == "md" })
             .sorted(by: { $0.lastPathComponent < $1.lastPathComponent })
        else { return }

        projects = urls.compactMap { parseProject(at: $0) }
        FFLogger.log("[Projects] Loaded \(projects.count) projects")
    }

    // MARK: - Note I/O

    nonisolated func loadNote(for project: ProjectItem) -> String {
        (try? String(contentsOf: project.noteURL, encoding: .utf8))
            ?? defaultTemplate(for: project)
    }

    nonisolated func saveNote(for project: ProjectItem, content: String) {
        try? content.write(to: project.noteURL, atomically: true, encoding: .utf8)
    }

    // MARK: - Create

    /// Creates a new project `.md` file and reloads the project list.
    /// Returns the new `ProjectItem`, or the existing one if the slug already exists.
    @discardableResult
    func createProject(name: String) -> ProjectItem? {
        let slug = slugify(name)
        let url  = projectsDir.appendingPathComponent("\(slug).md")

        if fm.fileExists(atPath: url.path) {
            return projects.first { $0.id == slug }
        }

        let item = ProjectItem(id: slug, name: name, status: "active", noteURL: url)
        let template = defaultTemplate(for: item)
        try? template.write(to: url, atomically: true, encoding: .utf8)
        fetchProjects()
        return projects.first { $0.id == slug }
    }

    // MARK: - Task Count Helper

    /// Number of open (non-completed, top-level) tasks belonging to this project.
    func taskCount(for project: ProjectItem, in tasks: [TaskItem]) -> Int {
        tasks.filter { task in
            task.status != "completed"
            && task.parentTaskId == nil
            && task.resolvedProject == project.name
        }.count
    }

    // MARK: - Directory

    private func ensureDirectoryExists() {
        try? fm.createDirectory(at: projectsDir,
                                withIntermediateDirectories: true)
    }

    // MARK: - File Monitor

    private func startMonitoring() {
        let fd = open(projectsDir.path, O_EVTONLY)
        guard fd >= 0 else { return }

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .rename, .delete],
            queue: .main
        )
        source.setEventHandler { [weak self] in
            Task { @MainActor [weak self] in
                self?.fetchProjects()
            }
        }
        source.setCancelHandler { close(fd) }
        source.resume()
        fileMonitor = source
    }

    // MARK: - Helpers

    private func slugify(_ name: String) -> String {
        name.lowercased()
            .components(separatedBy: .whitespacesAndNewlines)
            .joined(separator: "-")
            .filter { $0.isLetter || $0.isNumber || $0 == "-" }
    }

    private func parseProject(at url: URL) -> ProjectItem? {
        guard let raw = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        let slug = url.deletingPathExtension().lastPathComponent

        // Default: title-case the slug
        var name   = slug.split(separator: "-")
                        .map { $0.prefix(1).uppercased() + $0.dropFirst() }
                        .joined(separator: " ")
        var status = "active"

        // Parse YAML frontmatter (--- block ---)
        if raw.hasPrefix("---") {
            let parts = raw.components(separatedBy: "---")
            if parts.count >= 2 {
                for line in parts[1].components(separatedBy: "\n") {
                    let kv = line.split(separator: ":", maxSplits: 1)
                              .map { $0.trimmingCharacters(in: .whitespaces) }
                    guard kv.count == 2 else { continue }
                    switch kv[0] {
                    case "name":   name   = kv[1]
                    case "status": status = kv[1]
                    default:       break
                    }
                }
            }
        }

        return ProjectItem(id: slug, name: name, status: status, noteURL: url)
    }

    private nonisolated func defaultTemplate(for project: ProjectItem) -> String {
        let today = String(ISO8601DateFormatter().string(from: Date()).prefix(10))
        return """
        ---
        name: \(project.name)
        slug: \(project.id)
        status: active
        created: \(today)
        ---

        # \(project.name)

        ## Goal


        ## Key Contacts


        ## Notes

        """
    }
}
