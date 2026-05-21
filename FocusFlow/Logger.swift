import Foundation

/// Thread-safe file logger. Uses a serial DispatchQueue for writes.
/// Declared as a caseless enum so it never acquires @MainActor inference.
public enum FFLogger {
    private nonisolated(unsafe) static let logQueue = DispatchQueue(label: "com.focusflow.logger", qos: .utility)

    private static var logURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("My Drive/focusflow_debug.log")
    }

    /// Safe to call from any actor or `Task.detached` context.
    public nonisolated static func log(_ message: String) {
        // Print to standard console
        print(message)

        // Capture message value for the sendable closure
        let msg = message
        // Append to file asynchronously on our serial queue
        logQueue.async { @Sendable in
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            let timestamp = formatter.string(from: Date())
            let line = "[\(timestamp)] \(msg)\n"

            let url = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("My Drive/focusflow_debug.log")

            do {
                let parentDir = url.deletingLastPathComponent()
                if !FileManager.default.fileExists(atPath: parentDir.path) {
                    try FileManager.default.createDirectory(at: parentDir, withIntermediateDirectories: true, attributes: nil)
                }

                if !FileManager.default.fileExists(atPath: url.path) {
                    try "".write(to: url, atomically: true, encoding: .utf8)
                }

                if let fileHandle = try? FileHandle(forWritingTo: url) {
                    fileHandle.seekToEndOfFile()
                    if let data = line.data(using: .utf8) {
                        fileHandle.write(data)
                    }
                    fileHandle.closeFile()
                }
            } catch {
                print("FFLogger error writing to log: \(error)")
            }
        }
    }
}
