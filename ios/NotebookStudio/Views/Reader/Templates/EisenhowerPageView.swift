import SwiftUI

/// Eisenhower Priority Matrix Template View (P5-17)
/// Matches web `eisenhower-container`:
/// - Header: Goal/Context, Date, No, Author seal
/// - Top Axis Labels: ← URGENT | NOT URGENT →
/// - 4 Quadrants (2x2 grid) with colored guide badges on 26pt ruled lines:
///   - Q1: 🔴 DO FIRST — Urgent & Important
///   - Q2: 🟡 SCHEDULE — Important, Not Urgent
///   - Q3: 🟠 DELEGATE — Urgent, Not Important
///   - Q4: ⚪ ELIMINATE — Not Urgent, Not Important
struct EisenhowerPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "EISENHOWER MATRIX", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "⚡",
                    purposeTitle: "EISENHOWER MATRIX",
                    topicLabel: "GOAL / CONTEXT:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "PRIORITY PLANNER"
                )

                // Eisenhower Container with 1.5pt crisp border
                VStack(spacing: 0) {
                    // Axis Labels matching web .eisenhower-axis-labels
                    HStack {
                        Text("← URGENT")
                            .font(.jakartaSans(size: 8, weight: .bold))
                            .tracking(1.0)
                            .foregroundStyle(settings.paperTone.secondaryColor)

                        Spacer()

                        Text("NOT URGENT →")
                            .font(.jakartaSans(size: 8, weight: .bold))
                            .tracking(1.0)
                            .foregroundStyle(settings.paperTone.secondaryColor)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 3)
                    .background(settings.paperTone.textColor.opacity(0.02))
                    .overlay(
                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(height: 1),
                        alignment: .bottom
                    )

                    let q = page.quadrants ?? Quadrants(q1: "", q2: "", q3: "", q4: "")

                    // Row 1: DO FIRST (Q1) | SCHEDULE (Q2)
                    HStack(alignment: .top, spacing: 0) {
                        quadrantCell(
                            title: "🔴 DO FIRST — Urgent & Important",
                            bgHex: "#fee2e2",
                            borderHex: "#ef4444",
                            textHex: "#b91c1c",
                            html: q.q1
                        )

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        quadrantCell(
                            title: "🟡 SCHEDULE — Important, Not Urgent",
                            bgHex: "#fef3c7",
                            borderHex: "#f59e0b",
                            textHex: "#b45309",
                            html: q.q2
                        )
                    }

                    // Center Horizontal Divider
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Row 2: DELEGATE (Q3) | ELIMINATE (Q4)
                    HStack(alignment: .top, spacing: 0) {
                        quadrantCell(
                            title: "🟠 DELEGATE — Urgent, Not Important",
                            bgHex: "#ffedd5",
                            borderHex: "#f97316",
                            textHex: "#c2410c",
                            html: q.q3
                        )

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        quadrantCell(
                            title: "⚪ ELIMINATE — Not Urgent, Not Important",
                            bgHex: "#f1f5f9",
                            borderHex: "#94a3b8",
                            textHex: "#475569",
                            html: q.q4
                        )
                    }
                }
                .overlay(
                    Rectangle()
                        .stroke(settings.paperTone.lineColor, lineWidth: 1.5)
                )
            }
        }
    }

    private func quadrantCell(
        title: String,
        bgHex: String,
        borderHex: String,
        textHex: String,
        html: String?
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ColumnGuideBar(
                title: title,
                badgeBgColor: Color(hex: bgHex),
                badgeBorderColor: Color(hex: borderHex),
                badgeTextColor: Color(hex: textHex)
            )

            ZStack(alignment: .topLeading) {
                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                RichTextView(html: html, customFontSize: CGFloat(settings.fontSize - 1.5))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
            }
            .frame(minHeight: 180)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    EisenhowerPageView(page: Page(
        id: "eisenhower-1",
        template: .quadrant,
        title: "Kế hoạch tuần 41",
        topic: "Kế hoạch tuần 41",
        date: "04/10/2026",
        no: "01",
        quadrants: Quadrants(
            q1: "<p>• Fix bug tab bar UI mobile</p><p>• Review checklist App Store</p>",
            q2: "<p>• Viết thêm unit tests</p><p>• Đọc sách Design Patterns</p>",
            q3: "<p>• Trả lời email đối tác</p>",
            q4: "<p>• Lướt mạng xã hội vô bổ</p>"
        )
    ))
}
