import SwiftUI

/// Page container with swipe navigation, haptic feedback, and pinch-to-zoom (P5-4, P5-5, P5-21).
struct PageNavigationView: View {
    let pages: [Page]
    @Binding var currentPageIndex: Int
    @Binding var zoomScale: CGFloat

    @State private var lastReportedIndex: Int = 0

    var body: some View {
        TabView(selection: $currentPageIndex) {
            ForEach(Array(pages.enumerated()), id: \.element.id) { index, page in
                TemplateRouter(page: page)
                    .tag(index)
                    .scaleEffect(index == currentPageIndex ? zoomScale : 1.0)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .onChange(of: currentPageIndex) { oldVal, newVal in
            if oldVal != newVal {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
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
        currentPageIndex: .constant(0),
        zoomScale: .constant(1.0)
    )
}
