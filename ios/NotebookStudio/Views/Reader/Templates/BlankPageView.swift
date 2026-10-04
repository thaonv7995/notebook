import SwiftUI

/// Blank / Freeform Page Template View (P5-16)
/// Layout:
/// - Header: Topic, Date, No
/// - Clean, undisturbed paper surface with rich content
struct BlankPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "FREEFORM SYSTEM", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "📄",
                    purposeTitle: "FREEFORM NOTEBOOK",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "FREEFORM ARCHIVE"
                )

                // Clean content area
                RichTextView(html: page.content)
                    .padding(.horizontal, DesignTokens.spacingLG)
                    .padding(.vertical, DesignTokens.spacingLG)
                    .frame(minHeight: 480, alignment: .topLeading)
            }
        }
    }
}

#Preview {
    BlankPageView(page: Page(
        id: "blank-1",
        template: .blank,
        title: "Tự do sáng tạo",
        topic: "Ý tưởng tự do",
        date: "04/10/2026",
        no: "01",
        content: "<h2>Trang giấy trắng</h2><p>Không gian tự do để ghi lại bất kỳ suy nghĩ hay phác thảo nào.</p>"
    ))
}
