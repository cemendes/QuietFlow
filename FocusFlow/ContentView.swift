import SwiftUI
import EventKit
import UniformTypeIdentifiers
import Combine

// MARK: - Content View (3-panel: Sidebar | Task List | Calendar)
struct ContentView: View {
    @Environment(AuthManager.self)  var authManager:  AuthManager
    @Environment(TasksManager.self) var tasksManager: TasksManager

    @State private var selectedSource:  TaskSource? = nil   // nil = All Tasks
    @State private var showingSettings  = false
    @State private var showingTaskForm  = false
    @State private var selectedEvent:   CalendarEvent? = nil
    @State private var draggedTask:     TaskItem?      = nil
    @State private var searchText       = ""
    @State private var geminiKeyInput   = ""
    @State private var geminiKeySaved   = false
    @State private var geminiKeyIsSet   = false

    // Phase 2A: Editor panel state
    @State private var isEditorOpen   = false
    @State private var editorTask:    TaskItem?    = nil

    // Phase 2B: Project state
    @State private var selectedProject: ProjectItem? = nil
    @State private var editorProject:   ProjectItem? = nil

    var body: some View {
        @Bindable var tasksManager = tasksManager

        ZStack {
            VStack(spacing: 0) {
                HStack(spacing: 0) {

                    // ── Panel 1: Sidebar ──────────────────────────────────
                    SidebarView(
                        selectedSource: $selectedSource,
                        selectedProject: $selectedProject,
                        showingSettings: $showingSettings,
                        showingTaskForm: $showingTaskForm,
                        onSelectProject: { project in
                            withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) {
                                selectedProject = project
                                selectedSource  = nil   // clear source filter
                                if let project {
                                    // Open editor with this project's note
                                    editorProject = project
                                    editorTask    = nil
                                    isEditorOpen  = true
                                }
                            }
                        }
                    )

                    Divider()

                    // ── Panel 2: Task List ────────────────────────────────
                    TaskListPanel(
                        selectedSource: selectedSource,
                        selectedProject: selectedProject,
                        draggedTask: $draggedTask,
                        searchText: $searchText,
                        isEditorOpen: $isEditorOpen,
                        onOpenEditor: { task in
                            withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) {
                                editorTask    = task
                                editorProject = nil   // clear project note
                                isEditorOpen  = true
                            }
                        }
                    )
                    .frame(width: 360)

                    Divider()

                    // ── Panel 3: Calendar ─────────────────────────────────
                    CalendarPanel(selectedEvent: $selectedEvent, draggedTask: $draggedTask)
                        .frame(maxWidth: .infinity)

                    // ── Panel 4: Markdown Editor (Phase 2A/2B) ────────────
                    if isEditorOpen {
                        Divider()

                        MarkdownEditorPanel(
                            task: editorTask,
                            projectItem: editorProject,
                            onClose: {
                                withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) {
                                    isEditorOpen  = false
                                    editorProject = nil
                                }
                            }
                        )
                        .frame(width: 380)
                        .transition(.move(edge: .trailing).combined(with: .opacity))
                    }
                }
                .frame(maxHeight: .infinity)

