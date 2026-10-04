import SwiftUI

/// Dot Grid Template View (P5-14)
/// Matches web `dotgrid-template-sheet` & `dotgrid-container`:
/// - Header: Dot Grid purpose badge, Subject/Topic underline, Date, No
/// - Full-canvas box with 1.5pt border and 20pt dot matrix pattern
struct DotGridPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "DOT GRID NOTEBOOK", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "☷",
                    purposeTitle: "DOT GRID JOURNAL",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "DOT GRID ARCHIVE"
                )

                // Dot grid canvas with 1.5pt border
                ZStack(alignment: .topLeading) {
                    DotGridBackground(dotSpacing: 20, dotColor: settings.paperTone.lineColor)

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

/// Canvas-based dot grid pattern background matching web radial-gradient
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
                    context.fill(Path(ellipseIn: rect), with: .color(dotColor.opacity(0.75)))
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
        id: "dotgrid-1",
        template: .dotgrid,
        title: "Bullet Journal Ideas",
        topic: "Bullet Journal Ideas",
        date: "04/10/2026",
        no: "01",
        content: "<p>• Task Tracker</p><p>• Habit Loop</p>"
    ))
}
