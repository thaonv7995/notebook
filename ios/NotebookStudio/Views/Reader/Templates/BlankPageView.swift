import SwiftUI

/// Blank / Freeform Page Template View (P5-16)
/// Matches web `blank-template-sheet` & `blank-container`:
/// - Header: Blank Sheet purpose badge, Subject/Topic underline, Date, No
/// - Clean full-canvas box with 1.5pt crisp border and undisturbed paper surface
struct BlankPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "BLANK NOTEBOOK", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "◻",
                    purposeTitle: "BLANK SHEET",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "FREEFORM ARCHIVE"
                )

                // Clean Canvas with 1.5pt border
                ZStack(alignment: .topLeading) {
                    RichTextView(html: page.content)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                }
                .frame(minHeight: 460, alignment: .topLeading)
                .overlay(
                    Rectangle()
                        .stroke(settings.paperTone.lineColor, lineWidth: 1.5)
                )
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
