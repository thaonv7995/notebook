import SwiftUI

/// Cornell Notes Template View (P5-8)
/// Layout:
/// - Header: Subject/Topic, Date, No
/// - 2 Columns: Cues & Questions (left) | Notes & Details (right)
/// - Bottom: Summary & Synthesis
struct CornellPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "✦",
                    purposeTitle: "STUDY JOURNAL",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                // Cornell 2-column Body
                HStack(alignment: .top, spacing: 0) {
                    // Left Column: Cues & Questions
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        sectionBadge(title: "CUES & QUESTIONS", icon: "questionmark.circle")

                        RichTextView(html: page.cues, customFontSize: CGFloat(settings.fontSize - 1))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(width: 130)
                    .padding(DesignTokens.spacingMD)

                    // Vertical dividing line
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(width: 1.5)

                    // Right Column: Notes & Details
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        sectionBadge(title: "NOTES & DETAILS", icon: "note.text")

                        RichTextView(html: (page.notes?.isEmpty ?? true) ? page.content : page.notes)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(DesignTokens.spacingMD)
                }
                .frame(minHeight: 280)

                // Horizontal dividing line
                Rectangle()
                    .fill(settings.paperTone.lineColor)
                    .frame(height: 1.5)

                // Bottom Section: Summary & Synthesis
                VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                    sectionBadge(title: "SUMMARY & SYNTHESIS", icon: "sparkles")

                    RichTextView(html: page.summary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(DesignTokens.spacingLG)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
        .background(settings.paperTone.backgroundColor)
    }

    private func sectionBadge(title: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .bold))
            Text(title)
                .font(.jakartaSans(size: 10, weight: .bold))
                .tracking(1.0)
        }
        .foregroundStyle(DesignTokens.accentLight)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(DesignTokens.accentLight.opacity(0.1), in: RoundedRectangle(cornerRadius: 4))
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
