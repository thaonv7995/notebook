import SwiftUI
import UIKit

/// Main Reader View coordinating reading experience, navigation, chrome, and settings.
/// Modeled faithfully after bilingual-app ReaderView with dark slate desk, sleek ReaderHeaderView,
/// jump-to-page dialog, and realistic 3D book page curl animation.
struct ReaderView: View {
    let notebook: Notebook

    @State private var currentPageIndex: Int = 0
    @State private var isFullScreen: Bool = false
    @State private var isEditMode: Bool = false
    @State private var revision: Int = 0
    @State private var zoomScale: CGFloat = 1.0
    @State private var gestureZoomScale: CGFloat = 1.0

    // Jump to Page Dialog States (from bilingual-app)
    @State private var showJumpToPageDialog: Bool = false
    @State private var inputPageString: String = ""
    @FocusState private var isPageFieldFocused: Bool

    // Navigation and Modals
    @State private var showTOC: Bool = false
    @State private var showSettings: Bool = false
    @State private var showQuickNote: Bool = false
    @State private var showShareSheet: Bool = false
    @State private var shareText: String = ""

    @ObservedObject private var bookmarkStore = BookmarkStore.shared
    @ObservedObject private var readerSettings = ReaderSettings.shared
    @Environment(\.dismiss) private var dismiss

    /// Master gate for phone adaptation (matching bilingual-app)
    private let isPhone = UIDevice.current.userInterfaceIdiom == .phone

