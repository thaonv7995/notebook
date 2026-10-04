import SwiftUI

/// Dot Grid Template View (P5-14)
/// Layout:
/// - Header: Topic, Date, No
/// - Canvas-drawn dot grid background pattern with content overlay
struct DotGridPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "✦",
                    purposeTitle: "DOT GRID JOURNAL",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                // Dot grid content area
                ZStack(alignment: .topLeading) {
                    DotGridBackground(dotSpacing: 24, dotColor: settings.paperTone.lineColor)

                    RichTextView(html: page.content)
                        .padding(.horizontal, DesignTokens.spacingLG)
                        .padding(.vertical, DesignTokens.spacingLG)
                }
                .frame(minHeight: 480)
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
        .background(settings.paperTone.backgroundColor)
    }
}

/// Canvas-based dot grid pattern background
struct DotGridBackground: View {
    let dotSpacing: CGFloat
    let dotColor: Color

    var body: some View {
        Canvas { context, size in
            var x: CGFloat = dotSpacing
            while x < size.width {
                var y: CGFloat = dotSpacing
                while y < size.height {
                    let rect = CGRect(x: x - 1, y: y - 1, width: 2, height: 2)
                    context.fill(Path(ellipseIn: rect), with: .color(dotColor.opacity(0.8)))
                    y += dotSpacing
                }
                x += dotSpacing
            }
        }
        .allowsHitTesting(false)
    }
}

#Preview {
    DotGridPageView(page: Page(
        id: "dot-1",
        template: .dotgrid,
        title: "Bullet Journal",
        topic: "Bullet Journal Plan",
        date: "04/10/2026",
        no: "01",
        content: "<p>• Task 1: Thiết kế giao diện dot grid</p><p>• Task 2: Kiểm thử hiệu năng Canvas</p>"
    ))
}
