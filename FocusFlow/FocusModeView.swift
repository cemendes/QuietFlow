import SwiftUI
import Combine

struct FocusModeView: View {
    let taskTitle: String
    let taskId: String
    let taskDetails: String?
    let taskDuration: Int
    @Binding var isPresented: Bool

    
    @State private var timeRemaining = 25 * 60
    @State private var isRunning = false
    @State private var showingCompletionAlert = false
    @State private var accumulatedTime = 0
    @State private var isBreak = false
    
    @Environment(TasksManager.self) var tasksManager: TasksManager
    
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ZStack {
            LinearGradient(gradient: Gradient(colors: [Color(hex: "#121212"), Color(hex: "#1A1A1A")]), startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            
            Circle()
                .fill(Color.googleBlue.opacity(0.15))
                .frame(width: 300, height: 300)
                .blur(radius: 50)
            
            VStack(spacing: 40) {
                VStack(spacing: 12) {
                    Text("CURRENT FOCUS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color.googleBlue.opacity(0.8))
                        .tracking(2)
                    
                    Text(taskTitle)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    if let details = taskDetails, !details.isEmpty {
                        Text(details)
                            .font(.system(size: 13))
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .padding(.top, 4)
                    }
                    
                    Text("Goal: \(taskDuration) mins | Focused: \(accumulatedTime / 60) mins")

                        .font(.system(size: 11))
                        .foregroundColor(.textSecondary)
                        .padding(.top, 4)
                }
                .padding(.top, 60)
                
                Spacer()
                
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .stroke(Color.white.opacity(0.1), lineWidth: 4)
                            .frame(width: 220, height: 220)
                        
                        Circle()
                            .trim(from: 0, to: CGFloat(timeRemaining) / CGFloat(isBreak ? 5 * 60 : 25 * 60))
                            .stroke(isBreak ? Color.successGreen : Color.googleBlue, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                            .frame(width: 220, height: 220)
                            .rotationEffect(.degrees(-90))
                            .animation(.easeInOut, value: timeRemaining)
                        
                        VStack(spacing: 8) {
                            Text(timeString(timeRemaining))
                                .font(.system(size: 60, weight: .thin, design: .default))
                                .foregroundColor(.white)
                                .shadow(color: (isBreak ? Color.successGreen : Color.googleBlue).opacity(0.5), radius: 15, x: 0, y: 0)
                            
                            Text(isBreak ? "ON BREAK" : (isRunning ? "IN SESSION" : "PAUSED"))
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(isBreak ? .successGreen : .textSecondary)
                                .tracking(1)
                        }
                    }
                }
                
                Spacer()

                
                HStack(spacing: 20) {
                    Button(action: { isRunning.toggle() }) {
                        Text(isRunning ? "Pause" : "Resume")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 100, height: 40)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: {
                        isRunning = false
                        isPresented = false
                    }) {
                        Text("Stop")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 100, height: 40)
                            .background(Color(hex: "#EA4335").opacity(0.8))
                            .cornerRadius(20)
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: { timeRemaining += 5 * 60 }) {
                        Text("+ 5 Min")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 100, height: 40)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.bottom, 60)
            }
        }
        .onReceive(timer) { _ in
            if isRunning && timeRemaining > 0 {
                timeRemaining -= 1
                
                if timeRemaining == 0 {
                    isRunning = false
                    NSSound(named: "Glass")?.play()
                    
                    if !isBreak {
                        accumulatedTime += 25 * 60
                        
                        if accumulatedTime >= taskDuration * 60 {
                            showingCompletionAlert = true
                        } else {
                            // Start break
                            isBreak = true
                            timeRemaining = 5 * 60
                            isRunning = true
                        }
                    } else {
                        // Break ended, start next focus session
                        isBreak = false
                        timeRemaining = 25 * 60
                        isRunning = true
                    }
                }
            }
        }
        .onAppear {
            isRunning = true
        }
        // ROLLED BACK: Options now match PRD exactly!
        .alert("Focus Session Ended", isPresented: $showingCompletionAlert) {
            Button("Mark Done") {
                tasksManager.deleteTask(id: taskId)
                isPresented = false
            }
            Button("Need More Time") {
                accumulatedTime = 0 // Reset accumulated time
                timeRemaining = 25 * 60
                isRunning = true
            }
            Button("Defer", role: .cancel) {
                isPresented = false
            }
        } message: {
            Text("You have reached your focus goal for this task. What would you like to do?")
        }
    }
    
    func timeString(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }
}
