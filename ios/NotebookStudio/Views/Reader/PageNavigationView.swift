import SwiftUI

/// Page container with 3D book page curl animation, haptic feedback, and reading/edit mode support.
/// Integrates BookPagerView (inspired by bilingual-app) for realistic page flipping with double-sided support.
struct PageNavigationView: View {
    let pages: [Page]
    var author: String? = "@thaonv"
    var fontFamily: String? = nil
    @Binding var currentPageIndex: Int
    @Binding var zoomScale: CGFloat
    var isEditable: Bool = false
    var isDoubleSided: Bool = false
    var revision: Int = 0
    var onToggleChrome: (() -> Void)? = nil

    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ZStack {
            BookPagerView(
                pageCount: max(1, pages.count),
                currentPage: $currentPageIndex,
                transitionStyle: settings.pageTransitionStyle.uiTransitionStyle,
                isDoubleSided: isDoubleSided,
                revision: revision
            ) { index in
                if index >= 0 && index < pages.count {
                    TemplateRouter(
                        page: pages[index],
                        author: author,
                        pageNumber: index + 1,
                        fontFamily: fontFamily,
                        isEditable: isEditable,
                        onToggleChrome: onToggleChrome
                    )
                    .scaleEffect(index == currentPageIndex ? zoomScale : 1.0)
                }
            }
            .id("pager_\(settings.pageTransitionStyle.rawValue)_\(isDoubleSided)")

            // 3D Book Center Spine Shadow in Double-Sided mode (matching bilingual-app)
            if isDoubleSided && settings.pageTransitionStyle == .pageCurl {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.black.opacity(0.0),
                        Color.black.opacity(0.04),
                        Color.black.opacity(0.18),
                        Color.black.opacity(0.04),
                        Color.black.opacity(0.0)
                    ]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: 48)
                .allowsHitTesting(false)
            }
        }
        .onChange(of: currentPageIndex) { oldVal, newVal in
            if oldVal != newVal {
                // Reset zoom on page flip
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    zoomScale = 1.0
                }
            }
        }
    }
}

#Preview {
    PageNavigationView(
        pages: [
            Page(id: "p1", template: .cornell, title: "Trang 1"),
            Page(id: "p2", template: .work, title: "Trang 2")
        ],
        author: "@thaonv",
        currentPageIndex: .constant(0),
        zoomScale: .constant(1.0)
    )
}
