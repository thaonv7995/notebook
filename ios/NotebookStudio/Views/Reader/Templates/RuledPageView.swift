import SwiftUI

/// Ruled Notebook Page Template View (P5-10)
/// Layout:
/// - Header: Topic, Date, No
/// - Full-width content area with authentic ruled horizontal lines background
struct RuledPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "📝",
                    purposeTitle: "NOTEBOOK",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                // Ruled lines content area
                ZStack(alignment: .topLeading) {
                    // Background lined pattern
                    RuledLinesBackground(lineSpacing: 28, lineColor: settings.paperTone.lineColor)

                    // Foreground content
                    RichTextView(html: page.content, customLineSpacing: 8)
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

/// Draws subtle horizontal ruled lines
struct RuledLinesBackground: View {
    let lineSpacing: CGFloat
    let lineColor: Color

    var body: some View {
        Canvas { context, size in
            var y: CGFloat = lineSpacing
            while y < size.height {
                var path = Path()
                path.move(to: CGPoint(x: 16, y: y))
                path.addLine(to: CGPoint(x: size.width - 16, y: y))
                context.stroke(path, with: .color(lineColor.opacity(0.6)), lineWidth: 0.8)
                y += lineSpacing
            }
        }
        .allowsHitTesting(false)
    }
}

#Preview {
    RuledPageView(page: Page(
        id: "ruled-1",
        template: .ruled,
        title: "Ghi chú hằng ngày",
        topic: "Ghi chú hằng ngày",
        date: "04/10/2026",
        no: "01",
        content: "<p>Hôm nay tập trung phát triển bộ template đọc sách cho app Notebook Studio trên iOS.</p><p>Sử dụng Canvas API vẽ nền dòng kẻ mượt mà.</p>"
    ))
}