                // ── Status Bar ────────────────────────────────────────────
                StatusBarView()
            }

            // ── Morning Ritual Overlay ────────────────────────────────────
            if !tasksManager.isMorningRitualComplete {
                Color.black.opacity(0.4)
                    .edgesIgnoringSafeArea(.all)

                MorningRitualView()
                    .background(Color.surfaceBackground)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.2), radius: 24, x: 0, y: 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            // ── Shutdown Ritual Overlay ───────────────────────────────────
            if tasksManager.isShutdownRitualNeeded {
                Color.black.opacity(0.4)
                    .edgesIgnoringSafeArea(.all)

                ShutdownRitualView()
                    .background(Color.surfaceBackground)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.2), radius: 24, x: 0, y: 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.4), value: tasksManager.isMorningRitualComplete)
        .animation(.spring(response: 0.4), value: tasksManager.isShutdownRitualNeeded)
        .animation(.spring(response: 0.32, dampingFraction: 0.82), value: isEditorOpen)
        .frame(minWidth: 1000, minHeight: 650)
        // ⌘E — Toggle editor panel
        .onKeyPress(.init("e"), phases: .down) { press in
            guard press.modifiers.contains(.command) else { return .ignored }
            withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) { isEditorOpen.toggle() }
            return .handled
        }
        // Sheets
        .sheet(isPresented: $showingSettings)  { settingsSheet() }
        .sheet(isPresented: $showingTaskForm)  { TaskFormView(isPresented: $showingTaskForm) }
        .sheet(item: $selectedEvent) { event in
            EventDetailsView(event: event, onOpenNote: { task in
                // Sheet is already dismissing — wait for its animation to finish
                // before sliding in the editor panel to avoid conflicting transitions.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) {
                        editorTask   = task
                        isEditorOpen = true
                    }
                }
            })
        }
        // Error alert
        .alert("Error", isPresented: isShowingError) {
            Button("OK", role: .cancel) {}
        } message: { Text(tasksManager.errorMessage ?? "") }
        // Lifecycle
        .onChange(of: authManager.isSignedIn) { _, isSignedIn in
            if isSignedIn { tasksManager.fetchTasks() }
        }
        .onAppear {
            // Calendar permission dialog fires here — window is already visible.
            tasksManager.requestCalendarAccess()
            if authManager.isSignedIn { tasksManager.fetchTasks() }
        }
    }

    // MARK: - Error binding
    private var isShowingError: Binding<Bool> {
        Binding(
            get: { tasksManager.errorMessage != nil },
            set: { if !$0 { tasksManager.errorMessage = nil } }
        )
    }

    // MARK: - Settings Sheet
    @ViewBuilder
    private func settingsSheet() -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Settings")
                            .font(.system(size: 18, weight: .semibold))
                        Text("FocusFlow · macOS")
                            .font(.system(size: 11)).foregroundStyle(.textSecondary)
                    }
                    Spacer()
                    Button("Done") { showingSettings = false }
                        .buttonStyle(.borderedProminent)
                }

                // ── Database ───────────────────────────────────────────
                settingsSection("DATABASE") {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Tasks file (JSON)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textSecondary)
                        HStack(spacing: 8) {
                            Text((FileManager.default.homeDirectoryForCurrentUser.path) + "/My Drive/tasks.json")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(.textPrimary)
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .background(Color.secondarySurface)
                                .clipShape(.rect(cornerRadius: 6))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            Button {
                                let panel = NSOpenPanel()
                                panel.allowedContentTypes = [.json]
                                panel.canChooseFiles = true
                                panel.canChooseDirectories = false
                                panel.begin { response in
                                    // Future: wire to tasksManager.jsonFilePath
                                    _ = response
                                }
                            } label: {
                                Text("Browse…")
                                    .font(.system(size: 12))
                            }
                            .buttonStyle(.bordered)
                        }
                        Text("Your AppScript poller writes tasks here. FocusFlow watches it for changes.")
                            .font(.system(size: 10))
                            .foregroundStyle(.textSecondary.opacity(0.7))
                    }
                }

                Divider()

                // ── Schedule ──────────────────────────────────────────
                settingsSection("SCHEDULE") {
                    labeledField("Default Duration", hint: "Minutes per task when no duration is set") {
                        HStack(spacing: 8) {
                            TextField("Mins",
                                      value: Binding(
                                        get: { tasksManager.defaultDuration },
                                        set: { tasksManager.defaultDuration = $0 }
                                      ),
                                      format: .number)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 70)
                            Text("minutes")
                                .font(.system(size: 12))
                                .foregroundStyle(.textSecondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Target Calendar")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textSecondary)
                        Text("FocusFlow writes scheduled tasks to this calendar.")
                            .font(.system(size: 10))
                            .foregroundStyle(.textSecondary.opacity(0.7))

                        Picker("", selection: Binding(
                            get: { tasksManager.targetCalendarIdentifier },
                            set: { tasksManager.targetCalendarIdentifier = $0 }
                        )) {
                            Text("None").tag("")
                            ForEach(tasksManager.availableCalendars, id: \.id) { cal in
                                Text(cal.title).tag(cal.id)
                            }
                        }
                        .labelsHidden()
                        .frame(maxWidth: .infinity)
                    }
                }

                Divider()

                // ── AI ─────────────────────────────────────────────────────
                settingsSection("AI (GEMINI)") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Gemini API Key")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textSecondary)
                        Text("Used for task breakdown & subtask suggestions. Stored securely in your system Keychain.")
                            .font(.system(size: 10))
                            .foregroundStyle(.textSecondary.opacity(0.7))

                        HStack(spacing: 8) {
                            SecureField(geminiKeyIsSet ? "•••••••• (key already set — paste to replace)" : "Paste your Gemini API key…",
                                        text: $geminiKeyInput)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(size: 12, design: .monospaced))

                            Button {
                                let trimmed = geminiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !trimmed.isEmpty else { return }
                                KeychainHelper.shared.save(trimmed, service: "FocusFlow", account: "GeminiAPIKey")
                                geminiKeyInput = ""
                                geminiKeyIsSet = true
                                withAnimation { geminiKeySaved = true }
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    withAnimation { geminiKeySaved = false }
                                }
                            } label: {
                                Text(geminiKeySaved ? "Saved ✓" : "Save")
                                    .font(.system(size: 12, weight: .medium))
                                    .frame(width: 56)
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(geminiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }

                        // Live status badge
                        HStack(spacing: 4) {
                            Image(systemName: geminiKeyIsSet ? "checkmark.shield.fill" : "exclamationmark.shield")
                                .font(.system(size: 10))
                                .foregroundStyle(geminiKeyIsSet ? Color.successGreen : Color.staleAmber)
                            Text(geminiKeyIsSet ? "API key stored in Keychain" : "No key stored yet — subtask breakdown won’t work")
                                .font(.system(size: 10))
                                .foregroundStyle(geminiKeyIsSet ? Color.successGreen : Color.staleAmber)
                        }
                        .animation(.easeInOut(duration: 0.2), value: geminiKeyIsSet)
                    }
                }

                Spacer()
            }
            .padding(24)
        }
        .frame(width: 460, height: 560)
        .background(Color.surfaceBackground)
        .onAppear {
            tasksManager.fetchAvailableCalendars()
            geminiKeyIsSet = KeychainHelper.shared.readString(service: "FocusFlow", account: "GeminiAPIKey") != nil
        }
    }

    @ViewBuilder
    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.textSecondary)
            content()
        }
    }

    @ViewBuilder
    private func labeledField<Content: View>(_ label: String, hint: String, @ViewBuilder field: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.textSecondary)
            field()
            Text(hint)
                .font(.system(size: 10))
                .foregroundStyle(.textSecondary.opacity(0.6))
        }
    }
}

