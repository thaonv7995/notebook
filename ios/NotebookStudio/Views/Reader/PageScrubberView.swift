import SwiftUI

/// Bottom page scrubber slider for jumping between pages with preview bubble (P5-3).
struct PageScrubberView: View {
    @Binding var currentPageIndex: Int
    let totalPages: Int
    let pageTitles: [String]

    @State private var isDragging: Bool = false
    @State private var dragValue: Double = 0

    var body: some View {
        VStack(spacing: 6) {
            // Floating preview bubble while scrubbing
            if isDragging {
                let previewIndex = min(max(0, Int(round(dragValue))), max(0, totalPages - 1))
                let title = previewIndex < pageTitles.count ? pageTitles[previewIndex] : ""

                VStack(spacing: 2) {
                    Text("Trang \(previewIndex + 1) / \(totalPages)")
                        .font(.jakartaSans(size: 13, weight: .bold))
                        .foregroundStyle(.white)

                    if !title.isEmpty {
                        Text(title)
                            .font(.jakartaSans(size: 11))
                            .foregroundStyle(.white.opacity(0.8))
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(.ultraThickMaterial, in: Capsule())
                .environment(\.colorScheme, .dark)
                .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                .transition(.scale.combined(with: .opacity))
            }

            // Scrubber Bar
            HStack(spacing: DesignTokens.spacingMD) {
                // Prev button
                Button {
                    if currentPageIndex > 0 {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation(.easeInOut(duration: 0.2)) {
                            currentPageIndex -= 1
                        }
                    }
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(currentPageIndex > 0 ? DesignTokens.accentLight : .secondary.opacity(0.4))
                }
                .disabled(currentPageIndex <= 0)

                // Slider
                Slider(
                    value: Binding(
                        get: { isDragging ? dragValue : Double(currentPageIndex) },
                        set: { newValue in
                            dragValue = newValue
                            let target = Int(round(newValue))
                            if target != currentPageIndex && target >= 0 && target < totalPages {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                currentPageIndex = target
                            }
                        }
                    ),
                    in: 0...Double(max(1, totalPages - 1)),
                    step: 1
                ) { editing in
                    withAnimation(.easeInOut(duration: 0.15)) {
                        isDragging = editing
                        if editing {
                            dragValue = Double(currentPageIndex)
                        }
                    }
                }
                .tint(DesignTokens.accentLight)

                // Next button
                Button {
                    if currentPageIndex < totalPages - 1 {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation(.easeInOut(duration: 0.2)) {
                            currentPageIndex += 1
                        }
                    }
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(currentPageIndex < totalPages - 1 ? DesignTokens.accentLight : .secondary.opacity(0.4))
                }
                .disabled(currentPageIndex >= totalPages - 1)
            }
            .padding(.horizontal, DesignTokens.spacingLG)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .shadow(color: .black.opacity(0.08), radius: 10, y: 3)
            .padding(.horizontal, DesignTokens.spacingLG)
        }
    }
}

#Preview {
    PageScrubberView(
        currentPageIndex: .constant(2),
        totalPages: 8,
        pageTitles: ["Trang 1", "Trang 2", "Trang 3"]
    )
}
