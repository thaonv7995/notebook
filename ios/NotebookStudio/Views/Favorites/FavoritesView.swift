import SwiftUI

/// Favorites tab — pinned notebooks and bookmarked pages.
/// TODO: P6-4, P6-5 — Full implementation.
struct FavoritesView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                VStack(spacing: DesignTokens.spacingLG) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTokens.accentLight)

                    Text("Yêu thích")
                        .font(.system(size: DesignTokens.fontSizeSectionHeader, weight: .semibold))

                    Text("Đang phát triển...")
                        .font(.system(size: DesignTokens.fontSizeCaption))
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Favorites")
        }
    }
}

#Preview {
    FavoritesView()
}
