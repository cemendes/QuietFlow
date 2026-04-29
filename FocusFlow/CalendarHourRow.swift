import SwiftUI

/// A single hour row in the Step 2 calendar sidebar.
/// Owns its own @State for drop-target highlight (required — can't use @State
/// inside a @ViewBuilder function). FocusFlow event blocks are draggable so
/// users can move a scheduled task to a different time slot.
struct CalendarHourRow: View {
    let hour: Int
    let events: [CalendarEvent]
    let onDrop: (String) -> Void

    @State private var isDropTargeted = false

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            Text(String(format: "%d:00", hour))
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.textSecondary.opacity(0.6))
                .frame(width: 32, alignment: .trailing)

            ZStack(alignment: .top) {
                // Drop-target highlight line
                Rectangle()
                    .fill(isDropTargeted ? Color.googleBlue.opacity(0.15) : Color.borderGray.opacity(0.3))
                    .frame(height: isDropTargeted ? 2 : 0.5)
                    .frame(maxWidth: .infinity)
                    .animation(.easeInOut(duration: 0.12), value: isDropTargeted)

                if !events.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(events) { event in
                            let isFF = event.taskId != nil
                            let taskId = event.taskId ?? event.id
                            let label  = event.title.replacingOccurrences(of: "[FocusFlow] ", with: "")

                            Text(label)
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 3)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(isFF ? Color.googleBlue : Color(hex: "#5C6BC0"))
                                .clipShape(.rect(cornerRadius: 4))
                                // FocusFlow events are draggable to a new slot.
                                // The preview is a compact pill so it doesn't look
                                // like the full-width calendar block while dragging.
                                .onDrag({
                                    NSItemProvider(object: taskId as NSString)
                                }, preview: {
                                    // Compact pill — looks like a small task chip
                                    HStack(spacing: 4) {
                                        Image(systemName: "clock")
                                            .font(.system(size: 9))
                                        Text(label)
                                            .font(.system(size: 11, weight: .semibold))
                                            .lineLimit(1)
                                    }
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color.googleBlue)
                                    .clipShape(.rect(cornerRadius: 6))
                                    .frame(maxWidth: 160)
                                })
                        }
                    }
                    .padding(.top, 1)
                }
            }
        }
        .frame(height: 34)
        .padding(.horizontal, 10)
        .contentShape(Rectangle())
        .onDrop(of: ["public.plain-text"], isTargeted: $isDropTargeted) { providers in
            providers.first?.loadObject(ofClass: NSString.self) { item, _ in
                if let taskId = item as? String {
                    DispatchQueue.main.async { onDrop(taskId) }
                }
            }
            return true
        }
    }
}
