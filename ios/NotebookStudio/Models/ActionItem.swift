import Foundation

/// A single action item in a Work & Project Log page checklist.
///
/// Reference: `src/state/store.js` lines 109-113.
struct ActionItem: Codable, Equatable, Identifiable {
    var checked: Bool
    var text: String

    /// Synthesized ID from text hash for SwiftUI list rendering.
    var id: String { "\(text.hashValue)-\(checked)" }

    init(checked: Bool = false, text: String = "") {
        self.checked = checked
        self.text = text
    }
}

/// Work status badge values for the Work & Project Log template.
///
/// Reference: web app uses "TODO", "WIP", "DONE" strings.
enum WorkStatus: String, Codable, CaseIterable {
    case todo = "TODO"
    case wip = "WIP"
    case done = "DONE"

    /// Display label with emoji.
    var label: String {
        switch self {
        case .todo: return "📋 TODO"
        case .wip:  return "🟡 WIP"
        case .done: return "✅ DONE"
        }
    }

    /// Color name for the status badge.
    var colorName: String {
        switch self {
        case .todo: return "gray"
        case .wip:  return "orange"
        case .done: return "green"
        }
    }
}
