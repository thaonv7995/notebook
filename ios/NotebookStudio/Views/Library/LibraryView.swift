import SwiftUI

/// Library tab — displays all notebooks.
/// TODO: P4-1 through P4-7 — Full implementation.
struct LibraryView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                VStack(spacing: DesignTokens.spacingLG) {
                    Image(systemName: "books.vertical.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTokens.accentLight)

                    Text("Thư viện sổ tay")
                        .font(.system(size: DesignTokens.fontSizeSectionHeader, weight: .semibold))

                    Text("Đang phát triển...")
                        .font(.system(size: DesignTokens.fontSizeCaption))
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Notebook Studio")
        }
    }
}

#Preview {
    LibraryView()
}
