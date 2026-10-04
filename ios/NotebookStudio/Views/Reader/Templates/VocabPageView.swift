import SwiftUI

/// Vocabulary Template View (P5-11)
/// Layout:
/// - Header: Topic, Date, No, Lang badge
/// - Cards: Word/Phrase, Meaning/Pronunciation, Example Sentence, Review Notes
struct VocabPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.spacingMD) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "🗣️",
                    purposeTitle: "VOCABULARY · \((page.lang ?? "EN").uppercased())",
                    topicLabel: "TOPIC / THEME:",
                    topic: page.topic ?? page.title,
                    date: page.date,
                    number: page.no
                )

                VStack(spacing: DesignTokens.spacingMD) {
                    // Card 1: Word / Phrase (Hero display)
                    vocabCard(
                        title: "WORD / PHRASE",
                        icon: "character.cursor.ibeam",
                        badgeColor: DesignTokens.accentLight
                    ) {
                        RichTextView(
                            html: (page.vocabWord?.isEmpty ?? true) ? page.title : page.vocabWord,
                            customFontSize: CGFloat(settings.fontSize + 4)
                        )
                    }

                    // Card 2: Meaning · Pronunciation
                    vocabCard(
                        title: "MEANING · PRONUNCIATION",
                        icon: "text.bubble",
                        badgeColor: .blue
                    ) {
                        RichTextView(html: page.vocabMeaning)
                    }

                    // Card 3: Example Sentence
                    vocabCard(
                        title: "EXAMPLE SENTENCE",
                        icon: "quote.opening",
                        badgeColor: .teal
                    ) {
                        RichTextView(html: (page.vocabExample?.isEmpty ?? true) ? page.content : page.vocabExample)
                    }

                    // Card 4: Review Notes · Memory Tips
                    if let review = page.vocabReview, !review.isEmpty {
                        vocabCard(
                            title: "REVIEW NOTES · MEMORY TIPS",
                            icon: "brain.head.profile",
                            badgeColor: .orange
                        ) {
                            RichTextView(html: review)
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.spacingLG)
            }
            .padding(.bottom, DesignTokens.spacingXXL)
        }
        .background(settings.paperTone.backgroundColor)
    }

    private func vocabCard<Content: View>(
        title: String,
        icon: String,
        badgeColor: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .bold))
                Text(title)
                    .font(.jakartaSans(size: 10, weight: .bold))
                    .tracking(1.0)
            }
            .foregroundStyle(badgeColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(badgeColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 4))

            content()
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(DesignTokens.spacingMD)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(settings.paperTone.lineColor.opacity(0.3), in: RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radiusMD)
                .stroke(settings.paperTone.lineColor, lineWidth: 1)
        )
    }
}

#Preview {
    VocabPageView(page: Page(
        id: "vocab-1",
        template: .vocab,
        title: "Ephemeral",
        topic: "Advanced English Vocabulary",
        date: "04/10/2026",
        no: "01",
        lang: "EN",
        vocabWord: "<h2>Ephemeral</h2><p>/ɪˈfem.ər.əl/ (adj)</p>",
        vocabMeaning: "<p>Lasting for only a very short time; fleeting, transitory.</p>",
        vocabExample: "<p><em>\"Fame in the digital age is often ephemeral.\"</em></p>",
        vocabReview: "<p>💡 Memory hook: <strong>E-phe-me-ral</strong> sounds like 'every-femto-second' (very brief moment).</p>"
    ))
}
