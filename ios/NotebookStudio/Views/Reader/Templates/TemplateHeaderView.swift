import SwiftUI

/// Shared header for template notebook pages with purpose badge, topic title, date, and page number.
struct TemplateHeaderView: View {
    let purposeIcon: String
    let purposeTitle: String
    let topicLabel: String
    let topic: String?
    let date: String?
    let number: String?
    var numberLabel: String = "NO."
    var author: String? = nil
    var sealSubLabel: String = "ARCHIVE"

    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
            // Top purpose badge, date/number badges & author seal cartouche
            HStack(alignment: .center, spacing: DesignTokens.spacingSM) {
                // Purpose badge
                HStack(spacing: 6) {
                    Text(purposeIcon)
                        .font(.system(size: 11))
                    Text(purposeTitle)
                        .font(.jakartaSans(size: 11, weight: .bold))
                        .tracking(1.2)
                }
                .foregroundStyle(DesignTokens.accentLight)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(DesignTokens.accentLight.opacity(0.12), in: Capsule())

                Spacer()

                // Date & Number badges
                HStack(spacing: 12) {
                    if let date = date, !date.isEmpty {
                        HStack(spacing: 4) {
                            Text("DATE:")
                                .font(.jakartaSans(size: 10, weight: .bold))
                                .foregroundStyle(settings.paperTone.secondaryColor)
                            Text(date)
                                .font(.jakartaSans(size: 11, weight: .medium))
                                .foregroundStyle(settings.paperTone.textColor)
                        }
                    }

                    if let number = number, !number.isEmpty {
                        HStack(spacing: 4) {
                            Text(numberLabel)
                                .font(.jakartaSans(size: 10, weight: .bold))
                                .foregroundStyle(settings.paperTone.secondaryColor)
                            Text(number)
                                .font(.jakartaSans(size: 11, weight: .semibold))
                                .foregroundStyle(DesignTokens.accentLight)
                        }
                    }
                }

                // Author seal cartouche
                if let author = author, !author.isEmpty {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(author.hasPrefix("@") ? author : "@\(author)")
                            .font(.jakartaSans(size: 9, weight: .bold))
                            .foregroundStyle(settings.paperTone.textColor)
                        Text(sealSubLabel)
                            .font(.jakartaSans(size: 7, weight: .semibold))
                            .tracking(0.8)
                            .foregroundStyle(DesignTokens.accentLight)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .overlay(
                        RoundedRectangle(cornerRadius: 3)
                            .stroke(DesignTokens.accentLight.opacity(0.35), lineWidth: 0.8)
                    )
                }
            }

            // Topic / Subject title
            if let topic = topic, !topic.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    Text(topicLabel)
                        .font(.jakartaSans(size: 10, weight: .bold))
                        .tracking(1.0)
                        .foregroundStyle(settings.paperTone.secondaryColor)

                    Text(topic)
                        .font(.jakartaSans(size: 18, weight: .bold))
                        .foregroundStyle(settings.paperTone.textColor)
                }
            }

            // Separator bar
            Rectangle()
                .fill(settings.paperTone.lineColor)
                .frame(height: 1.5)
                .padding(.top, 2)
        }
        .padding(.horizontal, DesignTokens.spacingLG)
        .padding(.top, DesignTokens.spacingMD)
    }
}

#Preview {
    TemplateHeaderView(
        purposeIcon: "✦",
        purposeTitle: "STUDY JOURNAL",
        topicLabel: "SUBJECT / TOPIC:",
        topic: "Lập trình iOS với SwiftUI",
        date: "04/10/2026",
        number: "01",
        author: "thaonv"
    )
}
