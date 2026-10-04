import SwiftUI
import Combine

/// ViewModel for the Library tab — manages notebooks, filtering, sorting, and sync.
@MainActor
class LibraryViewModel: ObservableObject {

    // MARK: - Published State

    @Published var notebooks: [Notebook] = []
    @Published var searchText: String = ""
    @Published var selectedCategory: String = "Tất cả"
    @Published var sortOrder: SortOrder = .lastUpdated
    @Published var isLoading: Bool = false
    @Published var isOffline: Bool = false

    // MARK: - Sort Options

    enum SortOrder: String, CaseIterable, Identifiable {
        case lastUpdated = "updated"
        case nameAZ = "name"
        case dateCreated = "created"
        case pinnedFirst = "pinned"

        var id: String { rawValue }

        var label: String {
            switch self {
            case .lastUpdated:  return "Mới cập nhật"
            case .nameAZ:       return "Tên A-Z"
            case .dateCreated:  return "Ngày tạo"
            case .pinnedFirst:  return "Ghim trước"
            }
        }

        var icon: String {
            switch self {
            case .lastUpdated:  return "clock.arrow.circlepath"
            case .nameAZ:       return "textformat.abc"
            case .dateCreated:  return "calendar"
            case .pinnedFirst:  return "pin.fill"
            }
        }
    }

    // MARK: - Computed

    /// Unique categories from all notebooks.
    var availableCategories: [String] {
        let cats = Set(notebooks.map(\.category))
        return cats.sorted()
    }

    /// Notebooks filtered by search + category, then sorted.
    var filteredNotebooks: [Notebook] {
        var result = notebooks

        // Category filter
        if selectedCategory != "Tất cả" {
            result = result.filter { $0.category == selectedCategory }
        }

        // Search filter
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { nb in
                nb.title.lowercased().contains(query) ||
                nb.category.lowercased().contains(query) ||
                nb.author.lowercased().contains(query)
            }
        }

        // Sort
        result = sorted(result)

        return result
    }

    // MARK: - Load

    /// Initial load: local cache → background sync.
    func loadNotebooks() async {
        isLoading = true
        let result = await SyncManager.shared.syncNotebooks()
        notebooks = result
        isOffline = SyncManager.shared.isOffline
        isLoading = false

        // Import reading progress
        ReadingProgressStore.shared.importFromNotebooks(result)
    }

    /// Pull-to-refresh: force full server fetch.
    func refresh() async {
        let result = await SyncManager.shared.forceRefresh()
        notebooks = result
        isOffline = SyncManager.shared.isOffline
        ReadingProgressStore.shared.importFromNotebooks(result)
    }

    // MARK: - Sort Logic

    private func sorted(_ notebooks: [Notebook]) -> [Notebook] {
        switch sortOrder {
        case .lastUpdated:
            return notebooks.sorted { $0.updatedAt > $1.updatedAt }
        case .nameAZ:
            return notebooks.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .dateCreated:
            return notebooks.sorted { $0.createdAt > $1.createdAt }
        case .pinnedFirst:
            return notebooks.sorted { a, b in
                if a.isPinned != b.isPinned { return a.isPinned }
                return a.updatedAt > b.updatedAt
            }
        }
    }
}
