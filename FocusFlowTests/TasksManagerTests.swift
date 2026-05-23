import Foundation

@MainActor
class TasksManagerTests {
    var manager: TasksManager!
    var tempDir: URL!
    
    func setUp() {
        UserDefaults.standard.removeObject(forKey: "userName")
        UserDefaults.standard.removeObject(forKey: "daysBack")
        UserDefaults.standard.removeObject(forKey: "cookieString")
        
        // Setup a fully sandboxed isolated folder for tests (prevents live data pollution)
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("com.focusflow.tests")
            .appendingPathComponent(UUID().uuidString)
        try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        
        manager = TasksManager(baseDirectory: tempDir)
        manager.bypassCalendarPermissionCheck = true
    }
    
    func tearDown() {
        // Clean up temp directories
        try? FileManager.default.removeItem(at: tempDir)
    }
    
    func assert(_ condition: Bool, _ message: String, file: String = #file, line: Int = #line) {
        if !condition {
            print("Assertion failed: \(message) at \(file):\(line)")
            exit(1)
        }
    }
    
    func testInit() {
        setUp()
        assert(manager.userName == "Eduardo Oliveira", "Initial userName should be Eduardo Oliveira")
        assert(manager.daysBack == 1, "Initial daysBack should be 1")
        print("testInit passed")
        tearDown()
    }
    
    func testOptimisticSchedule() {
        setUp()
        let task = TaskItem(
            id: "1",
            title: "Test Task",
            project: nil,
            details: nil,
            link: nil,
            status: "needsAction",
            duration: nil,
            priority: nil,
            category: nil,
            date: nil,
            parentTaskId: nil
        )
        manager.tasks = [task]
        
        manager.scheduleTask(id: "1", hour: 10, minute: 0)
        
        let scheduledEvent = manager.calendarEvents.first(where: { $0.taskId == "1" })
        assert(scheduledEvent != nil, "Scheduled event should be found in calendarEvents")
        assert(scheduledEvent?.startHour == 10, "Event should start at 10")
        print("testOptimisticSchedule passed")
        tearDown()
    }
    
    func testOptimisticUnschedule() {
        setUp()
        let event = CalendarEvent(
            id: "event-1",
            title: "Test Task",
            startHour: 10,
            startMinute: 0,
            endHour: 11,
            endMinute: 0,
            isAllDay: false,
            taskId: "1",
            isTentative: false,
            calendarId: "default",
            isCompleted: false,
            dayOffset: 0
        )
        manager.calendarEvents = [event]
        
        manager.unscheduleTask(id: "1")
        
        let scheduledEvent = manager.calendarEvents.first(where: { $0.taskId == "1" })
        assert(scheduledEvent == nil, "Scheduled event should NOT be found in calendarEvents")
        print("testOptimisticUnschedule passed")
        tearDown()
    }
    
    func testNoteManagerPathTraversalProtection() {
        setUp()
        let noteManager = NoteManager(baseDirectory: tempDir.appendingPathComponent("FocusFlow"))
        
        // 1. Valid Task ID
        let validId = "valid-task-uuid-1234"
        let validURL = noteManager.noteURL(for: validId)
        assert(validURL != nil, "Valid taskId should return a valid URL")
        
        // 2. Directory Traversal Task ID
        let traversalId = "../../../bash_profile"
        let traversalURL = noteManager.noteURL(for: traversalId)
        assert(traversalURL == nil, "Directory traversal taskId must return nil")
        
        print("testNoteManagerPathTraversalProtection passed")
        tearDown()
    }
}


@main
struct TestRunner {
    static func main() {
        let tests = TasksManagerTests()
        tests.testInit()
        tests.testOptimisticSchedule()
        tests.testOptimisticUnschedule()
        tests.testNoteManagerPathTraversalProtection()

        print("All tests passed successfully!")
    }
}
