import SwiftUI

/// Horizontal scrollable category filter chips for the library.
///
/// Shows "Tất cả" (All) plus unique categories extracted from notebooks.
/// Active chip has accent gradient background.
struct CategoryChipsView: View {
    let categories: [String]
    @Binding var selectedCategory: String

    /// "Tất cả" is the default "show all" category.
    private let allCategory = "Tất cả"

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.spacingSM) {
                // "All" chip
                CategoryChip(
                    label: allCategory,
                    isSelected: selectedCategory == allCategory,
                    onTap: { selectedCategory = allCategory }
                )

                // Category chips
                ForEach(categories, id: \.self) { category in
                    CategoryChip(
                        label: category,
                        isSelected: selectedCategory == category,
                        onTap: { selectedCategory = category }
                    )
                }
            }
            .padding(.horizontal, DesignTokens.spacingLG)
            .padding(.vertical, DesignTokens.spacingXS)
        }
    }
}

// MARK: - Single Chip

struct CategoryChip: View {
    let label: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: {
            withAnimation(.easeInOut(duration: DesignTokens.animationFast)) {
                onTap()
            }
        }) {
            Text(label)
                .font(.jakartaSans(size: DesignTokens.fontSizeCaption, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, DesignTokens.spacingLG)
                .padding(.vertical, DesignTokens.spacingSM)
                .background {
                    if isSelected {
                        LinearGradient(
                            colors: [DesignTokens.accentLight, DesignTokens.accentDark],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    } else {
                        Color(.systemBackground)
                    }
                }
                .clipShape(Capsule())
                .overlay {
                    if !isSelected {
                        Capsule()
                            .strokeBorder(Color(.separator), lineWidth: 0.5)
                    }
                }
                .shadow(
                    color: isSelected ? DesignTokens.accentLight.opacity(0.3) : .clear,
                    radius: 4, y: 2
                )
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

#Preview {
    VStack {
        CategoryChipsView(
            categories: ["Học tập", "Công việc", "Cá nhân", "Tiếng Trung"],
            selectedCategory: .constant("Tất cả")
        )
        CategoryChipsView(
            categories: ["Học tập", "Công việc", "Cá nhân"],
            selectedCategory: .constant("Học tập")
        )
    }
    .padding()
}
