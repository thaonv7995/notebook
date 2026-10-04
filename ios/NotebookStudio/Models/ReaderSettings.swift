import SwiftUI

/// Available paper tone backgrounds for reader.
enum PaperTone: String, CaseIterable, Identifiable, Codable {
    case cream = "cream"
    case white = "white"
    case sepia = "sepia"
    case dark = "dark"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .cream: return "Kem ấm"
        case .white: return "Trắng"
        case .sepia: return "Sepia"
        case .dark:  return "Tối"
        }
    }

    /// Primary background color of the page.
    var backgroundColor: Color {
        switch self {
        case .cream: return Color(hex: "#FAF6ED")
        case .white: return Color.white
        case .sepia: return Color(hex: "#F4ECD8")
        case .dark:  return Color(hex: "#1E1E1E")
        }
    }

    /// Primary reading text color.
    var textColor: Color {
        switch self {
        case .cream: return Color(hex: "#2C2621")
        case .white: return Color(hex: "#1F2937")
        case .sepia: return Color(hex: "#3D312A")
        case .dark:  return Color(hex: "#E5E7EB")
        }
    }

    /// Secondary/label color (ruled lines, subtitles, badges).
    var secondaryColor: Color {
        switch self {
        case .cream: return Color(hex: "#8C827A")
        case .white: return Color(hex: "#6B7280")
        case .sepia: return Color(hex: "#8B7355")
        case .dark:  return Color(hex: "#9CA3AF")
        }
    }

    /// Ruled lines / grid / border tint color.
    var lineColor: Color {
        switch self {
        case .cream: return Color(hex: "#E5DDD0")
        case .white: return Color(hex: "#E5E7EB")
        case .sepia: return Color(hex: "#E2D3BE")
        case .dark:  return Color(hex: "#374151")
        }
    }
}

/// Font family options for reader view.
enum ReaderFontFamily: String, CaseIterable, Identifiable, Codable {
    case plusJakartaSans = "jakarta"
    case serif = "serif"
    case monospace = "mono"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .plusJakartaSans: return "Plus Jakarta"
        case .serif:           return "Serif"
        case .monospace:       return "Monospace"
        }
    }

    func font(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch self {
        case .plusJakartaSans:
            return .jakartaSans(size: size, weight: weight)
        case .serif:
            return .system(size: size, weight: weight, design: .serif)
        case .monospace:
            return .system(size: size, weight: weight, design: .monospaced)
        }
    }
}

/// User configurable reader settings (paper tone, font family, font size, line spacing).
@MainActor
final class ReaderSettings: ObservableObject {
    static let shared = ReaderSettings()

    @AppStorage("reader_paper_tone") var paperToneRaw: String = PaperTone.cream.rawValue
    @AppStorage("reader_font_family") var fontFamilyRaw: String = ReaderFontFamily.plusJakartaSans.rawValue
    @AppStorage("reader_font_size") var fontSize: Double = 16.0
    @AppStorage("reader_line_spacing") var lineSpacing: Double = 6.0

    var paperTone: PaperTone {
        get { PaperTone(rawValue: paperToneRaw) ?? .cream }
        set { paperToneRaw = newValue.rawValue; objectWillChange.send() }
    }

    var fontFamily: ReaderFontFamily {
        get { ReaderFontFamily(rawValue: fontFamilyRaw) ?? .plusJakartaSans }
        set { fontFamilyRaw = newValue.rawValue; objectWillChange.send() }
    }
}
