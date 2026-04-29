import Foundation

@MainActor
class TasksManagerTests {
    var manager: TasksManager!
    
    func setUp() {
        UserDefaults.standard.removeObject(forKey: "userName")
        UserDefaults.standard.removeObject(forKey: "daysBack")
        UserDefaults.standard.removeObject(forKey: "cookieString")
        
        manager = TasksManager()
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
        assert(manager.cookieString == "", "Initial cookieString should be empty")
        print("testInit passed")
    }
    
    func testOptimisticSchedule() {
        setUp()
        let task = TaskItem(id: "1", title: "Test Task", details: nil, link: nil, duration: nil, priority: nil, category: nil, date: nil)
        manager.tasks = [task]
        
        manager.scheduleTask(id: "1", hour: 10, minute: 0)
        
        let scheduledEvent = manager.calendarEvents.first(where: { $0.taskId == "1" })
        assert(scheduledEvent != nil, "Scheduled event should be found in calendarEvents")
        assert(scheduledEvent?.startHour == 10, "Event should start at 10")
        print("testOptimisticSchedule passed")
    }
    
    func testOptimisticUnschedule() {
        setUp()
        let event = CalendarEvent(title: "Test Task", startHour: 10, startMinute: 0, endHour: 11, endMinute: 0, isAllDay: false, taskId: "1", isTentative: false, calendarId: "default", isCompleted: false, dayOffset: 0)
        manager.calendarEvents = [event]
        
        manager.unscheduleTask(id: "1")
        
        let scheduledEvent = manager.calendarEvents.first(where: { $0.taskId == "1" })
        assert(scheduledEvent == nil, "Scheduled event should NOT be found in calendarEvents")
        print("testOptimisticUnschedule passed")
    }
    
    func testCSVParsing() {
        setUp()
        
        let line1 = "1,Test Task,Details,http://link,needsAction"
        let columns1 = manager.parseCSVLine(line1)
        assert(columns1.count == 5, "Should have 5 columns")
        assert(columns1[1] == "Test Task", "Title should be 'Test Task'")
        
        let line2 = "2,\"Task with , comma\",Details,http://link,needsAction"
        let columns2 = manager.parseCSVLine(line2)
        assert(columns2.count == 5, "Should have 5 columns even with comma in quotes")
        assert(columns2[1] == "Task with , comma", "Title should be 'Task with , comma'")
        
        let line3 = "3,\"Task with \"\"quotes\"\"\",Details,http://link,needsAction"
        let columns3 = manager.parseCSVLine(line3)
        assert(columns3.count == 5, "Should have 5 columns")
        assert(columns3[1] == "Task with \"quotes\"", "Title should be 'Task with \"quotes\"'")
        
        print("testCSVParsing passed")
    }
}


@main
struct TestRunner {
    static func main() {
        let tests = TasksManagerTests()
        tests.testInit()
        tests.testCSVParsing()
        tests.testOptimisticSchedule()
        tests.testOptimisticUnschedule()

        // tests.testPerformance()
        print("All tests passed!")
    }
}
