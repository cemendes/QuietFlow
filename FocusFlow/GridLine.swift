import SwiftUI

struct GridLine: View {
    let hour: Int
    let minute: Int
    /// Day offset from today (0 = today, 1 = tomorrow, etc.)
    var dayOffset: Int = 0

    @Environment(TasksManager.self) var tasksManager: TasksManager
    @State private var isTargeted = false

    private var isHourMark: Bool { minute == 0 }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            // Only show label on the hour
            Group {
                if isHourMark {
                    Text(String(format: "%d:%02d", hour, minute))
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(.textSecondary.opacity(0.6))
                        .frame(width: 38, alignment: .trailing)
                } else {
                    Color.clear.frame(width: 38)
                }
            }

            VStack(spacing: 0) {
                Rectangle()
                    .fill(isHourMark ? Color.borderGray.opacity(0.6) : Color.borderGray.opacity(0.2))
                    .frame(height: isHourMark ? 1 : 0.5)
                Spacer()
            }
        }
        .frame(height: 30)
        .contentShape(Rectangle())
        .dropDestination(for: String.self) { items, location in
            guard let taskId = items.first, !taskId.isEmpty else {
                FFLogger.log("[Drop] GridLine dropDestination: no valid taskId")
                return false
            }
            FFLogger.log("[Drop] GridLine accepted taskId: \(taskId) at hour:\(hour) minute:\(minute) dayOffset:\(dayOffset)")
            tasksManager.scheduleTask(id: taskId, hour: hour,
                                      minute: minute, dayOffset: dayOffset)
            return true
        } isTargeted: { targeted in
            isTargeted = targeted
            FFLogger.log("[Hover] GridLine targeted: hour:\(hour) minute:\(minute) dayOffset:\(dayOffset) → \(targeted)")
        }
        .background(isTargeted ? Color.googleBlue.opacity(0.08) : Color.clear)
        .overlay(
            Rectangle()
                .stroke(Color.googleBlue.opacity(0.6),
                        style: StrokeStyle(lineWidth: 1, dash: [4]))
                .opacity(isTargeted ? 1 : 0)
        )

    }
}
