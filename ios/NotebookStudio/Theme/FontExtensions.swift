import SwiftUI

/// Custom font helper for Plus Jakarta Sans (variable weight font).
///
/// Usage:
///   Text("Hello").font(.jakartaSans(size: 16, weight: .regular))
///   Text("Bold").font(.jakartaSans(size: 16, weight: .bold))
extension Font {

    /// Plus Jakarta Sans with specified size and weight.
    static func jakartaSans(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        // Variable font file: PlusJakartaSans[wght].ttf
        // Maps SwiftUI Font.Weight → font name registered by iOS
        let name: String
        switch weight {
        case .ultraLight, .thin:
            name = "PlusJakartaSans-ExtraLight"
        case .light:
            name = "PlusJakartaSans-Light"
        case .regular:
            name = "PlusJakartaSans-Regular"
        case .medium:
            name = "PlusJakartaSans-Medium"
        case .semibold:
            name = "PlusJakartaSans-SemiBold"
        case .bold:
            name = "PlusJakartaSans-Bold"
        case .heavy, .black:
            name = "PlusJakartaSans-ExtraBold"
        default:
            name = "PlusJakartaSans-Regular"
        }
        return .custom(name, size: size)
    }

    /// Plus Jakarta Sans Italic with specified size and weight.
    static func jakartaSansItalic(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .ultraLight, .thin:
            name = "PlusJakartaSans-ExtraLightItalic"
        case .light:
            name = "PlusJakartaSans-LightItalic"
        case .regular:
            name = "PlusJakartaSans-Italic"
        case .medium:
            name = "PlusJakartaSans-MediumItalic"
        case .semibold:
            name = "PlusJakartaSans-SemiBoldItalic"
        case .bold:
            name = "PlusJakartaSans-BoldItalic"
        case .heavy, .black:
            name = "PlusJakartaSans-ExtraBoldItalic"
        default:
            name = "PlusJakartaSans-Italic"
        }
        return .custom(name, size: size)
    }
}

// MARK: - Debug: List all registered fonts (call once during development)

#if DEBUG
func printAllFonts() {
    for family in UIFont.familyNames.sorted() {
        print("Family: \(family)")
        for name in UIFont.fontNames(forFamilyName: family) {
            print("  → \(name)")
        }
    }
}
#endif
