import SwiftUI
import UniformTypeIdentifiers

struct InboxDropDelegate: DropDelegate {
    let tasksManager: TasksManager

    func dropUpdated(info: DropInfo) -> DropProposal? {
        DropProposal(operation: .move)
    }

    func performDrop(info: DropInfo) -> Bool {
        // EventPill and TaskRow both emit NSString → public.plain-text
        // Try the strongly-typed path first (most reliable on macOS 13+)
        let providers = info.itemProviders(for: [.plainText, .text])
        guard let provider = providers.first else { return false }

        if provider.canLoadObject(ofClass: NSString.self) {
            _ = provider.loadObject(ofClass: NSString.self) { item, _ in
                guard let taskId = item as? String, !taskId.isEmpty else { return }
                Task { @MainActor in
                    tasksManager.unscheduleTask(id: taskId)
                }
            }
            return true
        }

        // Legacy fallback
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
            var taskId: String?
            if let data = item as? Data    { taskId = String(data: data, encoding: .utf8) }
            else if let s = item as? String { taskId = s }
            if let id = taskId, !id.isEmpty {
                Task { @MainActor in
                    tasksManager.unscheduleTask(id: id)
                }
            }
        }
        return true
    }
}
