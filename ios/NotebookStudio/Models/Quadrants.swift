import Foundation

/// Eisenhower Priority Matrix data — 4 quadrants, each containing HTML content.
///
/// Reference: `src/templates/quadrant.js`, `src/state/store.js` lines 116-127.
/// - q1: Do First (urgent + important)
/// - q2: Schedule (not urgent + important)
/// - q3: Delegate (urgent + not important)
/// - q4: Eliminate (not urgent + not important)
struct Quadrants: Codable, Equatable {
    var q1: String
    var q2: String
    var q3: String
    var q4: String

    init(q1: String = "", q2: String = "", q3: String = "", q4: String = "") {
        self.q1 = q1
        self.q2 = q2
        self.q3 = q3
        self.q4 = q4
    }
}

/// Charting/Comparison template data — 3 columns plus optional analysis.
///
/// Reference: `src/templates/charting.js`.
/// Discovered in real data at `db.json` (field: `chartData`).
struct ChartData: Codable, Equatable {
    var col1: String
    var col2: String
    var col3: String

    init(col1: String = "", col2: String = "", col3: String = "") {
        self.col1 = col1
        self.col2 = col2
        self.col3 = col3
    }
}
