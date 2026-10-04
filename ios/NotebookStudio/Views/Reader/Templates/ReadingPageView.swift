import SwiftUI

/// Reading Notes Template View (P5-13)
/// Matches web `reading-container`:
/// - Header: Book/Article, Date, Ch. (Chapter), Book Archive seal
/// - 2 Columns: Key Ideas & Takeaways (left 50%) | Quotes & Highlights (right 50%) on ruled lines
/// - Bottom Area: Summary & Personal Reflection on ruled lines
struct ReadingPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "READING NOTES", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "📖",
                    purposeTitle: "READING NOTES",
                    topicLabel: "BOOK / ARTICLE:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    numberLabel: "CH.",
                    author: "@thaonv",
                    sealSubLabel: "BOOK ARCHIVE"
                )

                // Reading Container with 1.5pt crisp border
                VStack(spacing: 0) {
                    // Split Body: 2 Columns
                    HStack(alignment: .top, spacing: 0) {
                        // Left: Key Ideas
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "KEY IDEAS & TAKEAWAYS")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: page.cues, customFontSize: CGFloat(settings.fontSize - 1))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 260)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        // Vertical dividing line
                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        // Right: Quotes & Highlights
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "QUOTES & HIGHLIGHTS")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: (page.notes?.isEmpty ?? true) ? page.content : page.notes, customFontSize: CGFloat(settings.fontSize - 1))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 260)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Horizontal dividing line
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Bottom: Summary & Reflection
                    VStack(alignment: .leading, spacing: 0) {
                        ColumnGuideBar(title: "SUMMARY & PERSONAL REFLECTION")

                        ZStack(alignment: .topLeading) {
                            RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                            RichTextView(html: page.summary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                        }
                        .frame(minHeight: 90)
                    }
                }
                .overlay(
                    Rectangle()
                        .stroke(settings.paperTone.lineColor, lineWidth: 1.5)
                )
            }
        }
    }
}

#Preview {
    ReadingPageView(page: Page(
        id: "reading-1",
        template: .reading,
        title: "Sapiens - Lược sử loài người",
        topic: "Sapiens - Lược sử loài người",
        date: "04/10/2026",
        no: "01",
        cues: "<p>• Cách mạng nhận thức là bước ngoặt quan trọng nhất của loài người.</p><p>• Ngôn ngữ hư cấu giúp kết nối hàng triệu người xa lạ.</p>",
        notes: "<blockquote>Không một loài vật nào khác có thể tin vào những thứ không có thật như thần linh, tiền tệ, hoặc quốc gia.</blockquote>",
        summary: "<p>Cuốn sách mở ra góc nhìn hoàn toàn mới về cách xã hội loài người được tổ chức và phát triển dựa trên những câu chuyện hư cấu chung.</p>"
    ))
}
