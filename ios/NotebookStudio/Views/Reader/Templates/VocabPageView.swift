import SwiftUI

/// Vocabulary Template View (P5-11)
/// Matches web `vocab-container`:
/// - Header: Topic/Theme underline, Date, No, Lang badge
/// - 3 Columns: Word/Phrase | Meaning & Pronunciation | Example Sentence on ruled lines
/// - Bottom Area: Review Notes & Memory Tips on ruled lines
struct VocabPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        let langLabel = (page.lang ?? "EN").uppercased()

        A4PaperSheetView(systemTitle: "VOCABULARY · \(langLabel)", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "🗣️",
                    purposeTitle: "VOCABULARY · \(langLabel)",
                    topicLabel: "TOPIC / THEME:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "LANGUAGE LAB"
                )

                // Vocab Container with 1.5pt crisp border
                VStack(spacing: 0) {
                    // Split Body: 3 Columns
                    HStack(alignment: .top, spacing: 0) {
                        // Col 1: Word / Phrase
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "WORD / PHRASE")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(
                                    html: (page.vocabWord?.isEmpty ?? true) ? page.title : page.vocabWord,
                                    customFontSize: CGFloat(settings.fontSize + 1)
                                )
                                .padding(.horizontal, 6)
                                .padding(.vertical, 4)
                            }
                            .frame(minHeight: 240)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        // Vertical Divider 1
                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        // Col 2: Meaning · Pronunciation
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "MEANING")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: page.vocabMeaning, customFontSize: CGFloat(settings.fontSize - 1))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 240)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        // Vertical Divider 2
                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        // Col 3: Example Sentence
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "EXAMPLE")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: (page.vocabExample?.isEmpty ?? true) ? page.content : page.vocabExample, customFontSize: CGFloat(settings.fontSize - 1.5))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 240)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Horizontal dividing line
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Bottom Area: Review Notes & Memory Tips
                    VStack(alignment: .leading, spacing: 0) {
                        ColumnGuideBar(title: "REVIEW NOTES · MEMORY TIPS")

                        ZStack(alignment: .topLeading) {
                            RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                            RichTextView(html: page.vocabReview)
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
    VocabPageView(page: Page(
        id: "vocab-1",
        template: .vocab,
        title: "Komorebi",
        topic: "Từ vựng tiếng Nhật N3",
        date: "04/10/2026",
        no: "01",
        lang: "JA",
        vocabWord: "<p><strong>木漏れ日</strong> (Komorebi)</p>",
        vocabMeaning: "<p>Ánh nắng len lỏi qua kẽ lá trên cây.</p>",
        vocabExample: "<p>森の中を歩くと、美しい木漏れ日が見える。</p>",
        vocabReview: "<p>Komo (cây) + rebi (nắng lọt). Một trong những từ thơ mộng nhất của tiếng Nhật.</p>"
    ))
}
