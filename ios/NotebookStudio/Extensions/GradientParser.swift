import SwiftUI

/// Parses CSS `linear-gradient(...)` strings into SwiftUI LinearGradient.
///
/// Handles the format used in web app's `coverGradient` field:
/// `linear-gradient(135deg, #1e3a8a, #0f172a)`
enum GradientParser {

    /// Parse a CSS linear-gradient string into SwiftUI gradient components.
    /// Returns nil if the format is unrecognized.
    static func parse(_ css: String) -> (colors: [Color], startPoint: UnitPoint, endPoint: UnitPoint)? {
        // Extract content inside linear-gradient(...)
        guard let match = css.range(of: #"linear-gradient\((.+)\)"#, options: .regularExpression) else {
            return nil
        }

        let inner = String(css[match])
            .replacingOccurrences(of: "linear-gradient(", with: "")
            .dropLast() // remove trailing ")"

        let parts = String(inner)
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }

        guard parts.count >= 3 else { return nil }

        // Parse angle
        let (start, end) = parseAngle(parts[0])

        // Parse colors
        let colors = parts[1...].compactMap { parseColor(String($0)) }
        guard colors.count >= 2 else { return nil }

        return (colors, start, end)
    }

    /// Build a SwiftUI LinearGradient from a CSS string.
    /// Falls back to a default dark gradient if parsing fails.
    static func gradient(from css: String) -> LinearGradient {
        if let parsed = parse(css) {
            return LinearGradient(
                colors: parsed.colors,
                startPoint: parsed.startPoint,
                endPoint: parsed.endPoint
            )
        }
        // Default fallback
        return LinearGradient(
            colors: [Color(hex: "#1e3a8a"), Color(hex: "#0f172a")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Private

    private static func parseAngle(_ str: String) -> (UnitPoint, UnitPoint) {
        let cleaned = str.replacingOccurrences(of: "deg", with: "").trimmingCharacters(in: .whitespaces)
        let angle = Int(cleaned) ?? 135

        switch angle {
        case 0:    return (.bottom, .top)
        case 45:   return (.bottomLeading, .topTrailing)
        case 90:   return (.leading, .trailing)
        case 135:  return (.topLeading, .bottomTrailing)
        case 180:  return (.top, .bottom)
        case 225:  return (.topTrailing, .bottomLeading)
        case 270:  return (.trailing, .leading)
        case 315:  return (.bottomTrailing, .topLeading)
        default:   return (.topLeading, .bottomTrailing)
        }
    }

    private static func parseColor(_ str: String) -> Color? {
        let cleaned = str.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: " ", with: "")

        // Handle hex colors: #1e3a8a, #fff, etc.
        if cleaned.hasPrefix("#") {
            return Color(hex: cleaned)
        }

        // Named CSS colors (common ones)
        switch cleaned.lowercased() {
        case "black":   return .black
        case "white":   return .white
        case "red":     return .red
        case "blue":    return .blue
        case "green":   return .green
        case "orange":  return .orange
        case "purple":  return .purple
        case "pink":    return .pink
        case "yellow":  return .yellow
        default:        return nil
        }
    }
}
