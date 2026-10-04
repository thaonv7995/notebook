import SwiftUI

/// Routes a Page to its template rendering engine (P5-18).
/// Defaults to `WebTemplatePageView` which provides 100% pixel-identical web rendering:
/// exact A4 sheet size, format, style, vector royal corner frames, edge notches, and fonts.
struct TemplateRouter: View {
    let page: Page
    var author: String? = "@thaonv"
    var pageNumber: Int = 1
    var isEditable: Bool = false
    var onToggleChrome: (() -> Void)? = nil

    @AppStorage("use_native_renderer") private var useNativeRenderer: Bool = false

    var body: some View {
        if useNativeRenderer {
            nativeView
        } else {
            WebTemplatePageView(
                page: page,
                author: author,
                pageNum: pageNumber,
                isEditable: isEditable,
                onToggleChrome: onToggleChrome
            )
        }
    }

    @ViewBuilder
    private var nativeView: some View {
        switch page.template {
        case .cornell:
            CornellPageView(page: page)
        case .work:
            WorkPageView(page: page)
        case .ruled:
            RuledPageView(page: page)
        case .vocab:
            VocabPageView(page: page)
        case .charting:
            ChartingPageView(page: page)
        case .reading:
            ReadingPageView(page: page)
        case .dotgrid:
            DotGridPageView(page: page)
        case .grid:
            GridPageView(page: page)
        case .blank:
            BlankPageView(page: page)
        case .quadrant:
            EisenhowerPageView(page: page)
        }
    }
}

#Preview {
    TemplateRouter(page: Page(
        id: "sample-preview",
        template: .cornell,
        title: "Sample Page",
        content: "<p>Nội dung mẫu</p>"
    ))
}