// MARK: - Sidebar View
struct SidebarView: View {
    @Environment(TasksManager.self)  var tasksManager
    @Environment(ProjectManager.self) var projectManager
    @Binding var selectedSource:   TaskSource?
    @Binding var selectedProject:  ProjectItem?
    @Binding var showingSettings:  Bool
    @Binding var showingTaskForm:  Bool
    /// Called when a project row is tapped — ContentView handles opening the editor.
    var onSelectProject: (ProjectItem?) -> Void = { _ in }

    @State private var showingNewProjectSheet = false
    @State private var newProjectName = ""

    private var openTasks: [TaskItem] {
        tasksManager.tasks.filter { $0.status != "completed" && $0.parentTaskId == nil }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // App brand
            HStack(spacing: 8) {
                Image(systemName: "bolt.circle.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.googleBlue)
                Text("FocusFlow")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.textPrimary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()
                .padding(.bottom, 10)

            // ── SOURCES ──────────────────────────────────────────────
            Text("SOURCES")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.textSecondary)
                .padding(.horizontal, 16)
                .padding(.bottom, 4)

            // All Tasks
            SidebarNavItem(
                icon: "tray.fill", label: "All Tasks",
                count: openTasks.count, color: .googleBlue,
                isSelected: selectedSource == nil && selectedProject == nil
            ) {
                selectedSource  = nil
                selectedProject = nil
                onSelectProject(nil)
            }

            // Gmail
            SidebarNavItem(
                icon: TaskSource.gmail.iconName, label: TaskSource.gmail.label,
                count: openTasks.filter { $0.source == .gmail }.count,
                color: .gmailRed,
                isSelected: selectedSource == .gmail
            ) {
                selectedSource  = .gmail
                selectedProject = nil
                onSelectProject(nil)
            }

            // GChat
            SidebarNavItem(
                icon: TaskSource.gchat.iconName, label: TaskSource.gchat.label,
                count: openTasks.filter { $0.source == .gchat }.count,
                color: .gchatBlue,
                isSelected: selectedSource == .gchat,
                isComingSoon: true
            ) {
                selectedSource  = .gchat
                selectedProject = nil
                onSelectProject(nil)
            }

            // Chrome
            SidebarNavItem(
                icon: TaskSource.chrome.iconName, label: TaskSource.chrome.label,
                count: openTasks.filter { $0.source == .chrome }.count,
                color: .chromeGreen,
                isSelected: selectedSource == .chrome,
                isComingSoon: true
            ) {
                selectedSource  = .chrome
                selectedProject = nil
                onSelectProject(nil)
            }

            // ── PROJECTS ─────────────────────────────────────────────
            if !projectManager.projects.isEmpty {
                Divider()
                    .padding(.vertical, 8)

                Text("PROJECTS")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.textSecondary)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 4)

                ForEach(projectManager.projects) { project in
                    ProjectNavItem(
                        project: project,
                        count: projectManager.taskCount(for: project, in: tasksManager.tasks),
                        isSelected: selectedProject == project
                    ) {
                        onSelectProject(project)
                    }
                }
            }

