import SwiftUI

/// Eisenhower Priority Matrix Template View (P5-17)
/// Layout:
/// - Header: Goal/Context, Date, No
/// - 4 Quadrants (2x2 grid):
///   - Q1: DO FIRST (Urgent & Important)
///   - Q2: SCHEDULE (Important, Not Urgent)
///   - Q3: DELEGATE (Urgent, Not Important)
///   - Q4: ELIMINATE (Not Urgent, Not Important)
struct EisenhowerPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "⚡",
                    purposeTitle: "EISENHOWER MATRIX",
                    topicLabel: "GOAL / CONTEXT:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                // 2x2 Quadrants Grid
                let q = page.quadrants ?? Quadrants(q1: "", q2: "", q3: "", q4: "")

                VStack(spacing: 0) {
                    // Row 1: Do First (Q1) | Schedule (Q2)
                    HStack(alignment: .top, spacing: 0) {
                        quadrantCell(
                            title: "DO FIRST",
                            subtitle: "Urgent & Important",
                            badgeColor: .red,
                            icon: "exclamationmark.circle.fill",
                            html: q.q1
                        )

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        quadrantCell(
                            title: "SCHEDULE",
                            subtitle: "Important, Not Urgent",
                            badgeColor: .orange,
                            icon: "calendar.badge.clock",
                            html: q.q2
                        )
                    }

                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Row 2: Delegate (Q3) | Eliminate (Q4)
                    HStack(alignment: .top, spacing: 0) {
                        quadrantCell(
                            title: "DELEGATE",
                            subtitle: "Urgent, Not Important",
                            badgeColor: .blue,
                            icon: "person.2.fill",
                            html: q.q3
                        )

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        quadrantCell(
                            title: "ELIMINATE",
                            subtitle: "Not Urgent, Not Important",
                            badgeColor: .gray,
                            icon: "trash.fill",
                            html: q.q4
                        )
                    }
                }
                .frame(minHeight: 460)
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
        .background(settings.paperTone.backgroundColor)
    }

    private func quadrantCell(
        title: String,
        subtitle: String,
        badgeColor: Color,
        icon: String,
        html: String
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: icon)
                        .font(.system(size: 9, weight: .bold))
                    Text(title)
                        .font(.jakartaSans(size: 10, weight: .bold))
                        .tracking(1.0)
                }
                .foregroundStyle(badgeColor)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(badgeColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 4))

                Text(subtitle)
                    .font(.jakartaSans(size: 9))
                    .foregroundStyle(settings.paperTone.secondaryColor)
            }

            RichTextView(html: html, customFontSize: CGFloat(settings.fontSize - 2))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(DesignTokens.spacingMD)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    EisenhowerPageView(page: Page(
        id: "quad-1",
        template: .quadrant,
        title: "Sprint Goals",
        topic: "Ưu tiên công việc tuần",
        date: "04/10/2026",
        no: "01",
        quadrants: Quadrants(
            q1: "<p>• Fix crash login</p><p>• Release Phase 5 Reader View</p>",
            q2: "<p>• Refactor search engine</p><p>• Lên kế hoạch Widget iOS</p>",
            q3: "<p>• Trả lời email thường nhật</p>",
            q4: "<p>• Lướt mạng xã hội vô bổ</p>"
        )
    ))
}
