import SwiftUI

/// Search tab — full-text search across notebooks and pages.
/// TODO: P6-1 through P6-3 — Full implementation.
struct SearchView: View {
    @State private var searchText: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                VStack(spacing: DesignTokens.spacingLG) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTokens.accentLight)

                    Text("Tìm kiếm")
                        .font(.system(size: DesignTokens.fontSizeSectionHeader, weight: .semibold))

                    Text("Đang phát triển...")
                        .font(.system(size: DesignTokens.fontSizeCaption))
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Search")
            .searchable(text: $searchText, prompt: "Tìm sổ tay, trang, ghi chú...")
        }
    }
}

#Preview {
    SearchView()
}
