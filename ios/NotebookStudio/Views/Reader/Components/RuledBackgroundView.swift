import SwiftUI

/// Authentic lined notebook paper background with 28pt ruled lines and optional red margin.
/// Matches `templates.css` `.template-writing-area` background linear gradient.
struct RuledBackgroundView: View {
    var lineHeight: CGFloat = 28
    var lineColor: Color = Color.black.opacity(0.08)
    var showRedMargin: Bool = false
    var redMarginX: CGFloat = 36

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                // Horizontal ruled lines
                Path { path in
                    let count = Int(geometry.size.height / lineHeight) + 2
                    for i in 1...count {
                        let y = CGFloat(i) * lineHeight
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: geometry.size.width, y: y))
                    }
                }
                .stroke(lineColor, lineWidth: 0.8)

                // Optional red vertical margin line (standard for classic lined notebooks)
                if showRedMargin {
                    Path { path in
                        path.move(to: CGPoint(x: redMarginX, y: 0))
                        path.addLine(to: CGPoint(x: redMarginX, y: geometry.size.height))
                    }
                    .stroke(Color(red: 0.88, green: 0.35, blue: 0.35, opacity: 0.65), lineWidth: 1.0)
                }
            }
        }
    }
}

#Preview {
    RuledBackgroundView(showRedMargin: true)
        .frame(height: 300)
        .background(Color(hex: "#FAF5E8"))
}
