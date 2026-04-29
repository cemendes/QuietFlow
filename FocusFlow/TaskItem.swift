import Foundation
import SwiftUI
import Combine
import EventKit

// MARK: - Task Source
enum TaskSource: String, Equatable, CaseIterable {
    case gmail  = "gmail"
    case gchat  = "gchat"
    case chrome = "chrome"
    case manual = "manual"

    var label: String {
        switch self {
        case .gmail:  return "Gmail"
        case .gchat:  return "GChat"
        case .chrome: return "Chrome"
        case .manual: return "Manual"
        }
    }

    var iconName: String {
        switch self {
        case .gmail:  return "envelope.fill"
        case .gchat:  return "bubble.left.fill"
        case .chrome: return "globe"
        case .manual: return "square.and.pencil"
        }
    }

    var color: Color {
        switch self {
        case .gmail:  return .gmailRed
        case .gchat:  return .gchatBlue
        case .chrome: return .chromeGreen
        case .manual: return .manualGray
        }
    }

    var isComingSoon: Bool {
        switch self {
        case .gchat, .chrome: return true
        default: return false
        }
    }
}

// MARK: - Task Item
struct TaskItem: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let details: String?
    let link: String?
    let status: String
    var duration: Int?
    let priority: String?
    let category: String?
    let date: String?
    let parentTaskId: String?

    var identifier: String { id }

    // MARK: Computed
    var source: TaskSource {
        guard let link = link, !link.isEmpty else { return .manual }
        if link.contains("mail.google.com")         { return .gmail }
        if link.contains("chat.google.com")          { return .gchat }
        if link.contains("chrome-extension://") || link.contains("chrome://") { return .chrome }
        return .manual
    }

    var isStale: Bool {
        guard let dateStr = date, !dateStr.isEmpty else { return false }
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        guard let taskDate = fmt.date(from: dateStr) else { return false }
        let days = Calendar.current.dateComponents([.day], from: taskDate, to: Date()).day ?? 0
        return days >= 3
    }
}

// MARK: - Subtask Suggestion
/// An in-memory, editable suggestion produced by the AI breakdown engine.
/// Not persisted until the user explicitly commits via "Create Sub-tasks".
@Observable
class SubtaskSuggestion: Identifiable {
    let id: String = UUID().uuidString
    let parentTaskId: String
    var title: String
    var details: String
    var duration: Int?

    init(parentTaskId: String, title: String, details: String, duration: Int? = nil) {
        self.parentTaskId = parentTaskId
        self.title        = title
        self.details      = details
        self.duration     = duration
    }
}




@Observable
@MainActor
class TasksManager {
    var tasks: [TaskItem] = []
    var calendarEvents: [CalendarEvent] = []
    var errorMessage: String? = nil

    // ── Subtask Suggestions ─────────────────────────────────────────────
    // Keyed by parent task ID. Stored in memory so the user can edit,
    // delete, and recreate suggestions before committing them to the CSV.
    var subtaskSuggestions: [String: [SubtaskSuggestion]] = [:]
    var subtaskLoadingState: [String: Bool] = [:]   // taskId → isLoading
    
    var userName: String = "Eduardo Oliveira"
    var daysBack: Int = 1
    var cookieString: String = ""
    var defaultDuration: Int = 30
    
    var isMorningRitualComplete: Bool = false
    var isShutdownRitualNeeded: Bool = false
    var currentViewMode: ViewMode = .day {
        didSet {
            fetchCalendarEvents()
        }
    }
    
    enum ViewMode: String, CaseIterable, Identifiable {
        case day = "Day"
        case week = "Week"
        var id: String { self.rawValue }
    }

    
    var availableCalendars: [SimpleCalendar] = []
    var selectedCalendarIdentifiers: Set<String> = [] {
        didSet {
            UserDefaults.standard.set(Array(selectedCalendarIdentifiers), forKey: "selectedCalendarIdentifiers")
        }
    }
    var targetCalendarIdentifier: String = "" {
        didSet {
            UserDefaults.standard.set(targetCalendarIdentifier, forKey: "targetCalendarIdentifier")
            fetchCalendarEvents()
        }
    }
    
    private let eventStore = EKEventStore()
    private var fileMonitor: DispatchSourceFileSystemObject?
    private var csvReloadDebounceTask: Task<Void, Never>?  // debounce rapid CSV writes
    private var calendarReloadDebounceTask: Task<Void, Never>?  // debounce EK notifications
    
