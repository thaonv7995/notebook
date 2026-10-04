import SwiftUI

/// Ruled Notebook Page Template View (P5-10)
/// Matches web `ruled-template-sheet` & `ruled-full-canvas`:
/// - Header: General Notebook purpose badge, Topic underline, Date, No
/// - Full-canvas box with 1.5pt border, red vertical margin line, and 28pt horizontal ruled lines
struct RuledPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "RULED NOTEBOOK", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "✍️",
                    purposeTitle: "GENERAL NOTEBOOK",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "STUDY ARCHIVE"
                )

                // Ruled Full Canvas with 1.5pt border
                ZStack(alignment: .topLeading) {
                    // Ruled Background with red vertical margin
                    RuledBackgroundView(
                        lineHeight: 28,
                        lineColor: settings.paperTone.lineColor.opacity(0.55),
                        showRedMargin: true,
                        redMarginX: 36
                    )

                    // Foreground Content
                    RichTextView(html: page.content, customLineSpacing: 8)
                        .padding(.leading, 44) // Right of red margin line
                        .padding(.trailing, 12)
                        .padding(.vertical, 8)
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

#Preview {
    RuledPageView(page: Page(
        id: "ruled-1",
        template: .ruled,
        title: "Ghi chép tự do",
        topic: "Ghi chép tự do",
        date: "04/10/2026",
        no: "01",
        content: "<p>Hôm nay bắt đầu xây dựng dự án Notebook Studio cho hệ điều hành iOS.</p><p>Sử dụng SwiftUI khai báo giao diện kết hợp cùng phong cách sổ tay cổ điển authentic.</p>"
    ))
}
