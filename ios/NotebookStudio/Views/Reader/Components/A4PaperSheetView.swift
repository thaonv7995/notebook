import SwiftUI

/// Authentic A4 Notebook Sheet Container matching the web app styling.
/// Includes:
/// - Punch margin dashed line
/// - Edge index notches (I, II, III, IV, V, VI)
/// - Royal corner ornamental frames
/// - Scholar footer with PAGE box and system title
struct A4PaperSheetView<Content: View>: View {
    let systemTitle: String
    let pageNumber: Int
    @ViewBuilder let content: () -> Content

    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ScrollView {
            ZStack(alignment: .topLeading) {
                // Background paper tone
                settings.paperTone.backgroundColor

                // Punch margin line (left side)
                VStack {
                    Path { path in
                        path.move(to: CGPoint(x: 22, y: 0))
                        path.addLine(to: CGPoint(x: 22, y: 3000))
                    }
                    .stroke(
                        settings.paperTone.lineColor.opacity(0.7),
                        style: StrokeStyle(lineWidth: 0.8, dash: [4, 4])
                    )
                }
                .allowsHitTesting(false)

                // Edge index notches (right side)
                VStack(spacing: 8) {
                    ForEach(["I", "II", "III", "IV", "V", "VI"], id: \.self) { numeral in
                        Text(numeral)
                            .font(.system(size: 7.5, weight: .bold))
                            .foregroundStyle(settings.paperTone.secondaryColor.opacity(0.7))
                            .frame(width: 14, height: 18)
                            .background(settings.paperTone.backgroundColor)
                            .overlay(
                                RoundedRectangle(cornerRadius: 2)
                                    .stroke(settings.paperTone.lineColor.opacity(0.6), lineWidth: 0.8)
                            )
                    }
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.trailing, 2)
                .padding(.top, 24)
                .allowsHitTesting(false)

                // Main page content & ornaments
                VStack(spacing: 0) {
                    content()

                    // Scholar Footer
                    scholarFooter
                        .padding(.horizontal, DesignTokens.spacingLG)
                        .padding(.top, DesignTokens.spacingLG)
                        .padding(.bottom, DesignTokens.spacingXL)
                }
                .padding(.leading, 12) // Space for punch margin
                .padding(.trailing, 10) // Space for edge notches
            }
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusSM, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.radiusSM, style: .continuous)
                    .stroke(settings.paperTone.lineColor.opacity(0.4), lineWidth: 0.8)
            )
            .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: 2)
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
        }
        .background(settings.paperTone.backgroundColor.opacity(0.95))
    }

    // MARK: - Scholar Footer

    private var scholarFooter: some View {
        HStack(alignment: .center) {
            Text(systemTitle.uppercased())
                .font(.jakartaSans(size: 9, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(settings.paperTone.secondaryColor.opacity(0.8))

            Spacer()

            HStack(spacing: 4) {
                Text("PAGE")
                    .font(.jakartaSans(size: 8, weight: .bold))
                    .foregroundStyle(settings.paperTone.secondaryColor)

                Text(String(format: "%02d", pageNumber))
                    .font(.jakartaSans(size: 10, weight: .bold))
                    .foregroundStyle(DesignTokens.accentLight)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        RoundedRectangle(cornerRadius: 3)
                            .stroke(settings.paperTone.lineColor, lineWidth: 1)
                    )
            }
        }
    }
}
