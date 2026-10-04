import SwiftUI

/// Design tokens matching the web app's color palette and typography.
enum DesignTokens {

    // MARK: - Colors

    /// Primary accent — warm amber/gold
    static let accent = Color("Accent", bundle: nil)
    static let accentLight = Color(hex: "#c9a84c")
    static let accentDark = Color(hex: "#d4a849")

    /// Backgrounds
    static let backgroundLight = Color(hex: "#f5f0eb")
    static let backgroundDark = Color(hex: "#0d1117")

    /// Surface (cards, sheets)
    static let surfaceLight = Color(hex: "#ffffff")
    static let surfaceDark = Color(hex: "#161b22")

    /// Paper tones
    static let paperCream = Color(hex: "#faf5e8")
    static let paperCreamDark = Color(hex: "#2a2520")
    static let paperWhite = Color(hex: "#ffffff")
    static let paperWhiteDark = Color(hex: "#1e1e1e")

    /// Text
    static let textPrimaryLight = Color(hex: "#1a1a1a")
    static let textPrimaryDark = Color(hex: "#e6e1d8")
    static let textSecondaryLight = Color(hex: "#6b6b6b")
    static let textSecondaryDark = Color(hex: "#8b8b8b")

    /// Borders
    static let borderLight = Color(hex: "#e0d8cc")
    static let borderDark = Color(hex: "#30363d")

    // MARK: - Typography Sizes

    static let fontSizeAppTitle: CGFloat = 34
    static let fontSizeSectionHeader: CGFloat = 22
    static let fontSizeNotebookTitle: CGFloat = 17
    static let fontSizeBody: CGFloat = 16
    static let fontSizePageContent: CGFloat = 15
    static let fontSizeCaption: CGFloat = 13
    static let fontSizeBadge: CGFloat = 11

    // MARK: - Spacing

    static let spacingXS: CGFloat = 4
    static let spacingSM: CGFloat = 8
    static let spacingMD: CGFloat = 12
    static let spacingLG: CGFloat = 16
    static let spacingXL: CGFloat = 24
    static let spacingXXL: CGFloat = 32

    // MARK: - Radius

    static let radiusSM: CGFloat = 8
    static let radiusMD: CGFloat = 12
    static let radiusLG: CGFloat = 16
    static let radiusXL: CGFloat = 20

    // MARK: - Animation

    static let animationFast: Double = 0.2
    static let animationNormal: Double = 0.3
    static let animationSlow: Double = 0.5
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: // RGB
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
