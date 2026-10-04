import SwiftUI

/// Reading Notes Template View (P5-13)
/// Layout:
/// - Header: Book/Article, Date, Ch. (Chapter)
/// - Split: Key Ideas & Takeaways | Quotes & Highlights
/// - Bottom: Summary & Personal Reflection
struct ReadingPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "📖",
                    purposeTitle: "READING NOTES",
                    topicLabel: "BOOK / ARTICLE:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    numberLabel: "CH."
                )

                // 2 Columns Split
                HStack(alignment: .top, spacing: 0) {
                    // Left: Key Ideas
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        badge(title: "KEY IDEAS & TAKEAWAYS", icon: "lightbulb", color: .yellow)
                        RichTextView(html: page.cues)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(DesignTokens.spacingMD)
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(width: 1.5)

                    // Right: Quotes & Highlights
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        badge(title: "QUOTES & HIGHLIGHTS", icon: "quote.bubble", color: .purple)
                        RichTextView(html: (page.notes?.isEmpty ?? true) ? page.content : page.notes)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(DesignTokens.spacingMD)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(minHeight: 280)

                // Bottom: Summary & Reflection
                Rectangle()
                    .fill(settings.paperTone.lineColor)
                    .frame(height: 1.5)

                VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                    badge(title: "SUMMARY & PERSONAL REFLECTION", icon: "sparkles", color: DesignTokens.accentLight)
                    RichTextView(html: page.summary)
                }
                .padding(DesignTokens.spacingLG)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
        .background(settings.paperTone.backgroundColor)
    }

    private func badge(title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .bold))
            Text(title)
                .font(.jakartaSans(size: 9, weight: .bold))
                .tracking(0.8)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 4))
    }
}

#Preview {
    ReadingPageView(page: Page(
        id: "read-1",
        template: .reading,
        title: "Atomic Habits",
        topic: "Atomic Habits — James Clear",
        date: "04/10/2026",
        no: "03",
        cues: "<p>• Quy luật 1%: Mỗi ngày tiến bộ 1% thì sau 1 năm tăng 37 lần.</p><p>• Tập trung vào hệ thống thay vì chỉ mục tiêu.</p>",
        notes: "<blockquote>\"You do not rise to the level of your goals. You fall to the level of your systems.\"</blockquote>",
        summary: "<p>Cuốn sách thực tế và sâu sắc về tâm lý hành vi con người. Áp dụng ngay việc thiết lập thói quen code mỗi sáng.</p>"
    ))
}
