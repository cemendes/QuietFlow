import Foundation

public struct FFLogger {
    private static let logQueue = DispatchQueue(label: "com.focusflow.logger", qos: .utility)
    
    private static var logURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("My Drive/focusflow_debug.log")
    }
    
    public static func log(_ message: String) {
        // Print to standard console
        print(message)
        
        // Append to file asynchronously on our serial queue for thread-safety and UI performance
        logQueue.async {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            let timestamp = formatter.string(from: Date())
            let line = "[\(timestamp)] \(message)\n"
            
            do {
                // Ensure parent directory exists (just in case)
                let parentDir = logURL.deletingLastPathComponent()
                if !FileManager.default.fileExists(atPath: parentDir.path) {
                    try FileManager.default.createDirectory(at: parentDir, withIntermediateDirectories: true, attributes: nil)
                }
                
                // Create file if it doesn't exist
                if !FileManager.default.fileExists(atPath: logURL.path) {
                    try "".write(to: logURL, atomically: true, encoding: .utf8)
                }
                
                if let fileHandle = try? FileHandle(forWritingTo: logURL) {
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