            Spacer()

            Divider()

            // Bottom bar
            HStack {
                Button {
                    showingTaskForm = true
                } label: {
                    Label("New Task", systemImage: "plus.circle")
                        .font(.system(size: 12))
                        .foregroundColor(.textSecondary)
                }
                .buttonStyle(.plain)
                .keyboardShortcut("n", modifiers: .command)

                Spacer()

                // New Project button
                Button {
                    showingNewProjectSheet = true
                } label: {
                    Image(systemName: "folder.badge.plus")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                }
                .buttonStyle(.plain)
                .help("New Project")

                Button { showingSettings = true } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .frame(width: 200)
        .background(Color.sidebarBackground)
        // New Project sheet
        .sheet(isPresented: $showingNewProjectSheet) {
            newProjectSheet
        }
    }

    // MARK: - New Project Sheet
    private var newProjectSheet: some View {
        VStack(spacing: 20) {
            Text("New Project")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.textPrimary)

            VStack(alignment: .leading, spacing: 6) {
                Text("Project Name")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.textSecondary)
                TextField("e.g. Privia, Internal", text: $newProjectName)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { createProject() }
            }

            HStack {
                Button("Cancel") {
                    newProjectName = ""
                    showingNewProjectSheet = false
                }
                .keyboardShortcut(.escape, modifiers: [])
                Spacer()
                Button("Create") { createProject() }
                    .buttonStyle(.borderedProminent)
                    .disabled(newProjectName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 340)
        .background(Color.surfaceBackground)
    }

    private func createProject() {
        let name = newProjectName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        if let project = projectManager.createProject(name: name) {
            newProjectName = ""
            showingNewProjectSheet = false
            onSelectProject(project)
        }
    }
}


// MARK: - Project Nav Item
/// A project row in the sidebar — colored dot, name, and task count badge.
struct ProjectNavItem: View {
    let project:    ProjectItem
    let count:      Int
    let isSelected: Bool
    let action:     () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                // Color dot
                Circle()
                    .fill(project.color)
                    .frame(width: 8, height: 8)
                    .padding(.leading, 4)

