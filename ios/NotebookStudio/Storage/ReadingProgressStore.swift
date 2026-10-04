import Foundation

/// Tracks reading progress (lastPageIndex) per notebook locally.
///
/// Saves to both SwiftData (via LocalStorageManager) and UserDefaults
/// for fast access without full notebook deserialization.
@MainActor
class ReadingProgressStore: ObservableObject {

    // MARK: - Singleton

    static let shared = ReadingProgressStore()

    // MARK: - Storage

    /// UserDefaults key prefix for fast lastPageIndex lookups.
    private let keyPrefix = "reading_progress_"

    /// In-memory cache of progress to avoid UserDefaults lookups on every page flip.
    private var progressCache: [String: Int] = [:]

    private init() {}

    // MARK: - Get Progress

    /// Get the last read page index for a notebook.
    func getProgress(notebookId: String) -> Int {
        if let cached = progressCache[notebookId] {
            return cached
        }
        let stored = UserDefaults.standard.integer(forKey: keyPrefix + notebookId)
        progressCache[notebookId] = stored
        return stored
    }

    // MARK: - Set Progress

    /// Update reading progress. Saves locally and optionally triggers server sync.
    ///
    /// - Parameters:
    ///   - notebookId: The notebook being read.
    ///   - pageIndex: The current page index (0-based).
    ///   - syncToServer: Whether to schedule a background sync (debounced).
    func setProgress(notebookId: String, pageIndex: Int, syncToServer: Bool = false) {
        progressCache[notebookId] = pageIndex

        // Persist to UserDefaults (fast)
        UserDefaults.standard.set(pageIndex, forKey: keyPrefix + notebookId)

        // Persist to SwiftData cache
        LocalStorageManager.shared.updateReadingProgress(
            notebookId: notebookId,
            pageIndex: pageIndex
        )

        // Debounced server sync (don't sync on every page flip)
        if syncToServer {
            scheduleSyncDebounce(notebookId: notebookId, pageIndex: pageIndex)
        }
    }

    // MARK: - Batch Import

    /// Import reading progress from server-fetched notebooks.
    func importFromNotebooks(_ notebooks: [Notebook]) {
        for nb in notebooks {
            progressCache[nb.id] = nb.lastPageIndex
            UserDefaults.standard.set(nb.lastPageIndex, forKey: keyPrefix + nb.id)
        }
    }

    // MARK: - Clear

    /// Clear all progress (on logout).
    func clearAll() {
        for (key, _) in progressCache {
            UserDefaults.standard.removeObject(forKey: keyPrefix + key)
        }
        progressCache.removeAll()
    }

    // MARK: - Debounced Sync

    /// Sync timers keyed by notebook ID.
    private var syncTimers: [String: Task<Void, Never>] = [:]

    /// Debounce sync to server — waits 5 seconds after last page change.
    private func scheduleSyncDebounce(notebookId: String, pageIndex: Int) {
        syncTimers[notebookId]?.cancel()

        syncTimers[notebookId] = Task {
            try? await Task.sleep(for: .seconds(5))

            guard !Task.isCancelled else { return }

            // Build minimal notebook with updated progress for sync
            if var notebook = LocalStorageManager.shared.getNotebook(id: notebookId) {
                notebook = Notebook(
                    id: notebook.id,
                    title: notebook.title,
                    author: notebook.author,
                    category: notebook.category,
                    lang: notebook.lang,
                    fontFamily: notebook.fontFamily,
                    lineHeight: notebook.lineHeight,
                    coverGradient: notebook.coverGradient,
                    coverTextColor: notebook.coverTextColor,
                    isPinned: notebook.isPinned,
                    lastPageIndex: pageIndex,
                    deletedPageIds: notebook.deletedPageIds,
                    pages: notebook.pages,
                    createdAt: notebook.createdAt,
                    updatedAt: notebook.updatedAt
                )
                SyncManager.shared.syncReadingProgress(notebooks: [notebook])
            }
        }
    }
}
