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
                VStack(alignment: .leading, spacing: 2) {
                    Text(result.notebook.title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text("Trang \(result.pageIndex + 1)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(hex: "2dd4bf"))

                        Text("·")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "64748b"))

                        Text(result.page.template.displayName)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                }

                Spacer()

                // Matched field tag
                Text(result.matchField)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Color(hex: "38bdf8"))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(hex: "38bdf8").opacity(0.15))
                    .clipShape(Capsule())
            }

            // Snippet with Highlight
            Text(highlightedSnippet)
                .font(.system(size: 13))
                .lineSpacing(4)
                .foregroundColor(Color(hex: "cbd5e1"))
                .lineLimit(3)
        }
        .padding(14)
        .background(Color(hex: "1e293b"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
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