                Text(project.name)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .textPrimary : .textSecondary)
                    .lineLimit(1)
                    .truncationMode(.tail)

                Spacer()

                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(isSelected ? project.color : .textSecondary)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(isSelected ? project.color.opacity(0.12) : Color.borderGray.opacity(0.5))
                        .cornerRadius(8)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(
                isSelected ? project.color.opacity(0.1) :
                isHovered  ? Color.borderGray.opacity(0.25) : Color.clear
            )
            .cornerRadius(6)
            .padding(.horizontal, 8)
        }
        .buttonStyle(.plain)
        .onHover { h in withAnimation(.easeInOut(duration: 0.12)) { isHovered = h } }
    }
}


struct SidebarNavItem: View {
    let icon:     String
    let label:    String
    let count:    Int
    let color:    Color
    var isSelected:   Bool = false
    var isComingSoon: Bool = false
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundColor(isComingSoon ? .textSecondary.opacity(0.35) : (isSelected ? color : .textSecondary))
                    .frame(width: 16)

                Text(label)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isComingSoon ? .textSecondary.opacity(0.35) : (isSelected ? .textPrimary : .textSecondary))

                Spacer()

                if isComingSoon {
                    Text("Soon")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.textSecondary.opacity(0.4))
                        .padding(.horizontal, 5).padding(.vertical, 2)
                        .background(Color.borderGray.opacity(0.5))
                        .cornerRadius(3)
                } else if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(isSelected ? color : .textSecondary)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(isSelected ? color.opacity(0.12) : Color.borderGray.opacity(0.5))
                        .cornerRadius(8)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(
                isSelected ? color.opacity(0.1) :
                isHovered  ? Color.borderGray.opacity(0.25) : Color.clear
            )
            .cornerRadius(6)
            .padding(.horizontal, 8)
        }
        .buttonStyle(.plain)
        .onHover { h in withAnimation(.easeInOut(duration: 0.12)) { isHovered = h } }
    }
}

// MARK: - Task List Panel
struct TaskListPanel: View {
    @Environment(TasksManager.self) var tasksManager
    let selectedSource:  TaskSource?
    let selectedProject: ProjectItem?    // Phase 2B
    @Binding var draggedTask:   TaskItem?
    @Binding var searchText:    String
    /// Reflects and toggles the editor panel open/closed state.
    @Binding var isEditorOpen: Bool
    /// Callback wired from ContentView — opens the editor panel for the given task.
    var onOpenEditor: ((TaskItem) -> Void)? = nil

    private var filteredTasks: [TaskItem] {
        tasksManager.tasks.filter { task in
            guard task.status != "completed" else { return false }
            guard task.parentTaskId == nil    else { return false }
            let isUnscheduled = !tasksManager.calendarEvents.contains { $0.taskId == task.id }
            guard isUnscheduled else { return false }
            // Project filter (Phase 2B) takes precedence over source filter
            if let proj = selectedProject {
                return task.resolvedProject == proj.name
            }
            if let src = selectedSource, task.source != src { return false }
            if !searchText.isEmpty,
               !task.title.localizedCaseInsensitiveContains(searchText) { return false }
            return true
        }
    }

    private var headerLabel: String {
        if let proj = selectedProject { return proj.name }
        return selectedSource?.label ?? "All Tasks"
    }

