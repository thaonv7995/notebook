import SwiftUI

/// Charting / Comparison Template View (P5-12)
/// Layout:
/// - Header: Topic, Date, No
/// - 3 Columns comparison (Col A, Col B, Col C)
/// - Bottom Analysis & Insights section
struct ChartingPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "📊",
                    purposeTitle: "CHARTING METHOD",
                    topicLabel: "SUBJECT / TOPIC:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                // 3 Columns Comparison
                let chart = page.chartData ?? ChartData(col1: nil, col2: nil, col3: nil)

                HStack(alignment: .top, spacing: 0) {
                    // Column A
                    chartColumn(title: "COLUMN A", icon: "a.circle", html: chart.col1)

                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(width: 1.5)

                    // Column B
                    chartColumn(title: "COLUMN B", icon: "b.circle", html: chart.col2)

                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(width: 1.5)

                    // Column C
                    chartColumn(title: "COLUMN C", icon: "c.circle", html: chart.col3)
                }
                .frame(minHeight: 260)

                // Bottom Analysis & Synthesis
                Rectangle()
                    .fill(settings.paperTone.lineColor)
                    .frame(height: 1.5)

                VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.system(size: 10, weight: .bold))
                        Text("ANALYSIS & INSIGHTS")
                            .font(.jakartaSans(size: 10, weight: .bold))
                            .tracking(1.0)
                    }
                    .foregroundStyle(DesignTokens.accentLight)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(DesignTokens.accentLight.opacity(0.1), in: RoundedRectangle(cornerRadius: 4))

                    RichTextView(html: (page.summary?.isEmpty ?? true) ? page.content : page.summary)
                }
                .padding(DesignTokens.spacingLG)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
        .background(settings.paperTone.backgroundColor)
    }

    private func chartColumn(title: String, icon: String, html: String?) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .bold))
                Text(title)
                    .font(.jakartaSans(size: 9, weight: .bold))
                    .tracking(0.8)
            }
            .foregroundStyle(settings.paperTone.secondaryColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(settings.paperTone.lineColor.opacity(0.5), in: RoundedRectangle(cornerRadius: 4))

            RichTextView(html: html, customFontSize: CGFloat(settings.fontSize - 2))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(DesignTokens.spacingSM)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    ChartingPageView(page: Page(
        id: "chart-1",
        template: .charting,
        title: "So sánh Mobile Frameworks",
        topic: "So sánh Mobile Frameworks",
        date: "04/10/2026",
        no: "01",
        chartData: ChartData(
            col1: "<h3>SwiftUI</h3><p>• Native Apple</p><p>• Tốc độ 60/120fps</p><p>• Tích hợp sâu iOS</p>",
            col2: "<h3>Flutter</h3><p>• Đa nền tảng</p><p>• Engine Skia/Impeller riêng</p><p>• Ngôn ngữ Dart</p>",
            col3: "<h3>React Native</h3><p>• JavaScript / TS</p><p>• Hệ sinh thái NPM lớn</p><p>• Kiến trúc New Arch</p>"
        ),
        summary: "<p>SwiftUI tối ưu nhất cho trải nghiệm người dùng iOS mượt mà, chân thực chuẩn Apple HIG.</p>"
    ))
}
