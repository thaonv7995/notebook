import SwiftUI

/// Top navigation bar chrome for ReaderView (P5-2).
/// Displays:
/// - Back button
/// - Title & page counter
/// - Action buttons: Edit Toggle, Bookmark (P5-22), TOC (P5-23), More Menu
struct ReaderChromeView: View {
    let title: String
    let currentPageIndex: Int
    let totalPages: Int
    let isBookmarked: Bool
    var isEditMode: Bool = false

    let onBack: () -> Void
    let onToggleBookmark: () -> Void
    var onToggleEditMode: (() -> Void)? = nil
    let onOpenTOC: () -> Void
    let onOpenSettings: () -> Void
    var onOpenQuickNote: (() -> Void)? = nil
    var onShare: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 0) {
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

                // Edit Mode Toggle Button
                if let onToggleEditMode = onToggleEditMode {
                    Button(action: onToggleEditMode) {
                        HStack(spacing: 5) {
                            Image(systemName: isEditMode ? "checkmark.circle.fill" : "pencil")
                                .font(.system(size: 15, weight: .semibold))
                            if isEditMode {
                                Text("Xong")
                                    .font(.jakartaSans(size: 13, weight: .bold))
                            }
                        }
                        .foregroundStyle(isEditMode ? Color.white : Color.primary)
                        .padding(.horizontal, isEditMode ? 12 : 0)
                        .frame(height: 36)
                        .frame(minWidth: 36)
                        .background(isEditMode ? DesignTokens.accentLight : Color.clear)
                        .background(.ultraThinMaterial, in: Capsule())
                        .shadow(color: isEditMode ? DesignTokens.accentLight.opacity(0.35) : .clear, radius: 6, y: 2)
                    }
                }

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

                // More Options Menu (Quick Note, Share, Settings)
                Menu {
                    if let onOpenQuickNote = onOpenQuickNote {
                        Button(action: onOpenQuickNote) {
                            Label("Ghi chú nhanh", systemImage: "square.and.pencil")
                        }
                    }

                    if let onShare = onShare {
                        Button(action: onShare) {
                            Label("Chia sẻ trang", systemImage: "square.and.arrow.up")
                        }
                    }

                    Button(action: onOpenSettings) {
                        Label("Tùy biến hiển thị", systemImage: "textformat.size")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(.primary)
                        .frame(width: 36, height: 36)
                        .background(.ultraThinMaterial, in: Circle())
                }
            }
            .padding(.horizontal, DesignTokens.spacingLG)
            .padding(.vertical, DesignTokens.spacingSM)

            // Editing Indicator Banner
            if isEditMode {
                HStack(spacing: 6) {
                    Image(systemName: "pencil.line")
                        .font(.system(size: 11, weight: .semibold))
                    Text("Đang ở chế độ chỉnh sửa • Chạm vào ô để nhập hoặc đánh dấu")
                        .font(.jakartaSans(size: 11, weight: .semibold))
                }
                .foregroundStyle(DesignTokens.accentLight)
                .padding(.horizontal, 14)
                .padding(.vertical, 5)
                .background(.ultraThinMaterial, in: Capsule())
                .overlay(Capsule().stroke(DesignTokens.accentLight.opacity(0.35), lineWidth: 1))
                .padding(.bottom, 6)
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            Divider().overlay(Color.primary.opacity(0.08))
        }
        .background(.ultraThinMaterial)
    }
}

#Preview {
    ReaderChromeView(
        title: "Sổ tay kiến trúc hệ thống",
        currentPageIndex: 2,
        totalPages: 10,
        isBookmarked: true,
        isEditMode: true,
        onBack: {},
        onToggleBookmark: {},
        onToggleEditMode: {},
        onOpenTOC: {},
        onOpenSettings: {}
    )
}