    var body: some View {
        @Bindable var tasksManager = tasksManager
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(headerLabel)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.textPrimary)
                Spacer()
                // Editor panel toggle button
                Button {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) {
                        isEditorOpen.toggle()
                    }
                } label: {
                    Image(systemName: "note.text")
                        .font(.system(size: 13))
                        .foregroundStyle(isEditorOpen ? Color.googleBlue : Color.textSecondary)
                }
                .buttonStyle(.plain)
                .help(isEditorOpen ? "Close note editor (⌘E)" : "Open note editor (⌘E)")
                .accessibilityLabel("Toggle Note Editor")

                Button { tasksManager.fetchTasks() } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 13))
                        .foregroundStyle(.textSecondary)
                }
                .buttonStyle(.plain)
                .help("Reload tasks from tasks.json")
                .accessibilityLabel("Refresh Tasks")
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

            // Search bar
            HStack(spacing: 7) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 12))
                    .foregroundColor(.textSecondary)
                TextField("Search tasks...", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.textSecondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Color.secondarySurface)
            .cornerRadius(7)
            .padding(.horizontal, 12)
            .padding(.bottom, 6)

            Divider()

            // Error banner
            if let err = tasksManager.errorMessage {
                HStack {
                    Text(err)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white)
                    Spacer()
                    Button { tasksManager.errorMessage = nil } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 8).padding(.horizontal, 12)
                .background(Color.gmailRed)
                .padding(.horizontal, 12).padding(.top, 8)
            }

            // Task list or empty state container filling remaining space
            Group {
                if filteredTasks.isEmpty {
                    InboxZeroView(selectedSource: selectedSource)
                        .frame(maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(filteredTasks) { task in
                                TaskRow(
                                    task: task,
                                    draggedTask: $draggedTask,
                                    onOpenEditor: onOpenEditor
                                )
                                    .onDrop(of: [.plainText, .text],
                                            delegate: TaskDropDelegate(
                                                item: task,
                                                tasks: $tasksManager.tasks,
                                                draggedItem: $draggedTask,
                                                tasksManager: tasksManager
                                            ) { reordered in
                                                var all = tasksManager.tasks
                                                all.removeAll { t in reordered.contains { $0.id == t.id } }
                                                all.insert(contentsOf: reordered, at: 0)
                                                tasksManager.persistTaskOrder(newTasks: all)
                                            })
                            }
                        }
                    }
                }
            }
            .frame(maxHeight: .infinity)
            .contentShape(Rectangle())
            .onDrop(of: [.plainText, .text],
                    delegate: InboxDropDelegate(tasksManager: tasksManager))
        }
        .background(Color.surfaceBackground)
    }
}

// MARK: - Inbox Zero State
struct InboxZeroView: View {
    let selectedSource: TaskSource?

    var body: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 52))
                .foregroundColor(.successGreen.opacity(0.75))
            Text("All clear!")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)
            Text(selectedSource == nil
                 ? "Your inbox is empty — great work!"
                 : "No tasks from \(selectedSource!.label) right now.")
                .font(.system(size: 13))
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(24)
    }
}

// MARK: - Calendar Panel
struct CalendarPanel: View {
    @Environment(TasksManager.self) var tasksManager
    @Binding var selectedEvent: CalendarEvent?
    @Binding var draggedTask:   TaskItem?
    @AppStorage("showWeekends") private var showWeekends = false
    @State private var scrollTrigger = 0   // incrementing this re-triggers scroll-to-now

