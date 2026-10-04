import SwiftUI

/// Authentic A4 Notebook Sheet Container reproducing the web app styling 100%:
/// - Ornate Royal Corner Frames (top-left, top-right, bottom-left, bottom-right)
/// - Dashed punch margin line
/// - Edge index notches (I, II, III, IV, V, VI) along right edge
/// - Authentic Scholar footer with PAGE box and system title
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

                // Punch margin line (left side, 22pt)
                VStack {
                    Path { path in
                        path.move(to: CGPoint(x: 22, y: 0))
                        path.addLine(to: CGPoint(x: 22, y: 3500))
                    }
                    .stroke(
                        settings.paperTone.lineColor.opacity(0.7),
                        style: StrokeStyle(lineWidth: 0.8, dash: [4, 4])
                    )
                }
                .allowsHitTesting(false)

                // Edge index notches (flush along right edge)
                VStack(spacing: 8) {
                    ForEach(["I", "II", "III", "IV", "V", "VI"], id: \.self) { numeral in
                        Text(numeral)
                            .font(.system(size: 7.5, weight: .bold))
                            .foregroundStyle(settings.paperTone.secondaryColor)
                            .frame(width: 13, height: 18)
                            .background(settings.paperTone.backgroundColor)
                            .overlay(
                                Path { path in
                                    // Top border
                                    path.move(to: CGPoint(x: 13, y: 0))
                                    path.addLine(to: CGPoint(x: 2, y: 0))
                                    // Left curve/corner and line
                                    path.addLine(to: CGPoint(x: 0, y: 2))
                                    path.addLine(to: CGPoint(x: 0, y: 16))
                                    // Bottom curve/corner and line
                                    path.addLine(to: CGPoint(x: 2, y: 18))
                                    path.addLine(to: CGPoint(x: 13, y: 18))
                                }
                                .stroke(settings.paperTone.lineColor, lineWidth: 1)
                            )
                    }
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.trailing, 0)
                .padding(.top, 24)
                .allowsHitTesting(false)
                .zIndex(10)

                // 4 Ornate Royal Corner Frames
                RoyalCornerView(strokeColor: settings.paperTone.textColor, innerStrokeColor: settings.paperTone.secondaryColor, size: 22)
                    .position(x: 32, y: 16)
                    .allowsHitTesting(false)

                RoyalCornerView(strokeColor: settings.paperTone.textColor, innerStrokeColor: settings.paperTone.secondaryColor, size: 22)
                    .scaleEffect(x: -1, y: 1)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.trailing, 10)
                    .padding(.top, 6)
                    .allowsHitTesting(false)

                // Main page content & Scholar Footer
                VStack(spacing: 0) {
                    content()

                    // Scholar Footer matching web
                    scholarFooter
                        .padding(.top, 10)
                        .padding(.bottom, 12)
                }
                .padding(.leading, 26) // Generous space for punch margin & left corner
                .padding(.trailing, 16) // Space for edge notches & right corner
                .padding(.top, 8)
            }
            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .stroke(settings.paperTone.lineColor.opacity(0.6), lineWidth: 1.0)
            )
            .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: 2)
            .padding(.horizontal, 6)
            .padding(.vertical, 6)
        }
        .background(settings.paperTone.backgroundColor.opacity(0.96))
    }

    // MARK: - Scholar Footer (matching web .scholar-footer)

    private var scholarFooter: some View {
        HStack(alignment: .center) {
            Text(systemTitle.uppercased())
                .font(.jakartaSans(size: 8, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(settings.paperTone.secondaryColor)

            Spacer()

            HStack(spacing: 4) {
                Text("PAGE")
                    .font(.jakartaSans(size: 7.5, weight: .bold))
                    .foregroundStyle(settings.paperTone.secondaryColor)

                Text(String(format: "%02d", pageNumber))
                    .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                    .foregroundStyle(settings.paperTone.textColor)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 1.5)
                    .background(settings.paperTone.backgroundColor)
                    .overlay(
                        Rectangle()
                            .stroke(settings.paperTone.lineColor, lineWidth: 1)
                    )
            }
        }
        .padding(.top, 6)
        .overlay(
            Rectangle()
                .fill(settings.paperTone.lineColor)
                .frame(height: 1),
            alignment: .top
        )
    }
}

#Preview {
    A4PaperSheetView(systemTitle: "CORNELL SYSTEM", pageNumber: 1) {
        VStack {
            Text("Content Area")
                .frame(height: 300)
        }
    }
}
