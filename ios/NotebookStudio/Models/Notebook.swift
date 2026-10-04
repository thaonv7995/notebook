import Foundation

/// A notebook containing multiple pages with a specific template.
/// Maps 1:1 with the JSON structure from the web app's backend API.
///
/// Reference: `src/state/store.js` lines 50-130, `server/db.js`
struct Notebook: Codable, Identifiable, Equatable, Hashable {
    let id: String
    var title: String
    var author: String
    var category: String
    var lang: String
    var fontFamily: String
    var lineHeight: String
    var coverGradient: String
    var coverTextColor: String
    var isPinned: Bool
    var lastPageIndex: Int
    var deletedPageIds: [String]
    var pages: [Page]
    var createdAt: String
    var updatedAt: String

    // MARK: - Defaults for optional/missing fields

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Cuốn sổ chưa đặt tên"
        author = try c.decodeIfPresent(String.self, forKey: .author) ?? "@thaonv"
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? "Ghi chép"
        lang = try c.decodeIfPresent(String.self, forKey: .lang) ?? "VI"
        fontFamily = try c.decodeIfPresent(String.self, forKey: .fontFamily) ?? "sans"
        lineHeight = try c.decodeIfPresent(String.self, forKey: .lineHeight) ?? "28"
        coverGradient = try c.decodeIfPresent(String.self, forKey: .coverGradient) ?? "linear-gradient(135deg, #1e3a8a, #0f172a)"
        coverTextColor = try c.decodeIfPresent(String.self, forKey: .coverTextColor) ?? "#ffffff"
        isPinned = try c.decodeIfPresent(Bool.self, forKey: .isPinned) ?? false
        lastPageIndex = try c.decodeIfPresent(Int.self, forKey: .lastPageIndex) ?? 0
        deletedPageIds = try c.decodeIfPresent([String].self, forKey: .deletedPageIds) ?? []
        pages = try c.decodeIfPresent([Page].self, forKey: .pages) ?? []
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt) ?? ISO8601DateFormatter().string(from: Date())
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt) ?? ISO8601DateFormatter().string(from: Date())
    }

    // MARK: - Programmatic init

    init(
        id: String,
        title: String = "Cuốn sổ chưa đặt tên",
        author: String = "@thaonv",
        category: String = "Ghi chép",
        lang: String = "VI",
        fontFamily: String = "sans",
        lineHeight: String = "28",
        coverGradient: String = "linear-gradient(135deg, #1e3a8a, #0f172a)",
        coverTextColor: String = "#ffffff",
        isPinned: Bool = false,
        lastPageIndex: Int = 0,
        deletedPageIds: [String] = [],
        pages: [Page] = [],
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.title = title
        self.author = author
        self.category = category
        self.lang = lang
        self.fontFamily = fontFamily
        self.lineHeight = lineHeight
        self.coverGradient = coverGradient
        self.coverTextColor = coverTextColor
        self.isPinned = isPinned
        self.lastPageIndex = lastPageIndex
        self.deletedPageIds = deletedPageIds
        self.pages = pages
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Computed Properties

    /// Total number of pages (excluding deleted).
    var pageCount: Int { pages.count }

    /// The template of the first page (for display in library cards).
    var primaryTemplate: PageTemplate { pages.first?.template ?? .ruled }

    /// Reading progress as a fraction (0.0 to 1.0).
    var readingProgress: Double {
        guard pageCount > 0 else { return 0 }
        return Double(min(lastPageIndex + 1, pageCount)) / Double(pageCount)
    }

    /// Equatable conformance (by ID + updatedAt for performance).
    static func == (lhs: Notebook, rhs: Notebook) -> Bool {
        lhs.id == rhs.id && lhs.updatedAt == rhs.updatedAt
    }

    /// Hashable conformance (by ID only).
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
