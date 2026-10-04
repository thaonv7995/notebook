import Foundation

/// Manages bookmarked pages locally (favorites feature).
///
/// Bookmarks are stored in UserDefaults as they are lightweight
/// and local-only (not synced to server).
@MainActor
class BookmarkStore: ObservableObject {

    // MARK: - Singleton

    static let shared = BookmarkStore()

    // MARK: - Published

    @Published private(set) var bookmarks: [Bookmark] = []

    // MARK: - Storage

    private let storageKey = "notebook_bookmarks"

    // MARK: - Model

    struct Bookmark: Codable, Identifiable, Equatable {
        let notebookId: String
        let pageId: String
        let createdAt: Date

        var id: String { "\(notebookId):\(pageId)" }
    }

    // MARK: - Init

    private init() {
        loadFromDisk()
    }

    // MARK: - Toggle Bookmark

    /// Toggle bookmark for a page. Returns true if bookmarked, false if removed.
    @discardableResult
    func toggle(notebookId: String, pageId: String) -> Bool {
        if let index = bookmarks.firstIndex(where: { $0.notebookId == notebookId && $0.pageId == pageId }) {
            bookmarks.remove(at: index)
            saveToDisk()
            return false
        } else {
            let bookmark = Bookmark(
                notebookId: notebookId,
                pageId: pageId,
                createdAt: Date()
            )
            bookmarks.insert(bookmark, at: 0)
            saveToDisk()
            return true
        }
    }

    // MARK: - Check

    /// Check if a page is bookmarked.
    func isBookmarked(notebookId: String, pageId: String) -> Bool {
        bookmarks.contains { $0.notebookId == notebookId && $0.pageId == pageId }
    }

    // MARK: - Get Bookmarks for Notebook

    /// Get all bookmarked page IDs for a specific notebook.
    func bookmarkedPageIds(for notebookId: String) -> [String] {
        bookmarks.filter { $0.notebookId == notebookId }.map(\.pageId)
    }

    // MARK: - Remove All for Notebook

    /// Remove all bookmarks for a notebook (when notebook is deleted).
    func removeAll(for notebookId: String) {
        bookmarks.removeAll { $0.notebookId == notebookId }
        saveToDisk()
    }

    // MARK: - Clear All

    /// Clear all bookmarks (on logout).
    func clearAll() {
        bookmarks.removeAll()
        saveToDisk()
    }

    // MARK: - Persistence

    private func saveToDisk() {
        if let data = try? JSONEncoder().encode(bookmarks) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func loadFromDisk() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([Bookmark].self, from: data) else {
            return
        }
        bookmarks = decoded
    }
}
