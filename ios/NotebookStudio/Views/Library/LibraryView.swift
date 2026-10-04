import SwiftUI

/// Reading session target identifying which notebook and page to open in full screen reader.
struct ReadingSessionTarget: Identifiable {
    var id: String { "\(notebook.id)_\(pageIndex)" }
    let notebook: Notebook
    let pageIndex: Int
}

/// Library/Bookshelf tab — Modeled faithfully after bilingual-app BookshelfView with dark slate desk,
/// adaptive 160-220 grid, 154:220 book cards, collection filters, and full-screen reader integration.
struct LibraryView: View {
    @StateObject private var viewModel = LibraryViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var selectedNotebookForDetail: Notebook? = nil
    @State private var selectedReadingTarget: ReadingSessionTarget? = nil
    @State private var collectionFilter: CollectionFilter = .all
    @State private var rotationDegrees: Double = 0.0

    @ObservedObject private var progressStore = ReadingProgressStore.shared

    enum CollectionFilter: String, CaseIterable, Identifiable {
        case all = "Tất cả"
        case priority = "Ưu tiên"
        case reading = "Đang đọc"
        case finished = "Đã xong"

        var id: String { rawValue }
    }

    // Adaptive grid columns for iPhone/iPad layouts (from bilingual-app)
    let columns = [
        GridItem(.adaptive(minimum: 160, maximum: 220), spacing: 20)
    ]