    private var visibleDays: Int { showWeekends ? 7 : 5 }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text(tasksManager.currentViewMode == .day ? "Today's Schedule" : "This Week")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.textPrimary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)

                Spacer()

                Button {
                    tasksManager.fetchCalendarEvents()
                    scrollTrigger += 1
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 13))
                        .foregroundStyle(.textSecondary)
                }
                .buttonStyle(.plain)
                .padding(.trailing, 8)
                .help("Reload calendar events from Apple Calendar")

                // Weekends toggle (only relevant in week view)
                if tasksManager.currentViewMode == .week {
                    Toggle(isOn: $showWeekends) {
                        Text("Weekends")
                            .font(.system(size: 11))
                            .foregroundStyle(.textSecondary)
                    }
                    .toggleStyle(.checkbox)
                    .padding(.trailing, 12)
                    .help("Show Saturday and Sunday in week view")
                }

                // Day / Week toggle
                HStack(spacing: 0) {
                    ForEach(TasksManager.ViewMode.allCases) { mode in
                        let isSelected = tasksManager.currentViewMode == mode
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                tasksManager.currentViewMode = mode
                            }
                        } label: {
                            Text(mode.rawValue)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(isSelected ? Color.white : Color.textSecondary)
                                .padding(.vertical, 5)
                                .padding(.horizontal, 14)
                                .background(isSelected ? Color.googleBlue : Color.clear)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .background(Color.secondarySurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(Color.borderGray, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 7))
                .padding(.trailing, 16)
            }
            .background(Color.surfaceBackground)

            Divider()

            // Only render the active view — the inactive view must not exist
            // in the view hierarchy at all, because .allowsHitTesting(false)
            // and .disabled() do NOT suppress .onDrop targets. Having both
            // views alive causes their GridLines to compete for drops.
            if tasksManager.currentViewMode == .day {
                dayView
            } else {
                weekView
            }
        }
        .background(Color.secondarySurface)
    }

    // ── Day View ────────────────────────────────────────────────────────
    // Hours 0..23 (midnight to midnight). ScrollViewReader jumps to
    // 1 hour before now on appear AND whenever scrollTrigger increments
    // (refresh button). Uses .task(id:) so the scroll fires after layout.
    @ViewBuilder private var dayView: some View {
        let nowHour = Calendar.current.component(.hour, from: Date())
        ScrollViewReader { proxy in
            ScrollView {
                ZStack(alignment: .topLeading) {
                    GeometryReader { geo in
                        ZStack(alignment: .topLeading) {
                            VStack(spacing: 0) {
                                ForEach(0...23, id: \.self) { hour in
                                    GridLine(hour: hour, minute: 0)
                                    GridLine(hour: hour, minute: 15)
                                    GridLine(hour: hour, minute: 30)
                                    GridLine(hour: hour, minute: 45)
                                }
                            }
                            .frame(height: 2880)

                            ForEach(tasksManager.calendarEvents.filter { $0.dayOffset == 0 }) { event in
                                let aw = geo.size.width - 47.0
                                let w  = event.totalColumns == 1 ? aw : aw / CGFloat(event.totalColumns)
                                let x  = 47.0 + CGFloat(event.displayColumn) * (aw / CGFloat(event.totalColumns))
                                EventPill(event: event) { selectedEvent = event }
                                    .frame(width: w, height: event.calculateHeight(), alignment: .top)
                                    .offset(x: x, y: calOffset(event))
                            }
                        }
                    }
                    .frame(height: 2880)

                    // Anchor: VStack spacer pushes the id'd view to the
                    // correct Y so scrollTo(anchor:.top) hits the right hour.
                    VStack(spacing: 0) {
                        Color.clear.frame(height: CGFloat(max(0, nowHour - 1)) * 120)
                        Color.clear.frame(height: 1).id("now-anchor")
                    }
                    .frame(width: 1, height: 2880, alignment: .top)
                    .allowsHitTesting(false)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
            }
            .task(id: scrollTrigger) {
                try? await Task.sleep(for: .milliseconds(600))
                withAnimation(.easeInOut(duration: 0.5)) {
                    proxy.scrollTo("now-anchor", anchor: .top)
                }
            }
        }
    }

    // ── Week View ───────────────────────────────────────────────────────
    // Generates dates starting from Monday of the current week.
    // When weekends=off: only Mon–Fri. When weekends=on: Mon–Sun.
    private var weekDates: [Date] {
        let cal  = Calendar.current
        let now  = Date()
        // weekday: Sun=1...Sat=7. Shift so Mon=0.
        let wd   = (cal.component(.weekday, from: now) + 5) % 7
        let mon  = cal.date(byAdding: .day, value: -wd, to: cal.startOfDay(for: now))!
        let count = showWeekends ? 7 : 5
        return (0..<count).map { cal.date(byAdding: .day, value: $0, to: mon)! }
    }

    @ViewBuilder private var weekView: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            HStack(alignment: .top, spacing: 16) {
                ForEach(weekDates.indices, id: \.self) { idx in
                    let date    = weekDates[idx]
                    // dayOffset relative to today (may be negative for past days in week)
                    let dayOff  = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: date).day ?? 0

                    VStack(alignment: .leading) {
                        Text(weekDayLabel(date))
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.textPrimary)
                            .padding(.bottom, 8)

                        ScrollViewReader { proxy in
                            ScrollView {
                                ZStack(alignment: .topLeading) {
                                    GeometryReader { geo in
                                        ZStack(alignment: .topLeading) {
                                            VStack(spacing: 0) {
                                                ForEach(0...23, id: \.self) { h in
                                                    GridLine(hour: h, minute: 0,  dayOffset: dayOff)
                                                    GridLine(hour: h, minute: 15, dayOffset: dayOff)
                                                    GridLine(hour: h, minute: 30, dayOffset: dayOff)
                                                    GridLine(hour: h, minute: 45, dayOffset: dayOff)
                                                }
                                            }
                                            .frame(height: 2880)

                                            ForEach(tasksManager.calendarEvents.filter { $0.dayOffset == dayOff }) { ev in
                                                let w = geo.size.width - 47.0
                                                EventPill(event: ev) { selectedEvent = ev }
                                                    .frame(width: w, height: ev.calculateHeight(), alignment: .top)
                                                    .offset(x: 47, y: calOffset(ev))
                                            }
                                        }
                                    }
                                    .frame(height: 2880)

                                    // Week view: anchor to 8 am so morning events
                                    // are visible regardless of the current time.
                                    let weekAnchorHour = 8
                                    VStack(spacing: 0) {
                                        Color.clear.frame(height: CGFloat(weekAnchorHour) * 120)
                                        Color.clear.frame(height: 1).id("week-anchor-\(idx)")
                                    }
                                    .frame(width: 1, height: 2880, alignment: .top)
                                    .allowsHitTesting(false)
                                }
                            }
                            .task(id: scrollTrigger) {
                                try? await Task.sleep(for: .milliseconds(600 + idx * 50))
                                withAnimation(.easeInOut(duration: 0.5)) {
                                    proxy.scrollTo("week-anchor-\(idx)", anchor: .top)
                                }
                            }
                        }
                        .frame(width: 220)
                        .background(Color.secondarySurface)
                        .cornerRadius(8)
                    }
                }
            }
            // minWidth = cols × (220 column + 16 gap) + 2×16 outer padding
            // This tells the ScrollView the content is wider than the viewport
            // so the horizontal scrollbar appears even on small windows.
            .frame(minWidth: CGFloat((showWeekends ? 7 : 5)) * 236 + 32)
            .padding(.horizontal, 16)
            .padding(.top, 16)
        }
    }

    /// Day view: starts at midnight (hour 0), 2px/min
    private func calOffset(_ event: CalendarEvent) -> CGFloat {
        CGFloat(event.startHour * 60 + event.startMinute) * 2.0
    }

    /// Week view: starts at 7am, 2px/min

    private func weekDayLabel(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "E, MMM d"
        return f.string(from: date)
    }
}

