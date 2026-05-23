import SwiftUI

@main
struct FocusFlowApp: App {
    @State private var tasksManager = TasksManager()
    @State private var projectManager = ProjectManager()
    
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        // Main Window
        Window("Daily Planner", id: "planner") {
            ContentView()
                .environment(tasksManager)
                .environment(projectManager)
                .onAppear { projectManager.bootstrap() }
                .onOpenURL { url in
                    if url.scheme == "focusflow" && url.host == "ritual" {
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
                    tasksManager.triggerShutdownRitual()
                    NSApp.activate(ignoringOtherApps: true)
                    openWindow(id: "planner")
                }
                .keyboardShortcut("E", modifiers: [.command, .shift])
            }
            CommandGroup(replacing: .help) {
                Button("About FocusFlow") {
                    openWindow(id: "about")
                }
            }
        }
        
        // Custom About Panel Scene
        Window("About FocusFlow", id: "about") {
            AboutView()
        }
        .windowResizability(.contentSize)
        
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
                tasksManager.triggerShutdownRitual()
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
        .environment(tasksManager)
        .environment(projectManager)

    }
}

// MARK: - About View
struct AboutView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "bolt.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.googleBlue, .gchatBlue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: .googleBlue.opacity(0.3), radius: 8, x: 0, y: 4)

            VStack(spacing: 4) {
                Text("FocusFlow")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.textPrimary)
                
                Text("Builder Version 1.2.0")
                    .font(.system(size: 12))
                    .foregroundStyle(.textSecondary)
            }

            Divider()
                .padding(.horizontal, 40)

            VStack(spacing: 10) {
                Text("FocusFlow is an autonomous daily planner designed to seamlessly sync your tasks across Gmail, GChat, and Chrome, helping you design and achieve your perfect focus days.")
                    .font(.system(size: 11))
                    .foregroundStyle(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                
                Link(destination: URL(string: "https://github.com/cemendes/FocusFlow")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.right.circle.fill")
                        Text("View GitHub Repository")
                    }
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 14)
                    .background(Color.googleBlue)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .padding(.top, 8)
            }
        }
        .frame(width: 320, height: 280)
        .padding()
        .background(Color.surfaceBackground)
    }
}