    /// Filtered and sorted notebooks matching bilingual-app shelf rules
    private var displayedNotebooks: [Notebook] {
        var list = viewModel.filteredNotebooks

        switch collectionFilter {
        case .all:
            break
        case .priority:
            list = list.filter { $0.isPinned }
        case .reading:
            list = list.filter { nb in
                let p = progressStore.lastPageIndex(for: nb.id)
                return p > 0 && p < max(1, nb.pageCount) - 1
            }
        case .finished:
            list = list.filter { nb in
                let p = progressStore.lastPageIndex(for: nb.id)
                return nb.pageCount > 0 && p >= nb.pageCount - 1
            }
        }

        return list
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Dark slate desk background (bilingual-app #0f172a)
                Color(hex: "0f172a")
                    .ignoresSafeArea()

                if viewModel.isLoading && viewModel.notebooks.isEmpty {
                    VStack(spacing: 16) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Text("Đang tải danh sách sổ tay...")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                } else if viewModel.notebooks.isEmpty {
                    emptyLibraryState
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Category Filter Chips
                            if viewModel.availableCategories.count > 1 {
                                CategoryChipsBar(
                                    categories: viewModel.availableCategories,
                                    selectedCategory: $viewModel.selectedCategory
                                )
                                .padding(.top, 4)
                            }

                            // Bookshelf Grid
                            if displayedNotebooks.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "book.closed")
                                        .font(.system(size: 44))
                                        .foregroundColor(Color(hex: "475569"))
                                    Text("Không có sổ tay trong mục này")
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundColor(Color(hex: "94a3b8"))
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.top, 60)
                            } else {
                                LazyVGrid(columns: columns, spacing: 25) {
                                    ForEach(displayedNotebooks) { notebook in
                                        NotebookBookCard(
                                            notebook: notebook,
                                            onSelect: {
                                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                let lastPage = progressStore.lastPageIndex(for: notebook.id)
                                                selectedReadingTarget = ReadingSessionTarget(notebook: notebook, pageIndex: lastPage)
                                            },
                                            onShowDetail: {
                                                selectedNotebookForDetail = notebook
                                            },
                                            onTogglePriority: {
                                                togglePin(notebook)
                                            },
                                            onStartReading: {
                                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                let lastPage = progressStore.lastPageIndex(for: notebook.id)
                                                selectedReadingTarget = ReadingSessionTarget(notebook: notebook, pageIndex: lastPage)
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                        .padding(.bottom, 36)
                    }
                    .refreshable {
                        await reloadWithAnimation()
                    }
                }

                // Offline Notice Banner
                if viewModel.isOffline {
                    VStack {
                        OfflineNoticeBanner()
                        Spacer()
                    }
                }
            }
            .navigationTitle("Tủ Sách Sổ Tay")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(
                text: $viewModel.searchText,
                prompt: "Tìm sổ tay hoặc tác giả..."
            )
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 10) {
                        // Collection Filter Menu
                        Menu {
                            Picker("Bộ lọc", selection: $collectionFilter) {
                                ForEach(CollectionFilter.allCases) { filter in
                                    Text(filter.rawValue).tag(filter)
                                }
                            }

                            Divider()

                            Menu("Sắp xếp") {
                                ForEach(LibraryViewModel.SortOrder.allCases) { order in
                                    Button {
                                        viewModel.sortOrder = order
                                    } label: {
                                        HStack {
                                            Text(order.label)
                                            if viewModel.sortOrder == order {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            }
                        } label: {
                            Image(systemName: "line.3.horizontal.decrease")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(collectionFilter == .all ? .white.opacity(0.9) : Color(hex: "38bdf8"))
                                .frame(width: 32, height: 32)
                                .background(collectionFilter == .all ? Color.white.opacity(0.08) : Color(hex: "38bdf8").opacity(0.18))
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(collectionFilter == .all ? Color.white.opacity(0.15) : Color(hex: "38bdf8").opacity(0.4), lineWidth: 1)
                                )
                        }

                        // Refresh Button with 360° spin
                        Button(action: {
                            Task {
                                await reloadWithAnimation()
                            }
                        }) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.9))
                                .rotationEffect(.degrees(rotationDegrees))
                                .frame(width: 32, height: 32)
                                .background(Color.white.opacity(0.08))
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                )
                        }
                    }
                }
            }
            // Detail Sheet (Chi tiết sổ tay)
            .sheet(item: $selectedNotebookForDetail) { notebook in
                NotebookDetailSheet(
                    notebook: notebook,
                    onStartReading: { nb, pageIndex in
                        selectedReadingTarget = ReadingSessionTarget(notebook: nb, pageIndex: pageIndex)
                    },
                    onTogglePriority: {
                        togglePin(notebook)
                    }
                )
            }
            // Immersive Full-Screen Reader (Modeled after bilingual-app)
            .fullScreenCover(item: $selectedReadingTarget) { target in
                ReaderView(notebook: target.notebook, initialPageIndex: target.pageIndex)
            }
            .task {
                await viewModel.loadNotebooks()
            }
        }
    }

    // MARK: - Actions

    private func reloadWithAnimation() async {
        withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
            rotationDegrees = 360
        }
        await viewModel.refresh()
        withAnimation(.spring()) {
            rotationDegrees = 0
        }
    }

    private func togglePin(_ notebook: Notebook) {
        if let idx = viewModel.notebooks.firstIndex(where: { $0.id == notebook.id }) {
            viewModel.notebooks[idx].isPinned.toggle()
            LocalStorageManager.shared.saveNotebooks(viewModel.notebooks)
        }
    }

    // MARK: - Empty State

    private var emptyLibraryState: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical.fill")
                .font(.system(size: 54))
                .foregroundColor(Color(hex: "475569"))

            Text("Tủ sách trống hoặc chưa đồng bộ")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.white)

            Text("Kéo xuống để đồng bộ danh sách sổ tay từ server\nhoặc tạo sổ tay mới trên ứng dụng web.")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "94a3b8"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(24)
    }
}

// MARK: - Offline Notice Banner

private struct OfflineNoticeBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 12, weight: .semibold))
            Text("Ngoại tuyến — hiển thị dữ liệu lưu cục bộ")
                .font(.system(size: 12, weight: .medium))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 6)
        .background(Color(hex: "d97706"))
        .clipShape(Capsule())
        .padding(.top, 8)
        .shadow(color: Color.black.opacity(0.3), radius: 6, y: 2)
    }
}

// MARK: - Category Chips Bar (Dark Slate Style)

private struct CategoryChipsBar: View {
    let categories: [String]
    @Binding var selectedCategory: String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // "Tất cả" chip
                chipButton(title: "Tất cả", isSelected: selectedCategory == "Tất cả") {
                    selectedCategory = "Tất cả"
                }

                ForEach(categories, id: \.self) { cat in
                    chipButton(title: cat, isSelected: selectedCategory == cat) {
                        selectedCategory = cat
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }

    private func chipButton(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            Text(title)
                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? .white : Color(hex: "94a3b8"))
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(isSelected ? Color(hex: "d97706") : Color(hex: "1e293b"))
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(isSelected ? Color.clear : Color.white.opacity(0.08), lineWidth: 1)
                )
        }
    }
}

#Preview {
    LibraryView()
        .environmentObject(AuthViewModel())
}
