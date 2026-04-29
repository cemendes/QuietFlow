import SwiftUI

struct TaskDropDelegate: DropDelegate {
    let item: TaskItem
    @Binding var tasks: [TaskItem]
    @Binding var draggedItem: TaskItem?
    let onReorder: ([TaskItem]) -> Void
    
    func performDrop(info: DropInfo) -> Bool {
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