// MARK: - Status Bar
struct StatusBarView: View {
    @Environment(TasksManager.self) var tasksManager

    private var inboxCount: Int {
        tasksManager.tasks.filter {
            $0.status != "completed" &&
            $0.parentTaskId == nil &&
            !tasksManager.calendarEvents.contains { $0.taskId == $0.id }
        }.count
    }
    private var scheduledCount: Int { tasksManager.calendarEvents.filter { $0.taskId != nil }.count }
    private var completedCount: Int { tasksManager.tasks.filter { $0.status == "completed" }.count }

    var body: some View {
        HStack(spacing: 14) {
            Spacer()
            statusChip(icon: "tray.fill", label: "\(inboxCount) inbox", color: .googleBlue)
            Text("·").foregroundColor(.textSecondary.opacity(0.4))
            statusChip(icon: "calendar", label: "\(scheduledCount) scheduled", color: .gchatBlue)
            Text("·").foregroundColor(.textSecondary.opacity(0.4))
            statusChip(icon: "checkmark.circle.fill", label: "\(completedCount) done", color: .successGreen)
            Spacer()
        }
        .padding(.vertical, 5)
        .background(Color.sidebarBackground)
        .overlay(Divider(), alignment: .top)
    }

    @ViewBuilder
    private func statusChip(icon: String, label: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9))
                .foregroundColor(color.opacity(0.7))
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.textSecondary)
        }
    }
}
