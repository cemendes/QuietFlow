import SwiftUI
import UniformTypeIdentifiers

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
        .onDrop(of: [.plainText, .text], isTargeted: $isTargeted) { providers in
            // Accept the first provider that can give us a string (task id)
            guard let provider = providers.first else { return false }

            // NSString → public.plain-text — try loadObject first (most reliable)
            if provider.canLoadObject(ofClass: NSString.self) {
                provider.loadObject(ofClass: NSString.self) { item, _ in
                    guard let taskId = item as? String, !taskId.isEmpty else { return }
                    Task { @MainActor in
                        tasksManager.scheduleTask(id: taskId, hour: hour,
                                                  minute: minute, dayOffset: dayOffset)
                    }
                }
                return true
            }

            // Fallback: legacy loadItem path
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                var taskId: String?
                if let data = item as? Data  { taskId = String(data: data, encoding: .utf8) }
                else if let s = item as? String { taskId = s }
                if let id = taskId, !id.isEmpty {
                    Task { @MainActor in
                        tasksManager.scheduleTask(id: id, hour: hour,
                                                  minute: minute, dayOffset: dayOffset)
                    }
                }
            }
            return true
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
