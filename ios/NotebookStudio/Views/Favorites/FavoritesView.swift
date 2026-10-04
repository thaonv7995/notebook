import SwiftUI

/// Favorites tab — displays pinned notebooks and bookmarked pages (P6-4).
struct FavoritesView: View {
    @State private var notebooks: [Notebook] = []
    @ObservedObject private var bookmarkStore = BookmarkStore.shared
    @State private var selectedNotebookForReader: Notebook? = nil

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
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                if !hasFavorites {
                    emptyFavoritesView
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: DesignTokens.spacingLG) {
                            // Section 1: Pinned Notebooks
                            if !pinnedNotebooks.isEmpty {
                                VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "pin.fill")
                                            .font(.system(size: 13))
                                            .foregroundStyle(DesignTokens.accentLight)

                                        Text("Sổ tay đã ghim (\(pinnedNotebooks.count))")
                                            .font(.jakartaSans(size: 14, weight: .bold))
                                            .foregroundStyle(.secondary)
                                    }
                                    .padding(.horizontal, DesignTokens.spacingLG)

                                    LazyVStack(spacing: DesignTokens.spacingSM) {
                                        ForEach(pinnedNotebooks) { nb in
                                            Button {
                                                var activeNb = nb
                                                activeNb.lastPageIndex = ReadingProgressStore.shared.lastPageIndex(for: nb.id)
                                                selectedNotebookForReader = activeNb
                                            } label: {
                                                NotebookCardView(notebook: nb)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .padding(.horizontal, DesignTokens.spacingLG)
                                }
                                .padding(.top, DesignTokens.spacingSM)
                            }

                            // Section 2: Bookmarked Pages
                            if !bookmarkedItems.isEmpty {
                                VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "bookmark.fill")
                                            .font(.system(size: 13))
                                            .foregroundStyle(.orange)

                                        Text("Trang đã đánh dấu (\(bookmarkedItems.count))")
                                            .font(.jakartaSans(size: 14, weight: .bold))
                                            .foregroundStyle(.secondary)
                                    }
                                    .padding(.horizontal, DesignTokens.spacingLG)

                                    LazyVStack(spacing: DesignTokens.spacingSM) {
                                        ForEach(bookmarkedItems, id: \.page.id) { item in
                                            Button {
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
                                    .padding(.horizontal, DesignTokens.spacingLG)
                                }
                            }
                        }
                        .padding(.bottom, DesignTokens.spacingXXL)
                    }
                    .refreshable {
                        await refreshData()
                    }
                }
            }
            .navigationTitle("Yêu thích")
            .task {
                loadData()
            }
            .navigationDestination(item: $selectedNotebookForReader) { nb in
                ReaderView(notebook: nb)
            }
        }
    }

    // MARK: - Empty State

    private var emptyFavoritesView: some View {
        VStack(spacing: DesignTokens.spacingLG) {
            Image(systemName: "star.slash")
                .font(.system(size: 54))
                .foregroundStyle(DesignTokens.accentLight.opacity(0.5))

            Text("Chưa có mục yêu thích")
                .font(.jakartaSans(size: 17, weight: .semibold))
                .foregroundStyle(.primary)

            Text("Ghim sổ tay quan trọng từ thư viện hoặc chạm biểu tượng bookmark khi đọc trang để lưu vào đây.")
                .font(.jakartaSans(size: 13))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.spacingXXL)
        }
        .padding()
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
