import SwiftUI
import UniformTypeIdentifiers

struct TaskDropDelegate: DropDelegate {
    let item: TaskItem
    @Binding var tasks: [TaskItem]
    @Binding var draggedItem: TaskItem?
    let tasksManager: TasksManager
    let onReorder: ([TaskItem]) -> Void
    
    func performDrop(info: DropInfo) -> Bool {
        if draggedItem == nil {
            let providers = info.itemProviders(for: [.plainText, .text])
            if let provider = providers.first {
                if provider.canLoadObject(ofClass: NSString.self) {
                    _ = provider.loadObject(ofClass: NSString.self) { loadedItem, _ in
                        guard let taskId = loadedItem as? String, !taskId.isEmpty else { return }
                        Task { @MainActor in
                            tasksManager.unscheduleTask(id: taskId)
                        }
                    }
                } else {
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { loadedItem, _ in
                        var taskId: String?
                        if let data = loadedItem as? Data  { taskId = String(data: data, encoding: .utf8) }
                        else if let s = loadedItem as? String { taskId = s }
                        if let id = taskId, !id.isEmpty {
                            Task { @MainActor in
                                tasksManager.unscheduleTask(id: id)
                            }
                        }
                    }
                }
            }
        }
        draggedItem = nil
        return true
    }
    
    func dropEntered(info: DropInfo) {
        guard let draggedItem = draggedItem, draggedItem != item else { return }
        
        if let from = tasks.firstIndex(of: draggedItem),
           let to = tasks.firstIndex(of: item) {
            var newTasks = tasks
            newTasks.remove(at: from)
            newTasks.insert(draggedItem, at: to)
            onReorder(newTasks)
        }
    }
    
    func dropUpdated(info: DropInfo) -> DropProposal? {
        return DropProposal(operation: .move)
    }
}
