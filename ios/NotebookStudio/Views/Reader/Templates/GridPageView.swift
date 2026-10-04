import SwiftUI

/// Square Grid Template View (P5-15)
/// Matches web `grid-template-sheet` & `grid-container`:
/// - Header: Grid Notebook purpose badge, Subject/Topic underline, Date, No
/// - Full-canvas box with 1.5pt border and 20pt square grid pattern
struct GridPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "GRID NOTEBOOK", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "☵",
                    purposeTitle: "GRID NOTEBOOK",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "GRID ARCHIVE"
                )

                // Grid canvas with 1.5pt border
                ZStack(alignment: .topLeading) {
                    SquareGridBackground(gridSpacing: 20, gridColor: settings.paperTone.lineColor)

                    RichTextView(html: page.content)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                }
                .frame(minHeight: 460)
                .overlay(
                    Rectangle()
                        .stroke(settings.paperTone.lineColor, lineWidth: 1.5)
                )
            }
        }
    }
}

/// Canvas-based square grid pattern background matching web 20px grid
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
        title: "Tính toán & Biểu đồ",
        topic: "Tính toán & Biểu đồ",
        date: "04/10/2026",
        no: "01",
        content: "<p>f(x) = ax^2 + bx + c</p>"
    ))
}
