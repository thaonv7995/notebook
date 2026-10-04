import Foundation
import SwiftData

/// SwiftData model mirroring the `Notebook` struct for offline persistence.
///
/// Uses a simple JSON-blob approach for pages rather than a full relational model,
/// since pages have many optional fields across 10 template types.
/// This avoids a complex @Model hierarchy while keeping fast local reads.
@Model
final class CachedNotebook {
    // MARK: - Identity
    @Attribute(.unique) var id: String

    // MARK: - Metadata
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
    var createdAt: String
    var updatedAt: String

    // MARK: - Pages (stored as JSON Data for flexibility)
    /// Pages serialized as JSON Data. Decoded to [Page] on read.
    /// This avoids needing a separate @Model for each of the 10 template variants.
    @Attribute(.externalStorage) var pagesData: Data
    var deletedPageIdsData: Data

    // MARK: - Derived (non-persisted helpers)
    @Transient var _cachedPages: [Page]? = nil
    @Transient var _cachedDeletedPageIds: [String]? = nil

    // MARK: - Init

    init(from notebook: Notebook) {
        self.id = notebook.id
        self.title = notebook.title
        self.author = notebook.author
        self.category = notebook.category
        self.lang = notebook.lang
        self.fontFamily = notebook.fontFamily
        self.lineHeight = notebook.lineHeight
        self.coverGradient = notebook.coverGradient
        self.coverTextColor = notebook.coverTextColor
        self.isPinned = notebook.isPinned
        self.lastPageIndex = notebook.lastPageIndex
        self.createdAt = notebook.createdAt
        self.updatedAt = notebook.updatedAt
        self.pagesData = (try? JSONEncoder().encode(notebook.pages)) ?? Data()
        self.deletedPageIdsData = (try? JSONEncoder().encode(notebook.deletedPageIds)) ?? Data()
    }

    // MARK: - Update from Notebook

    /// Update all fields from an incoming Notebook (used during sync).
    func update(from notebook: Notebook) {
        title = notebook.title
        author = notebook.author
        category = notebook.category
        lang = notebook.lang
        fontFamily = notebook.fontFamily
        lineHeight = notebook.lineHeight
        coverGradient = notebook.coverGradient
        coverTextColor = notebook.coverTextColor
        isPinned = notebook.isPinned
        lastPageIndex = notebook.lastPageIndex
        createdAt = notebook.createdAt
        updatedAt = notebook.updatedAt
        pagesData = (try? JSONEncoder().encode(notebook.pages)) ?? Data()
        deletedPageIdsData = (try? JSONEncoder().encode(notebook.deletedPageIds)) ?? Data()
        _cachedPages = nil
        _cachedDeletedPageIds = nil
    }

    // MARK: - Convert to Notebook

    /// Decode pages and convert back to the value-type Notebook.
    func toNotebook() -> Notebook {
        let pages: [Page] = (try? JSONDecoder().decode([Page].self, from: pagesData)) ?? []
        let deletedPageIds: [String] = (try? JSONDecoder().decode([String].self, from: deletedPageIdsData)) ?? []

        return Notebook(
            id: id,
            title: title,
            author: author,
            category: category,
            lang: lang,
            fontFamily: fontFamily,
            lineHeight: lineHeight,
            coverGradient: coverGradient,
            coverTextColor: coverTextColor,
            isPinned: isPinned,
            lastPageIndex: lastPageIndex,
            deletedPageIds: deletedPageIds,
            pages: pages,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }

    // MARK: - Lazy Pages Access

    /// Decoded pages (cached after first access).
    var pages: [Page] {
        if let cached = _cachedPages { return cached }
        let decoded = (try? JSONDecoder().decode([Page].self, from: pagesData)) ?? []
        _cachedPages = decoded
        return decoded
    }

    /// Decoded deleted page IDs.
    var deletedPageIds: [String] {
        if let cached = _cachedDeletedPageIds { return cached }
        let decoded = (try? JSONDecoder().decode([String].self, from: deletedPageIdsData)) ?? []
        _cachedDeletedPageIds = decoded
        return decoded
    }
}
