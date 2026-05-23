import Foundation

// RSVP response for calendar invites
enum RSVPStatus: String, Codable, Hashable {
    case accepted  // user said Yes — fully busy
    case maybe     // user said Maybe — slot is soft-available
    case declined  // user said No   — slot is free
    case unknown   // own event or no response yet
}

struct CalendarEvent: Identifiable, Codable, Hashable {
    var id: String = UUID().uuidString
    let title: String
    let startHour: Int
    let startMinute: Int
    let endHour: Int
    let endMinute: Int
    let isAllDay: Bool
    let taskId: String?
    let isTentative: Bool
    let calendarId: String
    let isCompleted: Bool
    let dayOffset: Int
    var rsvpStatus: RSVPStatus = .unknown

    var displayColumn: Int = 0
    var totalColumns: Int = 1

    /// True when this slot is effectively available (maybe or declined invite)
    var isAvailableSlot: Bool {
        rsvpStatus == .maybe || rsvpStatus == .declined
    }

    func calculateHeight() -> CGFloat {
        let startMins = startHour * 60 + startMinute
        let endMins = endHour * 60 + endMinute
        let duration = endMins - startMins
        return CGFloat(duration) * 2.0
    }
}
