import SwiftUI

/// Cornell Notes Template View (P5-8)
/// Matches web `cornell-container`:
/// - Header: Subject/Topic underline, Date, No, Author seal
/// - 2 Columns: Cues & Questions (left) | Notes & Details (right) with 28pt ruled lines
/// - Bottom: Summary & Synthesis with ruled lines
struct CornellPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "CORNELL SYSTEM", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Functional Header
                TemplateHeaderView(
                    purposeIcon: "✦",
                    purposeTitle: "STUDY JOURNAL",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "STUDY ARCHIVE"
                )

                // Cornell Container with 1.5pt crisp border
                VStack(spacing: 0) {
                    // Split Body: Cues (left) + Notes (right)
                    HStack(alignment: .top, spacing: 0) {
                        // Left Column: Cues & Questions (30%)
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "CUES & QUESTIONS")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: page.cues, customFontSize: CGFloat(settings.fontSize - 1.5))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 280)
                        }
                        .frame(width: 110)

                        // Vertical dividing line
                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        // Right Column: Notes & Details (70%)
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "NOTES")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: (page.notes?.isEmpty ?? true) ? page.content : page.notes)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 280)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Horizontal dividing line
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Bottom Section: Summary & Synthesis
                    VStack(alignment: .leading, spacing: 0) {
                        ColumnGuideBar(title: "SUMMARY & SYNTHESIS")

                        ZStack(alignment: .topLeading) {
                            RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                            RichTextView(html: page.summary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                        }
                        .frame(minHeight: 85)
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
    CornellPageView(page: Page(
        id: "preview-1",
        template: .cornell,
        title: "SwiftUI Architecture",
        topic: "SwiftUI Architecture",
        date: "04/10/2026",
        no: "01",
        cues: "<p>• @State vs @Binding?</p><p>• MVVM vs TCA?</p>",
        notes: "<h2>Kiến trúc SwiftUI</h2><p>SwiftUI sử dụng mô hình khai báo (declarative UI). State thay đổi thì UI tự render lại.</p>",
        summary: "<p>Nắm vững luồng dữ liệu một chiều (Unidirectional Data Flow) là chìa khóa xây dựng app SwiftUI chất lượng cao.</p>"
    ))
}
