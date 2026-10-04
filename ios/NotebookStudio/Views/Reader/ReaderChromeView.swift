import SwiftUI

/// Top navigation bar chrome for ReaderView (P5-2).
/// Displays:
/// - Back button
/// - Title & page counter
/// - Action buttons: Bookmark (P5-22), TOC (P5-23), Reader Settings (P5-19/20)
struct ReaderChromeView: View {
    let title: String
    let currentPageIndex: Int
    let totalPages: Int
    let isBookmarked: Bool

    let onBack: () -> Void
    let onToggleBookmark: () -> Void
    let onOpenTOC: () -> Void
    let onOpenSettings: () -> Void

    var body: some View {
        HStack(spacing: DesignTokens.spacingMD) {
            // Back Button
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 36, height: 36)
                    .background(.ultraThinMaterial, in: Circle())
            }

            // Title & Page Counter
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.jakartaSans(size: 15, weight: .bold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text("Trang \(currentPageIndex + 1) / \(max(1, totalPages))")
                    .font(.jakartaSans(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Bookmark Button
            Button(action: onToggleBookmark) {
                Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(isBookmarked ? .orange : .primary)
                    .frame(width: 36, height: 36)
                    .background(.ultraThinMaterial, in: Circle())
            }

            // Table of Contents Button
            Button(action: onOpenTOC) {
                Image(systemName: "list.bullet")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.primary)
                    .frame(width: 36, height: 36)
                    .background(.ultraThinMaterial, in: Circle())
            }

            // Reader Settings Button
            Button(action: onOpenSettings) {
                Image(systemName: "textformat.size")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.primary)
                    .frame(width: 36, height: 36)
                    .background(.ultraThinMaterial, in: Circle())
            }
        }
        .padding(.horizontal, DesignTokens.spacingLG)
        .padding(.vertical, DesignTokens.spacingSM)
        .background(.ultraThinMaterial)
        .overlay(
            Divider().overlay(Color.primary.opacity(0.08)),
            alignment: .bottom
        )
    }
}

#Preview {
    ReaderChromeView(
        title: "Sổ tay kiến trúc hệ thống",
        currentPageIndex: 2,
        totalPages: 10,
        isBookmarked: true,
        onBack: {},
        onToggleBookmark: {},
        onOpenTOC: {},
        onOpenSettings: {}
    )
}
