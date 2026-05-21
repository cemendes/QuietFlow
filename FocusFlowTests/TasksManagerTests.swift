import Foundation

@MainActor
class TasksManagerTests {
    var manager: TasksManager!
    
    func setUp() {
        UserDefaults.standard.removeObject(forKey: "userName")
        UserDefaults.standard.removeObject(forKey: "daysBack")
        UserDefaults.standard.removeObject(forKey: "cookieString")
        
        manager = TasksManager()
        manager.bypassCalendarAccessCheck = true
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
    }
    
    func testOptimisticUnschedule() {
        setUp()
        let event = CalendarEvent(
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
    }
    
    func testJSONParsing() {
        setUp()
        
        let jsonStr = """
        [
            {
                "id": "1",
                "title": "[Privia] Test JSON Task",
                "project": "Privia",
                "details": "Test Details",
                "link": "https://mail.google.com/mail/u/0/#inbox/12345",
                "status": "needsAction",
                "duration": 45,
                "priority": "high",
                "category": "work",
                "date": "2026-05-21",
                "parentTaskId": null
            },
            {
                "id": "2",
                "title": "Manual Task without project",
                "details": null,
                "link": null,
                "status": "completed",
                "duration": 30,
                "priority": "low",
                "category": null,
                "date": "2026-05-20"
            }
        ]
        """
        
        guard let data = jsonStr.data(using: .utf8) else {
            assert(false, "Failed to create data from JSON string")
            return
        }
        
        do {
            let decodedTasks = try JSONDecoder().decode([TaskItem].self, from: data)
            assert(decodedTasks.count == 2, "Should have decoded 2 tasks")
            
            let task1 = decodedTasks[0]
            assert(task1.id == "1", "Task 1 id should be '1'")
            assert(task1.resolvedProject == "Privia", "Task 1 resolved project should be 'Privia'")
            assert(task1.cleanTitle == "Test JSON Task", "Task 1 clean title should be 'Test JSON Task'")
            assert(task1.source == .gmail, "Task 1 source should be Gmail")
            assert(task1.duration == 45, "Task 1 duration should be 45")
            assert(task1.priority == "high", "Task 1 priority should be high")
            
            let task2 = decodedTasks[1]
            assert(task2.id == "2", "Task 2 id should be '2'")
            assert(task2.resolvedProject == nil, "Task 2 resolved project should be nil")
            assert(task2.cleanTitle == "Manual Task without project", "Task 2 clean title should be correct")
            assert(task2.source == .manual, "Task 2 source should be manual")
            assert(task2.duration == 30, "Task 2 duration should be 30")
            assert(task2.priority == "low", "Task 2 priority should be low")
            
            print("testJSONParsing passed")
        } catch {
            assert(false, "Failed to decode JSON: \(error)")
        }
    }
    
    func testDayOffsetCalculation() {
        setUp()
        let calendar = Calendar.current
        let today = Date()
        let startOfDay = calendar.startOfDay(for: today)
        
        // 1. Create a date that is 2 days in the past at 10:45 AM
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: startOfDay)!
        var components = calendar.dateComponents([.year, .month, .day], from: twoDaysAgo)
        components.hour = 10
        components.minute = 45
        components.second = 0
        let eventDatePast = calendar.date(from: components)!
        
        // 2. Create a date that is 1 day in the future at 9:30 AM
        let oneDayHence = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        var componentsFuture = calendar.dateComponents([.year, .month, .day], from: oneDayHence)
        componentsFuture.hour = 9
        componentsFuture.minute = 30
        componentsFuture.second = 0
        let eventDateFuture = calendar.date(from: componentsFuture)!
        
        // 3. Compute dayOffset using our new startOfDay logic
        let offsetPast = calendar.dateComponents([.day], from: startOfDay, to: calendar.startOfDay(for: eventDatePast)).day ?? 0
        let offsetFuture = calendar.dateComponents([.day], from: startOfDay, to: calendar.startOfDay(for: eventDateFuture)).day ?? 0
        
        assert(offsetPast == -2, "Past offset should be exactly -2, got \(offsetPast)")
        assert(offsetFuture == 1, "Future offset should be exactly 1, got \(offsetFuture)")
        
        print("testDayOffsetCalculation passed")
    }
}


@main
struct TestRunner {
    static func main() {
        let tests = TasksManagerTests()
        tests.testInit()
        tests.testJSONParsing()
        tests.testOptimisticSchedule()
        tests.testOptimisticUnschedule()
        tests.testDayOffsetCalculation()

        // tests.testPerformance()
        print("All tests passed!")
    }
}
