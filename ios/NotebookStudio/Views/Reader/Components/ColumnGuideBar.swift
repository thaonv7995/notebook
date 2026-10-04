import SwiftUI

/// Authentic column guide bar and section guide badge matching `templates.css` `.col-guide-bar`.
struct ColumnGuideBar: View {
    let title: String
    var badgeBgColor: Color? = nil
    var badgeBorderColor: Color? = nil
    var badgeTextColor: Color? = nil

    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(.jakartaSans(size: 8, weight: .bold))
                .tracking(1.0)
                .foregroundStyle(badgeTextColor ?? settings.paperTone.textColor)
                .padding(.horizontal, 6)
                .padding(.vertical, 1.5)
                .background(badgeBgColor ?? settings.paperTone.backgroundColor)
                .overlay(
                    Rectangle()
                        .stroke(badgeBorderColor ?? settings.paperTone.lineColor, lineWidth: 1)
                )

            Spacer()
        }
        .padding(.horizontal, 8)
        .frame(height: 22)
        .background(settings.paperTone.textColor.opacity(0.025))
        .overlay(
            Rectangle()
                .fill(settings.paperTone.lineColor)
                .frame(height: 1.2),
            alignment: .bottom
        )
    }
}

#Preview {
    VStack(spacing: 12) {
        ColumnGuideBar(title: "CUES & QUESTIONS")
        ColumnGuideBar(
            title: "🔴 DO FIRST — Urgent & Important",
            badgeBgColor: Color(hex: "#fee2e2"),
            badgeBorderColor: Color(hex: "#ef4444"),
            badgeTextColor: Color(hex: "#b91c1c")
        )
    }
    .padding()
    .background(Color(hex: "#FAF5E8"))
}
