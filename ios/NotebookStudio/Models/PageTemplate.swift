import Foundation

/// All 10 notebook page templates supported by the web app.
///
/// Reference: `src/templates/index.js` VALID_TEMPLATES array.
enum PageTemplate: String, Codable, CaseIterable, Identifiable {
    case cornell
    case work
    case ruled
    case vocab
    case charting
    case reading
    case dotgrid
    case grid
    case blank
    case quadrant  // Eisenhower Priority Matrix

    var id: String { rawValue }

    /// Human-readable display name.
    var displayName: String {
        switch self {
        case .cornell:   return "Cornell Notes"
        case .work:      return "Work & Project Log"
        case .ruled:     return "Ruled Notebook"
        case .vocab:     return "Vocabulary"
        case .charting:  return "Charting / Comparison"
        case .reading:   return "Reading Notes"
        case .dotgrid:   return "Dot Grid"
        case .grid:      return "Square Grid"
        case .blank:     return "Blank / Freeform"
        case .quadrant:  return "Eisenhower Matrix"
        }
    }

    /// SF Symbol icon name for each template.
    var iconName: String {
        switch self {
        case .cornell:   return "rectangle.split.2x1"
        case .work:      return "checklist"
        case .ruled:     return "line.3.horizontal"
        case .vocab:     return "character.book.closed"
        case .charting:  return "chart.bar.xaxis"
        case .reading:   return "book"
        case .dotgrid:   return "circle.grid.3x3"
        case .grid:      return "square.grid.3x3"
        case .blank:     return "doc"
        case .quadrant:  return "square.split.2x2"
        }
    }
}
