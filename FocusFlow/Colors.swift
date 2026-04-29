import SwiftUI

// MARK: - Color Extensions
extension Color {
    // Backgrounds
    static let surfaceBackground  = Color(hex: "#FFFFFF")
    static let secondarySurface   = Color(hex: "#F8F9FA")
    static let sidebarBackground  = Color(hex: "#F7F7F5")

    // Borders
    static let borderGray         = Color(hex: "#DADCE0")

    // Brand
    static let googleBlue         = Color(hex: "#4285F4")
    static let successGreen       = Color(hex: "#34A853")

    // Text
    static let textPrimary        = Color(hex: "#202124")
    static let textSecondary      = Color(hex: "#5F6368")
    static let textTertiary       = Color(hex: "#80868B")

    // Source brand colors
    static let gmailRed           = Color(hex: "#EA4335")
    static let gchatBlue          = Color(hex: "#1967D2")
    static let chromeGreen        = Color(hex: "#34A853")
    static let manualGray         = Color(hex: "#9AA0A6")

    // Status
    static let staleAmber         = Color(hex: "#F9AB00")
    static let priorityHigh       = Color(hex: "#EA4335")
    static let priorityMedium     = Color(hex: "#FBBC04")
    static let priorityLow        = Color(hex: "#34A853")

    // Selection states
    static let selectedRowBg      = Color(hex: "#EEF2FF")
    static let selectedSidebarBg  = Color(hex: "#E8F0FE")

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:  (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:  (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:  (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB,
                  red: Double(r) / 255,
                  green: Double(g) / 255,
                  blue: Double(b) / 255,
                  opacity: Double(a) / 255)
    }
}
// MARK: - ShapeStyle convenience (enables .foregroundStyle(.textPrimary) dot syntax)
extension ShapeStyle where Self == Color {
    static var surfaceBackground: Color  { .init(hex: "#FFFFFF") }
    static var secondarySurface: Color   { .init(hex: "#F8F9FA") }
    static var sidebarBackground: Color  { .init(hex: "#F7F7F5") }
    static var borderGray: Color         { .init(hex: "#DADCE0") }
    static var googleBlue: Color         { .init(hex: "#4285F4") }
    static var successGreen: Color       { .init(hex: "#34A853") }
    static var textPrimary: Color        { .init(hex: "#202124") }
    static var textSecondary: Color      { .init(hex: "#5F6368") }
    static var textTertiary: Color       { .init(hex: "#80868B") }
    static var gmailRed: Color           { .init(hex: "#EA4335") }
    static var gchatBlue: Color          { .init(hex: "#1967D2") }
    static var chromeGreen: Color        { .init(hex: "#34A853") }
    static var manualGray: Color         { .init(hex: "#9AA0A6") }
    static var staleAmber: Color         { .init(hex: "#F9AB00") }
    static var selectedRowBg: Color      { .init(hex: "#EEF2FF") }
    static var selectedSidebarBg: Color  { .init(hex: "#E8F0FE") }
}
