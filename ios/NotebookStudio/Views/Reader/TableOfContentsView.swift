import SwiftUI

/// Table of Contents drawer/sheet listing all pages in the notebook (P5-23).
struct TableOfContentsView: View {
    let notebook: Notebook
    @Binding var currentPageIndex: Int
    @ObservedObject var bookmarkStore = BookmarkStore.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(notebook.pages.enumerated()), id: \.element.id) { index, page in
                    Button {
                        currentPageIndex = index
                        dismiss()
                    } label: {
                        HStack(spacing: DesignTokens.spacingMD) {
                            // Page number badge
                            Text(String(format: "%02d", index + 1))
                                .font(.jakartaSans(size: 12, weight: .bold))
                                .foregroundStyle(index == currentPageIndex ? DesignTokens.accentLight : .secondary)
                                .frame(width: 28, height: 28)
                                .background(
                                    (index == currentPageIndex ? DesignTokens.accentLight.opacity(0.15) : Color.gray.opacity(0.1)),
                                    in: Circle()
                                )

                            // Template icon
                            Image(systemName: page.template.iconName)
                                .font(.system(size: 14))
                                .foregroundStyle(DesignTokens.accentLight)
                                .frame(width: 20)

                            // Title & Template Name
                            VStack(alignment: .leading, spacing: 2) {
                                Text((page.topic ?? page.title ?? "Trang \(index + 1)").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Trang \(index + 1)" : (page.topic ?? page.title ?? "Trang \(index + 1)"))
                                    .font(.jakartaSans(size: 15, weight: index == currentPageIndex ? .bold : .medium))
                                    .foregroundStyle(index == currentPageIndex ? DesignTokens.accentLight : .primary)
                                    .lineLimit(1)

                                Text(page.template.displayName)
                                    .font(.jakartaSans(size: 11))
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            // Bookmark indicator
                            if bookmarkStore.isBookmarked(pageId: page.id) {
                                Image(systemName: "bookmark.fill")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.orange)
                            }

                            // Current page arrow indicator
                            if index == currentPageIndex {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(DesignTokens.accentLight)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle("Mục lục (\(notebook.pages.count) trang)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Đóng") {
                        dismiss()
                    }
                    .font(.jakartaSans(size: 15, weight: .semibold))
                    .foregroundStyle(DesignTokens.accentLight)
                }
            }
        }
    }
}

#Preview {
    TableOfContentsView(
        notebook: Notebook(
            id: "nb-1",
            title: "Sổ tay mẫu",
            pages: [
                Page(id: "p1", template: .cornell, title: "Bài học 1"),
                Page(id: "p2", template: .work, title: "Kế hoạch tuần")
            ]
        ),
        currentPageIndex: .constant(0)
    )
}
