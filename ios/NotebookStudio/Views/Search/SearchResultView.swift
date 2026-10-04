import SwiftUI

/// Search Result Card displaying page info, snippet, and highlighted matching terms (P6-3).
struct SearchResultView: View {
    let result: SearchResult

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header: Notebook Title & Template badge
            HStack(spacing: 8) {
                // Template icon
                Image(systemName: result.page.template.iconName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(DesignTokens.accentLight)
                    .frame(width: 24, height: 24)
                    .background(DesignTokens.accentLight.opacity(0.12), in: Circle())

                // Notebook & Page location
                VStack(alignment: .leading, spacing: 1) {
                    Text(result.notebook.title)
                        .font(.jakartaSans(size: 14, weight: .bold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text("Trang \(result.pageIndex + 1)")
                            .font(.jakartaSans(size: 11, weight: .semibold))
                            .foregroundStyle(DesignTokens.accentLight)

                        Text("·")
                            .font(.jakartaSans(size: 11))
                            .foregroundStyle(.secondary)

                        Text(result.page.template.displayName)
                            .font(.jakartaSans(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Matched field tag
                Text(result.matchField)
                    .font(.jakartaSans(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(.tertiarySystemFill), in: Capsule())
            }

            // Snippet with Highlight
            Text(highlightedSnippet)
                .font(.jakartaSans(size: 13))
                .lineSpacing(3)
                .foregroundStyle(.secondary)
                .lineLimit(3)
        }
        .padding(DesignTokens.spacingMD)
        .background(.background, in: RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radiusMD)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
    }

    private var highlightedSnippet: AttributedString {
        var attributed = AttributedString(result.snippet)
        let query = result.query.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !query.isEmpty else { return attributed }

        var searchStartIndex = attributed.startIndex
        while searchStartIndex < attributed.endIndex,
              let range = attributed[searchStartIndex...].range(of: query, options: .caseInsensitive) {
            attributed[range].foregroundColor = .orange
            attributed[range].font = .system(size: 13, weight: .bold)
            searchStartIndex = range.upperBound
        }

        return attributed
    }
}

#Preview {
    SearchResultView(
        result: SearchResult(
            notebook: Notebook(id: "nb-1", title: "Sổ tay Swift", category: "Lập trình"),
            page: Page(id: "p-1", template: .cornell, title: "Concurrency"),
            pageIndex: 2,
            matchField: "Nội dung",
            snippet: "...sử dụng async/await và actor trong SwiftUI giúp tránh data races hiệu quả...",
            query: "async"
        )
    )
    .padding()
}
