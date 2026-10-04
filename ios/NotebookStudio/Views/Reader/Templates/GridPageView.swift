import SwiftUI

/// Square Grid Template View (P5-15)
/// Layout:
/// - Header: Topic, Date, No
/// - Canvas-drawn square grid background with content overlay
struct GridPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "▦",
                    purposeTitle: "SQUARE GRID NOTEBOOK",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                // Grid content area
                ZStack(alignment: .topLeading) {
                    SquareGridBackground(gridSpacing: 24, gridColor: settings.paperTone.lineColor)

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

/// Canvas-based square grid pattern background
struct SquareGridBackground: View {
    let gridSpacing: CGFloat
    let gridColor: Color

    var body: some View {
        Canvas { context, size in
            // Vertical lines
            var x: CGFloat = gridSpacing
            while x < size.width {
                var path = Path()
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                context.stroke(path, with: .color(gridColor.opacity(0.4)), lineWidth: 0.6)
                x += gridSpacing
            }

            // Horizontal lines
            var y: CGFloat = gridSpacing
            while y < size.height {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(path, with: .color(gridColor.opacity(0.4)), lineWidth: 0.6)
                y += gridSpacing
            }
        }
        .allowsHitTesting(false)
    }
}

#Preview {
    GridPageView(page: Page(
        id: "grid-1",
        template: .grid,
        title: "Tính toán kỹ thuật",
        topic: "Tính toán kỹ thuật",
        date: "04/10/2026",
        no: "01",
        content: "<p>Bản vẽ và sơ đồ thiết kế hệ thống.</p>"
    ))
}
