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
        FFLogger.log("[Drop] InboxDropDelegate performDrop entered. Providers count: \(providers.count)")
        guard let provider = providers.first else {
            FFLogger.log("[Drop] InboxDropDelegate performDrop failed: no providers")
            return false
        }

        if provider.canLoadObject(ofClass: NSString.self) {
            FFLogger.log("[Drop] InboxDropDelegate loading NSString...")
            _ = provider.loadObject(ofClass: NSString.self) { item, error in
                if let error = error {
                    FFLogger.log("[Drop] InboxDropDelegate failed to load NSString: \(error)")
                }
                guard let taskId = item as? String, !taskId.isEmpty else {
                    FFLogger.log("[Drop] InboxDropDelegate loaded taskId is nil or empty")
                    return
                }
                FFLogger.log("[Drop] InboxDropDelegate loaded taskId: \(taskId). Calling unscheduleTask...")
                Task { @MainActor in
                    tasksManager.unscheduleTask(id: taskId)
                }
            }
            return true
        }

        // Legacy fallback
        FFLogger.log("[Drop] InboxDropDelegate loading plain text item (fallback)...")
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, error in
            if let error = error {
                FFLogger.log("[Drop] InboxDropDelegate fallback failed to load: \(error)")
            }
            var taskId: String?
            if let data = item as? Data    { taskId = String(data: data, encoding: .utf8) }
            else if let s = item as? String { taskId = s }
            if let id = taskId, !id.isEmpty {
                FFLogger.log("[Drop] InboxDropDelegate fallback loaded taskId: \(id). Calling unscheduleTask...")
                Task { @MainActor in
                    tasksManager.unscheduleTask(id: id)
                }
            } else {
                FFLogger.log("[Drop] InboxDropDelegate fallback loaded taskId is nil or empty")
            }
        }
        return true
    }
}
