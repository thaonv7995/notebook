import SwiftUI

/// Main Reader View coordinating reading experience, navigation, chrome, and settings (P5-1).
struct ReaderView: View {
    let notebook: Notebook

    @State private var currentPageIndex: Int = 0
    @State private var isChromeVisible: Bool = true
    @State private var zoomScale: CGFloat = 1.0
    @State private var gestureZoomScale: CGFloat = 1.0

    @State private var showTOC: Bool = false
    @State private var showSettings: Bool = false
    @State private var autoHideTask: Task<Void, Never>? = nil

    @ObservedObject private var bookmarkStore = BookmarkStore.shared
    @ObservedObject private var readerSettings = ReaderSettings.shared
    @Environment(\.dismiss) private var dismiss

    private var pages: [Page] {
        notebook.pages.isEmpty ? [Page(id: "empty-1", template: .blank, title: "Trang trống")] : notebook.pages
    }

    private var currentPage: Page? {
        guard currentPageIndex >= 0 && currentPageIndex < pages.count else { return nil }
        return pages[currentPageIndex]
    }

    private var isCurrentPageBookmarked: Bool {
        guard let page = currentPage else { return false }
        return bookmarkStore.isBookmarked(pageId: page.id)
    }

    private var pageTitles: [String] {
        pages.map { ($0.topic ?? $0.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }
    }

    var body: some View {
        ZStack(alignment: .top) {
            // Paper Background
            readerSettings.paperTone.backgroundColor
                .ignoresSafeArea()

            // Page Content with Tap Gesture & Pinch-to-Zoom
            PageNavigationView(
                pages: pages,
                currentPageIndex: $currentPageIndex,
                zoomScale: $zoomScale
            )
            .scaleEffect(gestureZoomScale)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        gestureZoomScale = max(0.9, min(2.5, value))
                    }
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            zoomScale = max(1.0, min(2.0, gestureZoomScale))
                            gestureZoomScale = 1.0
                        }
                    }
            )
            .onTapGesture {
                withAnimation(.easeInOut(duration: DesignTokens.animationNormal)) {
                    isChromeVisible.toggle()
                }
                if isChromeVisible {
                    scheduleAutoHide()
                }
            }

            // Top Bar Chrome
            if isChromeVisible {
                VStack {
                    ReaderChromeView(
                        title: notebook.title,
                        currentPageIndex: currentPageIndex,
                        totalPages: pages.count,
                        isBookmarked: isCurrentPageBookmarked,
                        onBack: {
                            dismiss()
                        },
                        onToggleBookmark: {
                            toggleBookmark()
                        },
                        onOpenTOC: {
                            showTOC = true
                        },
                        onOpenSettings: {
                            showSettings = true
                        }
                    )
                    .transition(.move(edge: .top).combined(with: .opacity))

                    Spacer()

                    // Bottom Page Scrubber
                    PageScrubberView(
                        currentPageIndex: $currentPageIndex,
                        totalPages: pages.count,
                        pageTitles: pageTitles
                    )
                    .padding(.bottom, DesignTokens.spacingMD)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .navigationBarHidden(true)
        .statusBarHidden(!isChromeVisible)
        .onAppear {
            initProgress()
            scheduleAutoHide()
        }
        .onChange(of: currentPageIndex) { _, newIndex in
            saveProgress(pageIndex: newIndex)
            scheduleAutoHide()
        }
        .sheet(isPresented: $showTOC) {
            TableOfContentsView(
                notebook: notebook,
                currentPageIndex: $currentPageIndex
            )
        }
        .sheet(isPresented: $showSettings) {
            ReaderSettingsSheet()
        }
    }

    // MARK: - Actions

    private func initProgress() {
        let savedIndex = ReadingProgressStore.shared.lastPageIndex(for: notebook.id)
        if savedIndex > 0 && savedIndex < pages.count {
            currentPageIndex = savedIndex
        } else if notebook.lastPageIndex > 0 && notebook.lastPageIndex < pages.count {
            currentPageIndex = notebook.lastPageIndex
        }
    }

    private func saveProgress(pageIndex: Int) {
        ReadingProgressStore.shared.saveProgress(
            notebookId: notebook.id,
            pageIndex: pageIndex,
            totalPages: pages.count
        )
    }

    private func toggleBookmark() {
        guard let page = currentPage else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        bookmarkStore.toggle(notebookId: notebook.id, pageId: page.id)
    }

    private func scheduleAutoHide() {
        autoHideTask?.cancel()
        autoHideTask = Task {
            try? await Task.sleep(nanoseconds: 3_500_000_000) // 3.5s
            if !Task.isCancelled {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: DesignTokens.animationNormal)) {
                        isChromeVisible = false
                    }
                }
            }
        }
    }
}

#Preview {
    ReaderView(notebook: Notebook(
        id: "preview-nb",
        title: "Sổ tay nghiên cứu SwiftUI",
        pages: [
            Page(id: "p1", template: .cornell, title: "Trang 1: Kiến trúc MVVM"),
            Page(id: "p2", template: .work, title: "Trang 2: Sprint Board"),
            Page(id: "p3", template: .vocab, title: "Trang 3: Từ vựng chuyên ngành")
        ]
    ))
}
