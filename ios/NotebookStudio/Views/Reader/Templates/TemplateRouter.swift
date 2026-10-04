import SwiftUI

/// Routes a Page to its specific native template view (P5-18).
/// Supports all 10 templates with fallback to RuledPageView.
struct TemplateRouter: View {
    let page: Page

    var body: some View {
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
