import Foundation
import SwiftData

/// Manages offline notebook storage using SwiftData.
///
/// All methods operate on a background ModelContext for thread safety.
/// The manager converts between value-type `Notebook` and `CachedNotebook` @Model.
@MainActor
class LocalStorageManager {

    // MARK: - Singleton

    static let shared = LocalStorageManager()

    // MARK: - SwiftData Container

    let container: ModelContainer

    private init() {
        let schema = Schema([CachedNotebook.self])
        let config = ModelConfiguration(
            "NotebookStudioCache",
            schema: schema,
            isStoredInMemoryOnly: false
        )
        do {
            container = try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Failed to create SwiftData container: \(error)")
        }
    }

    /// A fresh context for each operation.
    private var context: ModelContext {
        container.mainContext
    }

    // MARK: - Save & Replace Notebooks

    /// Save or update notebooks in local storage.
    /// Existing notebooks (by ID) are updated; new ones are inserted.
    func saveNotebooks(_ notebooks: [Notebook]) {
        // Fetch all existing cached notebooks
        let descriptor = FetchDescriptor<CachedNotebook>()
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingMap = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        for notebook in notebooks {
            if let cached = existingMap[notebook.id] {
                // Update existing
                cached.update(from: notebook)
            } else {
                // Insert new
                let cached = CachedNotebook(from: notebook)
                context.insert(cached)
            }
        }

        try? context.save()
    }

    /// Authoritative server replacement: updates matching notebooks, inserts new ones,
    /// and purges any locally cached notebooks (or old starter samples) that no longer exist on the server.
    func replaceNotebooks(_ notebooks: [Notebook]) {
        let descriptor = FetchDescriptor<CachedNotebook>()
        let existing = (try? context.fetch(descriptor)) ?? []
        let serverIds = Set(notebooks.map(\.id))
        let existingMap = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        // 1. Delete removed or starter notebooks not on server
        for cached in existing {
            if !serverIds.contains(cached.id) {
                context.delete(cached)
            }
        }

        // 2. Insert or update
        for notebook in notebooks {
            if let cached = existingMap[notebook.id] {
                cached.update(from: notebook)
            } else {
                let cached = CachedNotebook(from: notebook)
                context.insert(cached)
            }
        }

        try? context.save()
    }

    // MARK: - Load All Notebooks

    /// Load all cached notebooks, sorted by updatedAt descending.
    func loadNotebooks() -> [Notebook] {
        var descriptor = FetchDescriptor<CachedNotebook>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        descriptor.fetchLimit = 500 // Safety limit

        if let cached = try? context.fetch(descriptor), !cached.isEmpty {
            return cached.map { $0.toNotebook() }
        }

        // Only fallback to starter notebooks if user is unauthenticated offline guest
        if KeychainManager.getToken() == nil {
            let starters = InitialData.starterNotebooks
            if !starters.isEmpty {
                saveNotebooks(starters)
                return starters
            }
        }

        return []
    }

    /// Alias for loadNotebooks() for consistent naming across views.
    func fetchNotebooks() -> [Notebook] {
        loadNotebooks()
    }

    // MARK: - Get Single Notebook

    /// Load a single notebook by ID.
    func getNotebook(id: String) -> Notebook? {
        let predicate = #Predicate<CachedNotebook> { $0.id == id }
        var descriptor = FetchDescriptor(predicate: predicate)
        descriptor.fetchLimit = 1

        guard let cached = try? context.fetch(descriptor).first else {
            return nil
        }

        return cached.toNotebook()
    }

    // MARK: - Update Reading Progress

    /// Update the lastPageIndex for a specific notebook.
    func updateReadingProgress(notebookId: String, pageIndex: Int) {
        let predicate = #Predicate<CachedNotebook> { $0.id == notebookId }
        var descriptor = FetchDescriptor(predicate: predicate)
        descriptor.fetchLimit = 1

        if let cached = try? context.fetch(descriptor).first {
            cached.lastPageIndex = pageIndex
            try? context.save()
        }
    }

    // MARK: - Delete Notebook

    /// Delete a single notebook from local cache.
    func deleteNotebook(id: String) {
        let predicate = #Predicate<CachedNotebook> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)

        if let cached = try? context.fetch(descriptor) {
            cached.forEach { context.delete($0) }
            try? context.save()
        }
    }

    // MARK: - Delete All

    /// Clear all cached notebooks (used on logout or cache reset).
    func deleteAll() {
        do {
            try context.delete(model: CachedNotebook.self)
            try context.save()
        } catch {
            print("⚠️ Failed to clear cache: \(error)")
        }
    }

    // MARK: - Count

    /// Number of cached notebooks.
    var notebookCount: Int {
        let descriptor = FetchDescriptor<CachedNotebook>()
        return (try? context.fetchCount(descriptor)) ?? 0
    }
}