    init() {
        self.userName = UserDefaults.standard.string(forKey: "userName") ?? "Eduardo Oliveira"
        self.daysBack = UserDefaults.standard.integer(forKey: "daysBack")
        if self.daysBack == 0 { self.daysBack = 1 }
        self.cookieString = UserDefaults.standard.string(forKey: "cookieString") ?? ""
        self.defaultDuration = UserDefaults.standard.integer(forKey: "defaultDuration")
        if self.defaultDuration == 0 { self.defaultDuration = 30 }
        
        self.selectedCalendarIdentifiers = Set(UserDefaults.standard.stringArray(forKey: "selectedCalendarIdentifiers") ?? [])
        self.targetCalendarIdentifier = UserDefaults.standard.string(forKey: "targetCalendarIdentifier") ?? ""
        
        let lastRitualDate = UserDefaults.standard.string(forKey: "lastRitualDate") ?? ""
        let todayDate = TasksManager.formatDate(Date())
        
        if lastRitualDate == todayDate {
            self.isMorningRitualComplete = true
        } else {
            self.isMorningRitualComplete = false
        }
        
        requestCalendarAccess()
        fetchTasks()
        startMonitoringCSV()
        
        // Debounce EK change notifications — Google Calendar sync can fire dozens
        // of notifications in a row; only reload 2 seconds after the LAST one.
        NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: eventStore,
            queue: .main
        ) { [weak self] _ in
            // Hop to @MainActor so we can safely touch @MainActor-isolated properties.
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.calendarReloadDebounceTask?.cancel()
                self.calendarReloadDebounceTask = Task { @MainActor [weak self] in
                    guard let self else { return }
                    try? await Task.sleep(for: .seconds(2))
                    guard !Task.isCancelled else { return }
                    print("[Calendar] Reloading after external change (debounced)")
                    self.fetchCalendarEvents()
                }
            }
        }
    }
    
    static func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    
    func completeMorningRitual() {
        let todayDate = TasksManager.formatDate(Date())
        UserDefaults.standard.set(todayDate, forKey: "lastRitualDate")
        self.isMorningRitualComplete = true
    }
    
    func skipMorningRitual() {
        self.isMorningRitualComplete = true
    }

    func triggerShutdownRitual() {
        self.isShutdownRitualNeeded = true
    }

    func completeShutdownRitual() {
        self.isShutdownRitualNeeded = false
    }

    
    private func getCsvURL() -> URL? {
        return URL(fileURLWithPath: "/Users/cemolive/My Drive/tasks.csv")
    }
    
    func startMonitoringCSV() {
        guard let url = getCsvURL() else { return }

        let fileDescriptor = open(url.path, O_EVTONLY)
        guard fileDescriptor >= 0 else { return }

        let monitor = DispatchSource.makeFileSystemObjectSource(fileDescriptor: fileDescriptor, eventMask: .write, queue: DispatchQueue.global())

        monitor.setEventHandler { [weak self] in
            guard let self else { return }
            // Debounce: multiple subtask writes fire in rapid succession;
            // only reload 1 second after the LAST write.
            self.csvReloadDebounceTask?.cancel()
            self.csvReloadDebounceTask = Task { @MainActor in
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                print("[CSV] Reloading after file change (debounced)")
                self.fetchTasks()
            }
        }

        monitor.setCancelHandler {
            close(fileDescriptor)
        }

        monitor.resume()
        self.fileMonitor = monitor
    }
    
    func parseCSVLine(_ line: String) -> [String] {
        var result: [String] = []
        var currentField = ""
        var inQuotes = false
        
        let characters = Array(line)
        var i = 0
        while i < characters.count {
            let char = characters[i]
            if char == "\"" {
                if inQuotes && i + 1 < characters.count && characters[i+1] == "\"" {
                    currentField.append("\"")
                    i += 1
                } else {
                    inQuotes.toggle()
                }
            } else if char == "," && !inQuotes {
                result.append(currentField)
                currentField = ""
            } else {
                currentField.append(char)
            }
            i += 1
        }
        result.append(currentField)
        return result
    }
    
    func fetchTasks() {
        guard let url = getCsvURL() else { return }
        
        print("Fetching tasks from CSV at: \(url.path)")
        
        Task.detached(priority: .background) {
            do {
                if !FileManager.default.fileExists(atPath: url.path) {
                    print("CSV file does not exist, creating it...")
                    let header = "id,title,details,link,status\n"
                    try header.write(to: url, atomically: true, encoding: .utf8)
                }
                
                let content = try String(contentsOf: url, encoding: .utf8)
                print("Read \(content.count) characters from CSV.")
                
                var newTasks: [TaskItem] = []
                var currentField = ""
                var inQuotes = false
                var columns: [String] = []
                
                let characters = Array(content)
                var i = 0
                
                // Skip header line
                while i < characters.count && characters[i] != "\n" {
                    i += 1
                }
                if i < characters.count { i += 1 } // skip the newline
                
                while i < characters.count {
                    let char = characters[i]
                    
                    if char == "\"" {
                        if inQuotes && i + 1 < characters.count && characters[i+1] == "\"" {
                            currentField.append("\"")
                            i += 1
                        } else {
                            inQuotes.toggle()
                        }
                    } else if char == "," && !inQuotes {
                        columns.append(currentField)
                        currentField = ""
                    } else if (char == "\n" || char == "\r") && !inQuotes {
                        // Handle potential \r\n
                        if char == "\r" && i + 1 < characters.count && characters[i+1] == "\n" {
                            i += 1
                        }
                        
                        columns.append(currentField)
                        currentField = ""
                        
                        if columns.count >= 5 && UUID(uuidString: columns[0]) != nil {
                            let task = TaskItem(
                                id: columns[0],
                                title: columns[1],
                                details: columns[2],
                                link: columns[3],
                                status: columns.count >= 5 ? columns[4] : "needsAction",
                                duration: columns.count >= 6 ? Int(columns[5]) : nil,
                                priority: columns.count >= 7 ? columns[6] : nil,
                                category: columns.count >= 8 ? columns[7] : nil,
                                date: columns.count >= 9 ? columns[8] : nil,
                                parentTaskId: columns.count >= 10 ? (columns[9].isEmpty ? nil : columns[9]) : nil
                            )
                            newTasks.append(task)
                        } else {
                            print("Skipping invalid CSV line (invalid ID): \(columns.first ?? "nil")")
                        }
                        columns = []
                    } else {
                        currentField.append(char)
                    }
                    i += 1
                }
                
                // Handle last line if it doesn't end with newline
                if !currentField.isEmpty || !columns.isEmpty {
                    columns.append(currentField)
                    if columns.count >= 5 {
                        let task = TaskItem(
                            id: columns[0],
                            title: columns[1],
                            details: columns[2],
                            link: columns[3],
                            status: columns.count >= 5 ? columns[4] : "needsAction",
                            duration: columns.count >= 6 ? Int(columns[5]) : nil,
                            priority: columns.count >= 7 ? columns[6] : nil,
                            category: columns.count >= 8 ? columns[7] : nil,
                            date: columns.count >= 9 ? columns[8] : nil,
                            parentTaskId: columns.count >= 10 ? (columns[9].isEmpty ? nil : columns[9]) : nil
                        )
                        newTasks.append(task)
                    }
                }

                // Sort outside the MainActor hop so `newTasks` (a var) is
                // fully consumed before crossing the isolation boundary.
                let sortedTasks = newTasks.sorted { a, b in
                    let dateA = Self.parseDate(a.date)
                    let dateB = Self.parseDate(b.date)
                    if let da = dateA, let db = dateB {
                        if da != db { return da > db }
                    } else if dateA != nil { return true  }
                    else if dateB != nil { return false }
                    return false
                }
                await MainActor.run {
                    self.tasks = sortedTasks
                    self.errorMessage = nil
                }
            } catch {
                print("Error reading CSV: \(error.localizedDescription)")
                await MainActor.run {
                    self.errorMessage = "Failed to read tasks file."
                }
            }
        }
    }

    nonisolated private static func parseDate(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        for format in ["yyyy-MM-dd", "MMM d, yyyy", "MMM d"] {
            fmt.dateFormat = format
            if let d = fmt.date(from: raw) { return d }
        }
        return nil
    }

    /// Formats a raw CSV date string (yyyy-MM-dd) as "MMM d" for display.
    static func formatDateForDisplay(_ raw: String?) -> String? {
        guard let d = parseDate(raw) else { return raw }
        let fmt = DateFormatter()
        fmt.dateFormat = "MMM d"
        return fmt.string(from: d)
    }
    
    func escapeCSVField(_ field: String) -> String {
        if field.contains(",") || field.contains("\"") || field.contains("\n") {
            let escaped = field.replacingOccurrences(of: "\"", with: "\"\"")
            return "\"\(escaped)\""
        }
        return field
    }
    
    func createTask(title: String, details: String? = nil, link: String? = nil, duration: Int? = nil, priority: String? = nil, parentTaskId: String? = nil) {
        guard let url = getCsvURL() else { return }

        let id = UUID().uuidString
        let eTitle        = escapeCSVField(title)
        let eDetails      = escapeCSVField(details ?? "")
        let eLink         = escapeCSVField(link ?? "")
        let eParentTaskId = escapeCSVField(parentTaskId ?? "")
        let durationStr   = duration != nil ? String(duration!) : ""
        let priorityStr   = priority ?? "low"

        // Stamp today's date so new tasks sort to the top and display "MMM d"
        let todayISO: String = {
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            return fmt.string(from: Date())
        }()

        // id,title,details,link,status,duration,priority,category,date,parentTaskId
        let line = "\(id),\(eTitle),\(eDetails),\(eLink),needsAction,\(durationStr),\(priorityStr),,\(todayISO),\(eParentTaskId)\n"

        do {
            if let fileHandle = try? FileHandle(forWritingTo: url) {
                fileHandle.seekToEndOfFile()
                fileHandle.write(line.data(using: .utf8)!)
                fileHandle.closeFile()
            } else {
                try line.write(to: url, atomically: true, encoding: .utf8)
            }
            print("[CreateTask] Created '\(title)' priority=\(priorityStr) date=\(todayISO)")
            fetchTasks()
        } catch {
            print("[CreateTask] Error writing to CSV: \(error.localizedDescription)")
        }
    }
    
    private func saveTasksToCsv(_ tasksToSave: [TaskItem]) {
        guard let url = getCsvURL() else { return }
        
        do {
            var header = "id,title,details,link,status,duration,priority,category,date,parentTaskId\n"
            
            if let content = try? String(contentsOf: url, encoding: .utf8),
               let firstLine = content.components(separatedBy: .newlines).first,
               firstLine.contains("id,") {
                header = firstLine + "\n"
            }
            
            var newContent = header
            for task in tasksToSave {
                let eTitle = escapeCSVField(task.title)
                let eDetails = escapeCSVField(task.details ?? "")
                let eLink = escapeCSVField(task.link ?? "")
                let duration = task.duration != nil ? String(task.duration!) : ""
                let priority = task.priority ?? ""
                let category = task.category ?? ""
                let date = task.date ?? ""
                let parentTaskId = task.parentTaskId ?? ""
                
                let line = "\(task.id),\(eTitle),\(eDetails),\(eLink),\(task.status),\(duration),\(priority),\(category),\(date),\(parentTaskId)\n"
                newContent += line
            }
            
            try newContent.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            print("Error saving tasks to CSV: \(error.localizedDescription)")
        }
    }

    func deleteTask(id: String) {
        let updatedTasks = self.tasks.filter { $0.id != id }
        saveTasksToCsv(updatedTasks)
        self.tasks = updatedTasks
    }
    
    func updateTask(id: String, title: String, details: String?, link: String?, status: String? = nil, duration: Int? = nil, priority: String? = nil) {
        var updatedTasks = self.tasks
        if let index = updatedTasks.firstIndex(where: { $0.id == id }) {
            let current = updatedTasks[index]
            let updated = TaskItem(
                id: id,
                title: title,
                details: details,
                link: link,
                status: status ?? current.status,
                duration: duration ?? current.duration,
                priority: priority ?? current.priority,
                category: current.category,
                date: current.date,
                parentTaskId: current.parentTaskId
            )
            updatedTasks[index] = updated
            saveTasksToCsv(updatedTasks)
            self.tasks = updatedTasks
        }
    }

    /// Pushes a set of tasks to tomorrow by updating their date field.
    /// Called from the Morning Ritual when the user completes without selecting certain tasks.
    func deferTasksToTomorrow(ids: Set<String>) {
        guard !ids.isEmpty else { return }
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
        let tomorrowStr = TasksManager.formatDate(tomorrow)
        var updatedTasks = self.tasks
        for i in updatedTasks.indices {
            guard ids.contains(updatedTasks[i].id) else { continue }
            let t = updatedTasks[i]
            updatedTasks[i] = TaskItem(
                id: t.id, title: t.title, details: t.details, link: t.link,
                status: t.status, duration: t.duration, priority: t.priority,
                category: t.category, date: tomorrowStr, parentTaskId: t.parentTaskId
            )
        }
        saveTasksToCsv(updatedTasks)
        self.tasks = updatedTasks
    }

    func persistTaskOrder(newTasks: [TaskItem]) {
        var mergedTasks = newTasks
        for task in self.tasks {
            if !mergedTasks.contains(where: { $0.id == task.id }) {
                mergedTasks.append(task)
            }
        }
        
        saveTasksToCsv(mergedTasks)
        self.tasks = mergedTasks
    }


    
    private func requestCalendarAccess() {


        eventStore.requestFullAccessToEvents { granted, error in
            Task { @MainActor in
                if granted {
                    print("Calendar access granted")
                    self.fetchAvailableCalendars()
                    self.fetchCalendarEvents()
                } else {
                    print("Calendar access denied: \(error?.localizedDescription ?? "unknown error")")
                    self.errorMessage = "Calendar access denied. Please enable in System Settings."
                }
            }
        }
    }
    
    func fetchAvailableCalendars() {
        let calendars = eventStore.calendars(for: .event)
        print("Found \(calendars.count) available calendars.")
        let simpleCals = calendars.map { SimpleCalendar(id: $0.calendarIdentifier, title: $0.title) }
        self.availableCalendars = simpleCals
    }
    
    func fetchCalendarEvents() {
        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else { return }

        let targetCalId = targetCalendarIdentifier
        // Guard: if no target calendar is set, don't fetch (avoids dumping all events)
        guard !targetCalId.isEmpty else {
            print("[Calendar] No target calendar set — skipping fetch")
            return
        }

        let localViewMode = currentViewMode
        let sharedStore = eventStore   // reuse shared store — creating new ones fires EKEventStoreChangedNotification
        Task.detached(priority: .userInitiated) {
            let today = Date()
            let calendar = Calendar.current
            let startOfDay = calendar.startOfDay(for: today)
            let endOfDay: Date
            if localViewMode == .week {
                endOfDay = calendar.date(byAdding: .day, value: 7, to: startOfDay)!
            } else {
                endOfDay = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: today)!
            }

            let allCals = sharedStore.calendars(for: .event)
            let calendars = allCals.filter { $0.calendarIdentifier == targetCalId }
            guard !calendars.isEmpty else {
                print("[Calendar] Target calendar \(targetCalId) not found — skipping")
                return
            }
            print("Fetching events for calendars: \(calendars.map { $0.title })")
            let predicate = sharedStore.predicateForEvents(withStart: startOfDay, end: endOfDay, calendars: calendars)
            let events = sharedStore.events(matching: predicate)
            
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss Z"
            formatter.timeZone = calendar.timeZone
            
            print("Current calendar timezone: \(calendar.timeZone)")
            print("Found \(events.count) events total.")
            for ev in events {
                let startHour = calendar.component(.hour, from: ev.startDate)
                let startMinute = calendar.component(.minute, from: ev.startDate)
                let endHour = calendar.component(.hour, from: ev.endDate)
                let endMinute = calendar.component(.minute, from: ev.endDate)
                let localStr = formatter.string(from: ev.startDate)
                print("Event: \(ev.title ?? "Untitled") starts at \(startHour):\(startMinute), ends at \(endHour):\(endMinute) (Local: \(localStr)) in \(ev.calendar.title)")
            }

            
            let fetchedEvents = events.filter { !$0.isAllDay }.map { event -> CalendarEvent in
                var taskId: String? = nil
                if let notes = event.notes, notes.contains("FocusFlow Task ID: ") {
                    taskId = notes.replacingOccurrences(of: "FocusFlow Task ID: ", with: "")
                }

                let isCompleted = event.title?.hasPrefix("✅") ?? false
                let dayOffset = calendar.dateComponents([.day], from: startOfDay, to: event.startDate).day ?? 0

                // Determine RSVP status from self-attendance
                var rsvp = RSVPStatus.unknown
                if let attendees = event.attendees {
                    if let me = attendees.first(where: { $0.isCurrentUser }) {
                        switch me.participantStatus {
                        case .accepted:  rsvp = .accepted
                        case .tentative: rsvp = .maybe
                        case .declined:  rsvp = .declined
                        default:         rsvp = .unknown
                        }
                    }
                }

                var ev = CalendarEvent(
                    title: event.title ?? "",
                    startHour: calendar.component(.hour, from: event.startDate),
                    startMinute: calendar.component(.minute, from: event.startDate),
                    endHour: calendar.component(.hour, from: event.endDate),
                    endMinute: calendar.component(.minute, from: event.endDate),
                    isAllDay: event.isAllDay,
                    taskId: taskId,
                    isTentative: event.status == .tentative,
                    calendarId: event.calendar.calendarIdentifier,
                    isCompleted: isCompleted,
                    dayOffset: dayOffset
                )
                ev.rsvpStatus = rsvp
                return ev
            }
            
            func eventsOverlap(_ e1: CalendarEvent, _ e2: CalendarEvent) -> Bool {
                let s1 = e1.startHour * 60 + e1.startMinute
                let s2 = e2.startHour * 60 + e2.startMinute
                let end1 = e1.endHour * 60 + e1.endMinute
                let end2 = e2.endHour * 60 + e2.endMinute
                return s1 < end2 && s2 < end1
            }
            
            let sortedEvents = fetchedEvents.sorted { ($0.startHour * 60 + $0.startMinute) < ($1.startHour * 60 + $1.startMinute) }
            var finalEvents: [CalendarEvent] = []
            
            for i in 0..<sortedEvents.count {
                let event = sortedEvents[i]
                var concurrentEvents = [event]
                
                for j in 0..<sortedEvents.count {
                    if i != j && eventsOverlap(event, sortedEvents[j]) {
                        concurrentEvents.append(sortedEvents[j])
                    }
                }
                
                concurrentEvents.sort { ($0.startHour * 60 + $0.startMinute) < ($1.startHour * 60 + $1.startMinute) }
                
                // Use value-equality (CalendarEvent: Equatable) to avoid
                // accessing the computed `id` property in a detached task.
                let displayColumn = concurrentEvents.firstIndex(of: event) ?? 0
                
                var updatedEvent = event
                updatedEvent.displayColumn = displayColumn
                updatedEvent.totalColumns = concurrentEvents.count
                finalEvents.append(updatedEvent)
            }
            
            // Snapshot the var before crossing the MainActor boundary.
            let eventsSnapshot = finalEvents
            await MainActor.run {
                self.calendarEvents = eventsSnapshot
            }
        }
    }
    
    func scheduleTaskAuto(id: String) {
        guard let task = tasks.first(where: { $0.id == id }) else { return }
        let duration = task.duration ?? defaultDuration
        
        var currentHour = 9
        var currentMinute = 0
        
        while currentHour < 18 {
            let s = currentHour * 60 + currentMinute
            let e = s + duration
            
            let hasOverlap = calendarEvents.contains { ce in
                let cs = ce.startHour * 60 + ce.startMinute
                let ceEnd = ce.endHour * 60 + ce.endMinute
                return s < ceEnd && e > cs
            }
            
            if !hasOverlap {
                scheduleTask(id: id, hour: currentHour, minute: currentMinute)
                return
            }
            
            currentMinute += 15
            if currentMinute >= 60 {
                currentHour += 1
                currentMinute = 0
            }
        }
        
        scheduleTask(id: id, hour: 9, minute: 0)
    }
        func scheduleTask(id: String, hour: Int, minute: Int, dayOffset: Int = 0) {
            print("[Schedule] DROP received → id=\(id) hour=\(hour) minute=\(minute) dayOffset=\(dayOffset)")
        guard let task = tasks.first(where: { $0.id == id }) else { return }

        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else { return }

        let duration = task.duration ?? defaultDuration
        let taskTitle = task.title
        let propS = hour * 60 + minute
        let propE = propS + duration

        // ── RSVP-aware overlap check ──────────────────────────────────────
        // Block only on accepted/own/unknown events or another FocusFlow task.
        // Maybe & Declined are considered soft-available (slot is reusable).
        let hasHardConflict = calendarEvents.contains { ce in
            guard ce.taskId != id        else { return false } // don't block self
            guard ce.dayOffset == dayOffset else { return false } // same day
            guard !ce.isAvailableSlot    else { return false } // skip maybe/declined
            let ceS = ce.startHour * 60 + ce.startMinute
            let ceE = ce.endHour   * 60 + ce.endMinute
            return propS < ceE && propE > ceS
        }
        if hasHardConflict {
            errorMessage = "That time slot is already taken by another event."
            return
        }
        // ─────────────────────────────────────────────────────────────────

        // ── Optimistic update (instant, no EK scan) ──────────────────────
        calendarEvents.removeAll { $0.taskId == id }
        let endTotalMin = hour * 60 + minute + duration
        let optimisticEvent = CalendarEvent(
            title: "[FocusFlow] \(taskTitle)",
            startHour: hour,
            startMinute: minute,
            endHour: endTotalMin / 60,
            endMinute: endTotalMin % 60,
            isAllDay: false,
            taskId: id,
            isTentative: false,
            calendarId: targetCalendarIdentifier,
            isCompleted: false,
            dayOffset: dayOffset
        )
        calendarEvents.append(optimisticEvent)
        // ─────────────────────────────────────────────────────────────────

        // Capture actor-isolated values before leaving @MainActor context
        let capturedStore      = eventStore
        let capturedCalId      = targetCalendarIdentifier
        let capturedDefaultCal = eventStore.defaultCalendarForNewEvents

        // ── EK write off main thread so it never blocks a drag gesture ────
        Task.detached(priority: .userInitiated) { [weak self] in
            guard let self else { return }

            // Delete any existing EK events for this task ID.
            // We do this directly here (NOT via unscheduleTask) so we never
            // touch the already-updated in-memory calendarEvents array.
            let allCals = capturedStore.calendars(for: .event)
            let today = Date()
            let cal   = Calendar.current
            // Search a 14-day window to catch events moved to/from different days
            let searchStart = cal.date(byAdding: .day, value: -7, to: cal.startOfDay(for: today))!
            let searchEnd   = cal.date(byAdding: .day, value: +7, to: today)!
            let deletePredicate = capturedStore.predicateForEvents(
                withStart: searchStart, end: searchEnd, calendars: nil)
            let existingEvents = capturedStore.events(matching: deletePredicate)
            for ev in existingEvents {
                if let notes = ev.notes, notes.contains("FocusFlow Task ID: \(id)") {
                    do {
                        try capturedStore.remove(ev, span: .thisEvent)
                        print("[Schedule] Removed old EK event: \(ev.title ?? "")")
                    } catch {
                        print("[Schedule] Failed to remove old EK event: \(error)")
                    }
                }
            }

            // Write the new EK event
            let ekEvent = EKEvent(eventStore: capturedStore)
            ekEvent.title = "[FocusFlow] \(taskTitle)"
            ekEvent.notes = "FocusFlow Task ID: \(id)"

            let targetDay  = cal.date(byAdding: .day, value: dayOffset,
                                      to: cal.startOfDay(for: today))!
            var components = cal.dateComponents([.year, .month, .day], from: targetDay)
            components.hour   = hour
            components.minute = minute
            components.second = 0

            let startDate = cal.date(from: components)!
            let endDate   = cal.date(byAdding: .minute, value: duration, to: startDate)!
            ekEvent.startDate = startDate
            ekEvent.endDate   = endDate

            if let targetCal = allCals.first(where: { $0.calendarIdentifier == capturedCalId }) {
                ekEvent.calendar = targetCal
            } else {
                ekEvent.calendar = capturedDefaultCal
            }

            do {
                try capturedStore.save(ekEvent, span: .thisEvent)
                print("[Schedule] Saved EK event at \(hour):\(minute) dayOffset=\(dayOffset)")
            } catch {
                await MainActor.run {
                    self.calendarEvents.removeAll { $0.taskId == id }
                }
                print("[Schedule] Error saving event: \(error.localizedDescription)")
            }
            try? await Task.sleep(for: .milliseconds(800))
            await MainActor.run { self.fetchCalendarEvents() }
        }
    }

    // MARK: - Breakdown & Subtask Suggestions

    /// Fetches 3–5 subtask suggestions from Gemini and stores them in
    /// `subtaskSuggestions[id]` so the user can edit/delete before creating.
    func breakdownTask(id: String, extraContext: String = "") {
        guard let task = tasks.first(where: { $0.id == id }) else { return }
        // Use details if available, otherwise fall back to title
        let context = [task.details, task.title].compactMap { $0 }.first(where: { !$0.isEmpty }) ?? task.title

        subtaskLoadingState[id] = true
        subtaskSuggestions[id] = []

        guard let apiKey = KeychainHelper.shared.readString(service: "FocusFlow", account: "GeminiAPIKey") else {
            print("[Breakdown] Gemini API key not found in Keychain.")
            subtaskLoadingState[id] = false
            return
        }
        let model  = "gemini-2.5-flash"
        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)"
        guard let url = URL(string: urlString) else { subtaskLoadingState[id] = false; return }

        let extraLine = extraContext.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? ""
            : "\nAdditional Focus: \(extraContext.trimmingCharacters(in: .whitespacesAndNewlines))"

        let prompt = """
        You are a productivity assistant. Break the following task into 3-5 concrete, actionable sub-tasks.

        For each sub-task, output EXACTLY this JSON structure (no extra text, no markdown fences):
        [
          {
            "title": "Concise action-oriented title (max 8 words)",
            "details": "Full description: what to do, why, any relevant context",
            "duration": 30
          }
        ]

        Task: \(task.title)
        Context: \(context)\(extraLine)
        """

        let body: [String: Any] = [
            "contents": [["parts": [["text": prompt]]]]
        ]

        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            subtaskLoadingState[id] = false; return
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = bodyData

        Task {
            do {
                let (data, response) = try await URLSession.shared.data(for: req)
                let httpStatus = (response as? HTTPURLResponse)?.statusCode ?? -1
                let rawText = String(data: data, encoding: .utf8) ?? ""
                print("[Breakdown] HTTP \(httpStatus): \(rawText.prefix(400))")

                await MainActor.run { self.subtaskLoadingState[id] = false }
                // Extract the JSON text from the Gemini envelope
                guard let env = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let candidates = env["candidates"] as? [[String: Any]],
                      let firstCandidate = candidates.first,
                      let content = firstCandidate["content"] as? [String: Any],
                      let parts = content["parts"] as? [[String: Any]],
                      let text = parts.first?["text"] as? String
                else {
                    print("[Breakdown] Failed to parse Gemini envelope")
                    return
                }

                // Parse the JSON array of sub-task objects
                let jsonText = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    .replacingOccurrences(of: "```json", with: "")
                    .replacingOccurrences(of: "```", with: "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)

                if let jsonData = jsonText.data(using: .utf8),
                   let array = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]] {
                    let suggestions = array.compactMap { dict -> SubtaskSuggestion? in
                        guard let title = dict["title"] as? String, !title.isEmpty else { return nil }
                        return SubtaskSuggestion(
                            parentTaskId: id,
                            title: title,
                            details: dict["details"] as? String ?? "",
                            duration: dict["duration"] as? Int ?? 30
                        )
                    }
                    await MainActor.run {
                        self.subtaskSuggestions[id] = suggestions
                        print("[Breakdown] Parsed \(suggestions.count) suggestions for task \(id)")
                    }
                } else {
                    // Fallback: try line-by-line bullet parsing
                    let suggestions = jsonText
                        .components(separatedBy: .newlines)
                        .filter { $0.hasPrefix("-") || $0.hasPrefix("*") || $0.hasPrefix("•") }
                        .compactMap { line -> SubtaskSuggestion? in
                            let t = line.dropFirst().trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !t.isEmpty else { return nil }
                            return SubtaskSuggestion(parentTaskId: id, title: t, details: "", duration: 30)
                        }
                    await MainActor.run {
                        self.subtaskSuggestions[id] = suggestions
                        print("[Breakdown] Fallback parsed \(suggestions.count) suggestions")
                    }
                }
            } catch {
                print("[Breakdown] Network error: \(error)")
                await MainActor.run { self.subtaskLoadingState[id] = false }
            }
        }
    }

    /// Clears existing suggestions and re-runs breakdownTask
    func regenerateSuggestions(for id: String, extraContext: String = "") {
        subtaskSuggestions[id] = nil
        breakdownTask(id: id, extraContext: extraContext)
    }

    func addSuggestion(_ suggestion: SubtaskSuggestion, for taskId: String) {
        subtaskSuggestions[taskId, default: []].append(suggestion)
    }

    func removeSuggestion(id: String, from taskId: String) {
        subtaskSuggestions[taskId]?.removeAll { $0.id == id }
    }

    func updateSuggestion(_ suggestion: SubtaskSuggestion, for taskId: String) {
        guard let idx = subtaskSuggestions[taskId]?.firstIndex(where: { $0.id == suggestion.id }) else { return }
        subtaskSuggestions[taskId]?[idx] = suggestion
    }
    
    /// Commits the in-memory suggestions to the CSV as actual sub-tasks.
    /// Each sub-task gets a concise title + the full description in details.
    func createSubTasks(from suggestions: [SubtaskSuggestion], for task: TaskItem) {
        guard !suggestions.isEmpty else { return }

        var contentToAppend = ""
        for suggestion in suggestions {
            let id            = UUID().uuidString
            let eTitle        = escapeCSVField(suggestion.title)
            let eDetails      = escapeCSVField(suggestion.details.isEmpty
                ? "Sub-task of: \(task.title)"
                : suggestion.details)
            let eLink         = escapeCSVField(task.link ?? "")
            let eParentTaskId = escapeCSVField(task.id)
            let eDuration     = suggestion.duration != nil ? "\(suggestion.duration!)" : ""
            let line = "\(id),\(eTitle),\(eDetails),\(eLink),needsAction,,,\(eDuration),,\(eParentTaskId)\n"
            contentToAppend += line
            print("[Subtask] Creating: \(suggestion.title)")
        }

        guard let url = getCsvURL() else { return }

        do {
            if let fileHandle = try? FileHandle(forWritingTo: url) {
                fileHandle.seekToEndOfFile()
                fileHandle.write(contentToAppend.data(using: .utf8)!)
                fileHandle.closeFile()
            } else {
                try contentToAppend.write(to: url, atomically: true, encoding: .utf8)
            }
            // Clear the draft suggestion cards immediately so they don't linger
            DispatchQueue.main.async {
                self.subtaskSuggestions[task.id] = nil
            }
            fetchTasks()
        } catch {
            print("Error writing to CSV: \(error.localizedDescription)")
        }
    }
    
    func completeTask(id: String) {
        print("completeTask called for id: \(id)")
        
        // 1. Update CSV status to "completed"
        guard let task = tasks.first(where: { $0.id == id }) else { return }
        updateTask(id: id, title: task.title, details: task.details, link: task.link, status: "completed")
        
        // 2. Update Apple Calendar event title
        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else { return }
        
        let today = Date()
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: today)
        let endOfDay = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: today)!
        
        let predicate = eventStore.predicateForEvents(withStart: startOfDay, end: endOfDay, calendars: nil)
        let events = eventStore.events(matching: predicate)
        print("completeTask: Found \(events.count) events for today.")
        
        for event in events {
            if let notes = event.notes, notes.contains(id) {
                print("Found event to mark complete: \(event.title ?? "Untitled")")
                if let currentTitle = event.title, !currentTitle.hasPrefix("✅") {
                    event.title = "✅ " + currentTitle
                    do {
                        try eventStore.save(event, span: .thisEvent)
                        print("Event updated in Apple Calendar!")
                    } catch {
                        print("Error updating event: \(error.localizedDescription)")
                    }
                }
            }
        }
        
        fetchCalendarEvents()
    }
    
    func uncompleteTask(id: String) {
        print("uncompleteTask called for id: \(id)")
        
        // 1. Update CSV status to "needsAction"
        guard let task = tasks.first(where: { $0.id == id }) else { return }
        updateTask(id: id, title: task.title, details: task.details, link: task.link, status: "needsAction")
        
        // 2. Update Apple Calendar event title
        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else { return }
        
        let today = Date()
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: today)
        let endOfDay = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: today)!
        
        let predicate = eventStore.predicateForEvents(withStart: startOfDay, end: endOfDay, calendars: nil)
        let events = eventStore.events(matching: predicate)
        print("uncompleteTask: Found \(events.count) events for today.")
        
        for event in events {
            print("Checking event: \(event.title ?? "Untitled"), notes: \(event.notes ?? "nil")")
            if let notes = event.notes, notes.contains(id) {
                print("Found event to mark not complete: \(event.title ?? "Untitled")")
                if let currentTitle = event.title, currentTitle.hasPrefix("✅ ") {
                    event.title = currentTitle.replacingOccurrences(of: "✅ ", with: "")
                    do {
                        try eventStore.save(event, span: .thisEvent)
                        print("Event updated in Apple Calendar!")
                    } catch {
                        print("Error updating event: \(error.localizedDescription)")
                    }
                }
            }
        }
        
        fetchCalendarEvents()
    }
    
    func unscheduleTask(id: String, refresh: Bool = true) {
        print("[Unschedule] called for id: \(id)")

        // Optimistic in-memory removal (instant UI feedback)
        calendarEvents.removeAll { $0.taskId == id }

        // EK deletion — search a broad window to catch future-dated events too
        let ekStatus = EKEventStore.authorizationStatus(for: .event)
        guard ekStatus == .fullAccess else { return }

        let today = Date()
        let calendar = Calendar.current
        let searchStart = calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: today))!
        let searchEnd   = calendar.date(byAdding: .day, value: +8, to: today)!

        let predicate = eventStore.predicateForEvents(withStart: searchStart, end: searchEnd, calendars: nil)
        let events = eventStore.events(matching: predicate)
        print("[Unschedule] Scanning \(events.count) EK events")

        for event in events {
            if let notes = event.notes, notes.contains("FocusFlow Task ID: \(id)") {
                do {
                    try eventStore.remove(event, span: .thisEvent)
                    print("[Unschedule] Removed EK event: \(event.title ?? "")")
                } catch {
                    print("[Unschedule] Failed to remove: \(error)")
                }
            }
        }

        if refresh {
            fetchCalendarEvents()
        }
    }
}
