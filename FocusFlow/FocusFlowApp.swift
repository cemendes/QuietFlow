import SwiftUI

@main
struct FocusFlowApp: App {
    @State private var authManager = AuthManager()
    @State private var tasksManager = TasksManager()
    @State private var projectManager = ProjectManager()
    
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        // Main Window
        Window("Daily Planner", id: "planner") {
            ContentView()
                .environment(authManager)
                .environment(tasksManager)
                .environment(projectManager)
                .onAppear { projectManager.bootstrap() }
                .onOpenURL { url in
                    if url.scheme == "focusflow" && url.host == "cookies" {
                        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                           let queryItems = components.queryItems,
                           let cookies = queryItems.first(where: { $0.name == "value" })?.value {
                            tasksManager.cookieString = cookies
                            print("Cookies updated from URL scheme!")
                        }
                    } else if url.scheme == "focusflow" && url.host == "ritual" {
                        tasksManager.isMorningRitualComplete = false
                        print("Morning Ritual manually triggered from URL scheme!")
                    }
                }
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unifiedCompact)
        .windowResizability(.contentMinSize)
        .commands {
            CommandMenu("Rituals") {
                Button("Start Morning Ritual") {
                    tasksManager.isMorningRitualComplete = false
                    NSApp.activate(ignoringOtherApps: true)
                    openWindow(id: "planner")
                }
                .keyboardShortcut("R", modifiers: [.command, .shift])

                Button("Start Daily Shutdown") {
                    tasksManager.isShutdownRitualNeeded = true
                    NSApp.activate(ignoringOtherApps: true)
                    openWindow(id: "planner")
                }
                .keyboardShortcut("E", modifiers: [.command, .shift])
            }
        }
        
        // Menu Bar Extra
        MenuBarExtra("FocusFlow", systemImage: "bolt.fill") {
            Button("Open Planner") {
                NSApp.activate(ignoringOtherApps: true)
                openWindow(id: "planner")
            }
            .keyboardShortcut("O")
            
            Button("Start Morning Ritual") {
                tasksManager.isMorningRitualComplete = false
                NSApp.activate(ignoringOtherApps: true)
                openWindow(id: "planner")
            }
            .keyboardShortcut("R")

            Button("Daily Shutdown") {
                tasksManager.isShutdownRitualNeeded = true
                NSApp.activate(ignoringOtherApps: true)
                openWindow(id: "planner")
            }
            .keyboardShortcut("E")
            
            Divider()
            
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .keyboardShortcut("Q")
        }
        .environment(authManager)
        .environment(tasksManager)
        .environment(projectManager)

    }
}