    /// Safe area insets from key window
    private var keyWindowSafeAreaInsets: UIEdgeInsets {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }?.safeAreaInsets ?? .zero
    }

    private var phoneTopInset: CGFloat { keyWindowSafeAreaInsets.top }
    private var phoneHorizontalInset: CGFloat {
        max(keyWindowSafeAreaInsets.left, keyWindowSafeAreaInsets.right)
    }

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

    var body: some View {
        GeometryReader { geometry in
            let isLandscape = geometry.size.width > geometry.size.height

            ZStack(alignment: .top) {
                // Dark Slate Desk Background (bilingual-app #0f172a)
                Color(hex: "0f172a")
                    .ignoresSafeArea()

                // Book Page Pager with 3D Page Curl Animation
                PageNavigationView(
                    pages: pages,
                    author: notebook.author,
                    currentPageIndex: $currentPageIndex,
                    zoomScale: $zoomScale,
                    isEditable: isEditMode,
                    revision: revision,
                    onToggleChrome: {
                        guard !isEditMode else { return }
                        withAnimation(.easeInOut(duration: 0.22)) {
                            isFullScreen.toggle()
                        }
                    }
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
                // Layout geometry from bilingual-app
                .padding(.top, isPhone && !isFullScreen ? phoneTopInset + 49 : 0)
                .padding(.horizontal, isPhone && isLandscape ? phoneHorizontalInset : 0)
                .scaleEffect(isFullScreen || isPhone ? 1.0 : 0.94)
                .offset(y: isFullScreen || isPhone ? 0 : 20)
                .clipShape(RoundedRectangle(cornerRadius: isFullScreen || isPhone ? 0 : 16, style: .continuous))
                .shadow(color: Color.black.opacity(isFullScreen || isPhone ? 0 : 0.4), radius: isFullScreen || isPhone ? 0 : 20, x: 0, y: 10)

                // Sleek Top Header (matching bilingual-app ReaderHeaderView)
                if !isFullScreen {
                    VStack(spacing: 0) {
                        ReaderChromeView(
                            title: notebook.title,
                            currentPageIndex: currentPageIndex,
                            totalPages: pages.count,
                            isBookmarked: isCurrentPageBookmarked,
                            isEditMode: isEditMode,
                            onBack: {
                                dismiss()
                            },
                            onToggleBookmark: {
                                toggleBookmark()
                            },
                            onToggleEditMode: {
                                toggleEditMode()
                            },
                            onOpenJumpToPage: {
                                inputPageString = "\(currentPageIndex + 1)"
                                showJumpToPageDialog = true
                            },
                            onOpenTOC: {
                                showTOC = true
                            },
                            onOpenSettings: {
                                showSettings = true
                            },
                            onOpenQuickNote: {
                                showQuickNote = true
                            },
                            onShare: {
                                if let current = currentPage {
                                    shareText = ShareSheetManager.shared.formatPageForSharing(
                                        notebook: notebook,
                                        page: current,
                                        pageIndex: currentPageIndex
                                    )
                                    showShareSheet = true
                                }
                            }
                        )
                        .padding(.top, isPhone ? max(5, phoneTopInset) : 5)
                        .padding(.horizontal, isPhone && isLandscape ? phoneHorizontalInset : 0)

                        // Editing indicator bar
                        if isEditMode {
                            HStack(spacing: 6) {
                                Image(systemName: "pencil.line")
                                    .font(.system(size: 11, weight: .semibold))
                                Text("Đang ở chế độ chỉnh sửa • Chạm vào nội dung để gõ hoặc đánh dấu")
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(Color(hex: "f59e0b"))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 5)
                            .background(Color(hex: "1e293b"))
                            .cornerRadius(6)
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(hex: "f59e0b").opacity(0.35), lineWidth: 1))
                            .padding(.top, 4)
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color(hex: "0f172a"))
        .statusBarHidden(true)
        .ignoresSafeArea()
        .onAppear {
            initProgress()
        }
        .onChange(of: currentPageIndex) { _, newIndex in
            saveProgress(pageIndex: newIndex)
        }
        .overlay {
            if showJumpToPageDialog {
                jumpToPageDialogView()
            }
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
        .sheet(isPresented: $showQuickNote) {
            if let current = currentPage {
                QuickNoteSheet(
                    pageTopic: current.topic ?? current.title ?? "Trang \(currentPageIndex + 1)",
                    text: .constant(""),
                    onSave: { note in
                        print("[QuickNote] Đã lưu note: \(note)")
                    }
                )
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ActivityView(activityItems: [shareText])
        }
    }

    // MARK: - Jump To Page Dialog (from bilingual-app)

    private func jumpToPageDialogView() -> some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture {
                    showJumpToPageDialog = false
                }

            VStack(spacing: 20) {
                Text("Đi tới trang")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Text("Nhập số trang từ 1 đến \(pages.count)")
                    .font(.system(size: 13))
                    .foregroundColor(.gray)

                HStack {
                    TextField("", text: $inputPageString)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.vertical, 8)
                        .background(Color(hex: "0f172a"))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                        .focused($isPageFieldFocused)
                        .frame(width: 120)
                }

                HStack(spacing: 16) {
                    Button(action: {
                        showJumpToPageDialog = false
                    }) {
                        Text("Hủy")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color(hex: "0f172a"))
                            .cornerRadius(6)
                    }

                    Button(action: {
                        if let targetPage = Int(inputPageString.trimmingCharacters(in: .whitespacesAndNewlines)) {
                            let clampedPage = max(1, min(pages.count, targetPage))
                            currentPageIndex = clampedPage - 1
                            showJumpToPageDialog = false
                        }
                    }) {
                        Text("Đi tiếp")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color(hex: "d97706"))
                            .cornerRadius(6)
                    }
                }
            }
            .padding(24)
            .background(Color(hex: "1e293b"))
            .cornerRadius(12)
            .frame(maxWidth: 320)
            .shadow(color: Color.black.opacity(0.5), radius: 20, x: 0, y: 10)
        }
        .onAppear {
            isPageFieldFocused = true
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
        WidgetDataProvider.shared.updateCurrentReading(
            notebookTitle: notebook.title,
            pageIndex: pageIndex,
            totalPages: pages.count
        )
    }

    private func toggleBookmark() {
        guard let page = currentPage else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        bookmarkStore.toggle(notebookId: notebook.id, pageId: page.id)
    }

    private func toggleEditMode() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            isEditMode.toggle()
            revision += 1
            if isEditMode {
                isFullScreen = false
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
