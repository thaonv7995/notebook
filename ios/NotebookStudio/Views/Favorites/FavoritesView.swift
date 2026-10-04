import SwiftUI

/// Favorites tab — displays pinned notebooks and bookmarked pages (P6-4).
struct FavoritesView: View {
    @State private var notebooks: [Notebook] = []
    @ObservedObject private var bookmarkStore = BookmarkStore.shared
    @State private var selectedNotebookForReader: Notebook? = nil

    @State private var filter: FavoriteFilter = .all

    enum FavoriteFilter: String, CaseIterable, Identifiable {
        case all = "Tất cả"
        case pinned = "Sổ đã ghim"
        case bookmarks = "Trang đánh dấu"
        var id: String { rawValue }
    }

    private var pinnedNotebooks: [Notebook] {
        notebooks.filter { $0.isPinned }
    }

    private var bookmarkedItems: [(notebook: Notebook, page: Page, index: Int)] {
        var items: [(Notebook, Page, Int)] = []
        for nb in notebooks {
            for (idx, page) in nb.pages.enumerated() {
                if bookmarkStore.isBookmarked(pageId: page.id) {
                    items.append((nb, page, idx))
                }
            }
        }
        return items
    }

    private var hasFavorites: Bool {
        !pinnedNotebooks.isEmpty || !bookmarkedItems.isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0f172a")
                    .ignoresSafeArea()

                if !hasFavorites {
                    emptyFavoritesView
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Filter Segment Bar
                            HStack(spacing: 8) {
                                ForEach(FavoriteFilter.allCases) { item in
                                    Button {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        filter = item
                                    } label: {
                                        Text(item.rawValue)
                                            .font(.system(size: 12, weight: filter == item ? .bold : .medium))
                                            .foregroundColor(filter == item ? .white : Color(hex: "94a3b8"))
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 6)
                                            .background(filter == item ? Color(hex: "d97706") : Color(hex: "1e293b"))
                                            .cornerRadius(16)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 16)
                                                    .stroke(filter == item ? Color.clear : Color.white.opacity(0.08), lineWidth: 1)
                                            )
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 4)

                            // Section 1: Pinned Notebooks
                            if (filter == .all || filter == .pinned) && !pinnedNotebooks.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "pin.fill")
                                            .font(.system(size: 13))
                                            .foregroundColor(Color(hex: "fbbf24"))

                                        Text("Sổ tay đã ghim (\(pinnedNotebooks.count))")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                    .padding(.horizontal, 20)

                                    LazyVStack(spacing: 12) {
                                        ForEach(pinnedNotebooks) { nb in
                                            Button {
                                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                var activeNb = nb
                                                activeNb.lastPageIndex = ReadingProgressStore.shared.lastPageIndex(for: nb.id)
                                                selectedNotebookForReader = activeNb
                                            } label: {
                                                NotebookCardView(notebook: nb)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .padding(.horizontal, 20)
                                }
                            }

                            // Section 2: Bookmarked Pages
                            if (filter == .all || filter == .bookmarks) && !bookmarkedItems.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "bookmark.fill")
                                            .font(.system(size: 13))
                                            .foregroundColor(Color(hex: "f59e0b"))

                                        Text("Trang đã đánh dấu (\(bookmarkedItems.count))")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                    .padding(.horizontal, 20)

                                    LazyVStack(spacing: 10) {
                                        ForEach(bookmarkedItems, id: \.page.id) { item in
                                            Button {
                                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                var activeNb = item.notebook
                                                activeNb.lastPageIndex = item.index
                                                selectedNotebookForReader = activeNb
                                            } label: {
                                                BookmarkedPageCard(
                                                    notebook: item.notebook,
                                                    page: item.page,
                                                    pageIndex: item.index,
                                                    onRemoveBookmark: {
                                                        bookmarkStore.toggle(notebookId: item.notebook.id, pageId: item.page.id)
                                                    }
                                                )
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .padding(.horizontal, 20)
                                }
                            }
                        }
                        .padding(.bottom, 36)
                    }
                    .refreshable {
                        await refreshData()
                    }
                }
            }
            .navigationTitle("Yêu thích")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                loadData()
            }
            .fullScreenCover(item: $selectedNotebookForReader) { nb in
                ReaderView(notebook: nb, initialPageIndex: nb.lastPageIndex)
            }
        }
    }

    // MARK: - Empty State

    private var emptyFavoritesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "star.slash")
                .font(.system(size: 54))
                .foregroundColor(Color(hex: "475569"))

            Text("Chưa có mục yêu thích")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)

            Text("Ghim sổ tay quan trọng từ thư viện hoặc chạm biểu tượng bookmark khi đọc trang để lưu vào đây.")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "94a3b8"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(24)
    }

    // MARK: - Data Loading

    private func loadData() {
        notebooks = LocalStorageManager.shared.fetchNotebooks()
    }

    private func refreshData() async {
        let synced = await SyncManager.shared.syncNotebooks()
        notebooks = synced
    }
}

#Preview {
    FavoritesView()
}
