import SwiftUI

/// Vector reproduction of the web app's ornate royal corner frames.
/// Matches `ROYAL_CORNERS_SVG` in `src/templates/ornaments.js`.
struct RoyalCornerView: View {
    var strokeColor: Color = Color(hex: "#0f172a")
    var innerStrokeColor: Color = Color(hex: "#475569")
    var size: CGFloat = 26

    var body: some View {
        Canvas { context, canvasSize in
            let scale = canvasSize.width / 45.0

            // Outer Path: M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2
            var outer = Path()
            outer.move(to: CGPoint(x: 2 * scale, y: 44 * scale))
            outer.addLine(to: CGPoint(x: 2 * scale, y: 6 * scale))
            outer.addCurve(
                to: CGPoint(x: 6 * scale, y: 2 * scale),
                control1: CGPoint(x: 2 * scale, y: 3.8 * scale),
                control2: CGPoint(x: 3.8 * scale, y: 2 * scale)
            )
            outer.addLine(to: CGPoint(x: 44 * scale, y: 2 * scale))
            context.stroke(outer, with: .color(strokeColor), lineWidth: 1.5 * scale)

            // Inner Path: M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7
            var inner = Path()
            inner.move(to: CGPoint(x: 7 * scale, y: 44 * scale))
            inner.addLine(to: CGPoint(x: 7 * scale, y: 9 * scale))
            inner.addCurve(
                to: CGPoint(x: 9 * scale, y: 7 * scale),
                control1: CGPoint(x: 7 * scale, y: 7.9 * scale),
                control2: CGPoint(x: 7.9 * scale, y: 7 * scale)
            )
            inner.addLine(to: CGPoint(x: 44 * scale, y: 7 * scale))
            context.stroke(inner, with: .color(innerStrokeColor), lineWidth: 1.0 * scale)

            // Diamond: 12,12 15,9 12,6 9,9
            var diamond = Path()
            diamond.move(to: CGPoint(x: 12 * scale, y: 12 * scale))
            diamond.addLine(to: CGPoint(x: 15 * scale, y: 9 * scale))
            diamond.addLine(to: CGPoint(x: 12 * scale, y: 6 * scale))
            diamond.addLine(to: CGPoint(x: 9 * scale, y: 9 * scale))
            diamond.closeSubpath()
            context.fill(diamond, with: .color(strokeColor))
        }
        .frame(width: size, height: size)
    }
}

#Preview {
    HStack(spacing: 20) {
        RoyalCornerView()
        RoyalCornerView().scaleEffect(x: -1, y: 1)
        RoyalCornerView().scaleEffect(x: 1, y: -1)
        RoyalCornerView().scaleEffect(x: -1, y: -1)
    }
    .padding()
    .background(Color.white)
}
