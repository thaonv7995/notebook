import SwiftUI

/// Charting / Comparison Template View (P5-12)
/// Matches web `charting-container`:
/// - Header: Subject/Topic, Date, No, Data Analysis seal
/// - 3 Columns comparison (Col A, Col B, Col C) on ruled lines
/// - Bottom Analysis & Conclusions area on ruled lines
struct ChartingPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "CHARTING METHOD", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "📊",
                    purposeTitle: "CHARTING METHOD",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "DATA ANALYSIS"
                )

                // Charting Container with 1.5pt crisp border
                VStack(spacing: 0) {
                    let chart = page.chartData ?? ChartData()

                    // 3 Columns Comparison
                    HStack(alignment: .top, spacing: 0) {
                        chartCol(title: "COLUMN A", html: chart.col1)

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        chartCol(title: "COLUMN B", html: chart.col2)

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        chartCol(title: "COLUMN C", html: chart.col3)
                    }

                    // Horizontal dividing line
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Bottom: Analysis & Conclusions
                    VStack(alignment: .leading, spacing: 0) {
                        ColumnGuideBar(title: "ANALYSIS & CONCLUSIONS")

                        ZStack(alignment: .topLeading) {
                            RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                            RichTextView(html: (page.summary?.isEmpty ?? true) ? page.content : page.summary)
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

    private func chartCol(title: String, html: String?) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ColumnGuideBar(title: title)

            ZStack(alignment: .topLeading) {
                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                RichTextView(html: html, customFontSize: CGFloat(settings.fontSize - 1.5))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
            }
            .frame(minHeight: 240)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    ChartingPageView(page: Page(
        id: "chart-1",
        template: .charting,
        title: "So sánh Frameworks",
        topic: "So sánh Mobile Frameworks",
        date: "04/10/2026",
        no: "01",
        summary: "<p>SwiftUI tối ưu nhất cho hệ sinh thái Apple, Flutter thích hợp cho cross-platform nhanh chóng.</p>"
    ))
}
