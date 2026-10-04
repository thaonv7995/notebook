import SwiftUI

/// Card displaying a bookmarked page with preview, notebook metadata, and swipe-to-delete (P6-5).
struct BookmarkedPageCard: View {
    let notebook: Notebook
    let page: Page
    let pageIndex: Int
    let onRemoveBookmark: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header: Template icon + Page number & Notebook title
            HStack(spacing: 8) {
                Image(systemName: page.template.iconName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(DesignTokens.accentLight)
                    .frame(width: 26, height: 26)
                    .background(DesignTokens.accentLight.opacity(0.12), in: Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text((page.topic ?? page.title ?? "Trang \(pageIndex + 1)").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Trang \(pageIndex + 1)" : (page.topic ?? page.title ?? "Trang \(pageIndex + 1)"))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text(notebook.title)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(hex: "94a3b8"))
                            .lineLimit(1)

                        Text("·")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "64748b"))

                        Text("Trang \(pageIndex + 1)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(hex: "2dd4bf"))
                    }
                }

                Spacer()

                // Bookmark icon badge
                Image(systemName: "bookmark.fill")
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "f59e0b"))
            }

            // Preview snippet
            let snippet = cleanPreviewText
            if !snippet.isEmpty {
                Text(snippet)
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "cbd5e1"))
                    .lineLimit(2)
                    .lineSpacing(3)
            }
        }
        .padding(14)
        .background(Color(hex: "1e293b"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onRemoveBookmark()
            } label: {
                Label("Bỏ lưu", systemImage: "bookmark.slash")
            }
        }
    }

    private var cleanPreviewText: String {
        let raw = page.notes ?? page.content ?? page.cues ?? page.summary ?? ""
        return SearchEngine.shared.stripHtml(raw)
    }
}

#Preview {
    BookmarkedPageCard(
        notebook: Notebook(id: "nb-1", title: "Sổ tay Swift", category: "Code"),
        page: Page(id: "p-1", template: .cornell, title: "Concurrency và Actor", notes: "<p>Swift 6 mang đến tính năng kiểm tra concurrency nghiêm ngặt khi biên dịch.</p>"),
        pageIndex: 1,
        onRemoveBookmark: {}
    )
    .padding()
}
