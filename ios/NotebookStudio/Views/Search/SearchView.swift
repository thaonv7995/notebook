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
                Color(hex: "0f172a")
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
            .navigationBarTitleDisplayMode(.inline)
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
            .fullScreenCover(item: $selectedNotebookForReader) { nb in
                ReaderView(notebook: nb, initialPageIndex: nb.lastPageIndex)
            }
        }
    }

    // MARK: - Dashboard (Empty Query State)

    private var emptySearchDashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Recent Searches Section
                if !recentSearches.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Tìm kiếm gần đây")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Color(hex: "94a3b8"))

                            Spacer()

                            Button("Xóa") {
                                clearRecentSearches()
                            }
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color(hex: "38bdf8"))
                        }

                        // Flow chips
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(recentSearches, id: \.self) { query in
                                    Button {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        searchText = query
                                        performSearch(query: query)
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: "clock.arrow.circlepath")
                                                .font(.system(size: 11))
                                                .foregroundColor(Color(hex: "38bdf8"))
                                            Text(query)
                                                .font(.system(size: 13, weight: .medium))
                                                .foregroundColor(.white)
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 7)
                                        .background(Color(hex: "1e293b"))
                                        .clipShape(Capsule())
                                        .overlay(
                                            Capsule()
                                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                        )
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                }

                // Quick Access Section (Recent notebooks)
                if !notebooks.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Truy cập nhanh")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(Color(hex: "94a3b8"))
                            .padding(.horizontal, 20)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(notebooks.prefix(6)) { nb in
                                    Button {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        var activeNb = nb
                                        activeNb.lastPageIndex = ReadingProgressStore.shared.lastPageIndex(for: nb.id)
                                        selectedNotebookForReader = activeNb
                                    } label: {
                                        quickAccessCard(nb)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                }
            }
            .padding(.bottom, 36)
        }
    }

    private func quickAccessCard(_ nb: Notebook) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            // Mini cover thumbnail
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(GradientParser.gradient(from: nb.coverGradient))
                    .frame(width: 126, height: 78)

                Text(nb.category)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.black.opacity(0.45))
                    .clipShape(Capsule())
                    .padding(6)
            }

            Text(nb.title)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .frame(width: 126, alignment: .leading)

            let lastPage = ReadingProgressStore.shared.lastPageIndex(for: nb.id)
            Text("Đang ở trang \(lastPage + 1)/\(max(1, nb.pages.count))")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(hex: "2dd4bf"))
                .frame(width: 126, alignment: .leading)
        }
        .padding(10)
        .background(Color(hex: "1e293b"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    // MARK: - Search Results List

    private var searchResultsList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                // Header with result count
                Text("Tìm thấy \(searchResults.count) kết quả")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(hex: "94a3b8"))
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                LazyVStack(spacing: 10) {
                    ForEach(searchResults) { result in
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
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
                .padding(.horizontal, 20)
                .padding(.bottom, 36)
            }
        }
    }

    // MARK: - No Results View

    private var noResultsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(Color(hex: "475569"))

            Text("Không tìm thấy kết quả")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)

            Text("Không có trang hoặc sổ tay nào khớp với \"\(searchText)\". Hãy thử từ khóa khác.")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "94a3b8"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
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
