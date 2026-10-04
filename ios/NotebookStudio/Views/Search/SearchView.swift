import SwiftUI

/// Search tab — full-text search across notebooks and pages (P6-1).
/// Features:
/// - Native `.searchable()`
/// - Recent searches chips (saved in UserDefaults)
/// - Quick Access recent notebooks
/// - Real-time full-text search with highlight
struct SearchView: View {
    @State private var searchText: String = ""
    @State private var notebooks: [Notebook] = []
    @State private var searchResults: [SearchResult] = []
    @State private var isSearching: Bool = false
    @State private var recentSearches: [String] = []

    @State private var selectedNotebookForReader: Notebook? = nil

    private let recentSearchesKey = "recent_search_queries"

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    // Empty search text: Show Recent Searches & Quick Access
                    emptySearchDashboard
                } else if searchResults.isEmpty {
                    // No results found
                    noResultsView
                } else {
                    // Search Results List
                    searchResultsList
                }
            }
            .navigationTitle("Tìm kiếm")
            .searchable(
                text: $searchText,
                prompt: "Tìm tiêu đề, nội dung, ghi chú..."
            )
            .onSubmit(of: .search) {
                saveRecentSearch(searchText)
            }
            .onChange(of: searchText) { _, newQuery in
                performSearch(query: newQuery)
            }
            .task {
                loadNotebooks()
                loadRecentSearches()
            }
            .navigationDestination(item: $selectedNotebookForReader) { nb in
                ReaderView(notebook: nb)
            }
        }
    }

    // MARK: - Dashboard (Empty Query State)

    private var emptySearchDashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.spacingLG) {
                // Recent Searches Section
                if !recentSearches.isEmpty {
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        HStack {
                            Text("Tìm kiếm gần đây")
                                .font(.jakartaSans(size: 13, weight: .bold))
                                .foregroundStyle(.secondary)

                            Spacer()

                            Button("Xóa") {
                                clearRecentSearches()
                            }
                            .font(.jakartaSans(size: 12))
                            .foregroundStyle(DesignTokens.accentLight)
                        }

                        // Flow chips
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(recentSearches, id: \.self) { query in
                                    Button {
                                        searchText = query
                                        performSearch(query: query)
                                    } label: {
                                        HStack(spacing: 4) {
                                            Image(systemName: "clock.arrow.circlepath")
                                                .font(.system(size: 11))
                                            Text(query)
                                                .font(.jakartaSans(size: 13, weight: .medium))
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 7)
                                        .background(Color(.secondarySystemGroupedBackground), in: Capsule())
                                        .foregroundStyle(.primary)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, DesignTokens.spacingLG)
                    .padding(.top, DesignTokens.spacingMD)
                }

                // Quick Access Section (Recent notebooks)
                if !notebooks.isEmpty {
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        Text("Truy cập nhanh")
                            .font(.jakartaSans(size: 13, weight: .bold))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, DesignTokens.spacingLG)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: DesignTokens.spacingMD) {
                                ForEach(notebooks.prefix(6)) { nb in
                                    Button {
                                        var activeNb = nb
                                        activeNb.lastPageIndex = ReadingProgressStore.shared.lastPageIndex(for: nb.id)
                                        selectedNotebookForReader = activeNb
                                    } label: {
                                        quickAccessCard(nb)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, DesignTokens.spacingLG)
                        }
                    }
                }
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
    }

    private func quickAccessCard(_ nb: Notebook) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            // Mini cover thumbnail
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(GradientParser.parse(nb.coverGradient))
                    .frame(width: 120, height: 75)

                Text(nb.category)
                    .font(.jakartaSans(size: 9, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.black.opacity(0.4), in: Capsule())
                    .padding(6)
            }

            Text(nb.title)
                .font(.jakartaSans(size: 13, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .frame(width: 120, alignment: .leading)

            let lastPage = ReadingProgressStore.shared.lastPageIndex(for: nb.id)
            Text("Đang ở trang \(lastPage + 1)/\(max(1, nb.pages.count))")
                .font(.jakartaSans(size: 10))
                .foregroundStyle(.secondary)
                .frame(width: 120, alignment: .leading)
        }
        .padding(8)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
    }

    // MARK: - Search Results List

    private var searchResultsList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                // Header with result count
                Text("Tìm thấy \(searchResults.count) kết quả")
                    .font(.jakartaSans(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, DesignTokens.spacingLG)
                    .padding(.top, DesignTokens.spacingSM)

                LazyVStack(spacing: DesignTokens.spacingSM) {
                    ForEach(searchResults) { result in
                        Button {
                            saveRecentSearch(searchText)
                            var activeNb = result.notebook
                            activeNb.lastPageIndex = result.pageIndex
                            selectedNotebookForReader = activeNb
                        } label: {
                            SearchResultView(result: result)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, DesignTokens.spacingLG)
                .padding(.bottom, DesignTokens.spacingXXL)
            }
        }
    }

    // MARK: - No Results View

    private var noResultsView: some View {
        VStack(spacing: DesignTokens.spacingMD) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 44))
                .foregroundStyle(.secondary.opacity(0.5))

            Text("Không tìm thấy kết quả")
                .font(.jakartaSans(size: 16, weight: .semibold))
                .foregroundStyle(.primary)

            Text("Không có trang hoặc sổ tay nào khớp với \"\(searchText)\". Hãy thử từ khóa khác.")
                .font(.jakartaSans(size: 13))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.spacingXXL)
        }
        .padding()
    }

    // MARK: - Actions

    private func performSearch(query: String) {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            searchResults = []
            return
        }
        searchResults = SearchEngine.shared.search(query: query, in: notebooks)
    }

    private func loadNotebooks() {
        notebooks = LocalStorageManager.shared.fetchNotebooks()
    }

    private func loadRecentSearches() {
        if let stored = UserDefaults.standard.stringArray(forKey: recentSearchesKey) {
            recentSearches = stored
        }
    }

    private func saveRecentSearch(_ query: String) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        var list = recentSearches.filter { $0.lowercased() != trimmed.lowercased() }
        list.insert(trimmed, at: 0)
        if list.count > 10 { list = Array(list.prefix(10)) }

        recentSearches = list
        UserDefaults.standard.set(list, forKey: recentSearchesKey)
    }

    private func clearRecentSearches() {
        recentSearches = []
        UserDefaults.standard.removeObject(forKey: recentSearchesKey)
    }
}

#Preview {
    SearchView()
}
