import SwiftUI

/// Top navigation bar chrome for ReaderView, matching the header in bilingual-app.
/// Displays:
/// - Back button (chevron.left)
/// - Title
/// - Page counter pill (e.g. 1/10) that opens Jump To Page dialog
/// - Edit mode button (pencil / checkmark.circle.fill)
/// - Bookmark button
/// - TOC button
/// - Menu (Settings, Share, Quick note)
struct ReaderChromeView: View {
    let title: String
    let currentPageIndex: Int
    let totalPages: Int
    let isBookmarked: Bool
    var isEditMode: Bool = false

    let onBack: () -> Void
    let onToggleBookmark: () -> Void
    var onToggleEditMode: (() -> Void)? = nil
    var onOpenJumpToPage: (() -> Void)? = nil
    var onDecreaseFont: (() -> Void)? = nil
    var onIncreaseFont: (() -> Void)? = nil
    let onOpenTOC: () -> Void
    let onOpenSettings: () -> Void
    var onOpenQuickNote: (() -> Void)? = nil
    var onShare: (() -> Void)? = nil

    private let isPhone = UIDevice.current.userInterfaceIdiom == .phone

    var body: some View {
        HStack(spacing: 8) {
            // Back Button
            Button(action: {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onBack()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 32, height: 32)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
            }

            // Notebook Title
            Text(title)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // iPad-only: Font Stepper Buttons (A- / A+)
            if !isPhone && (onDecreaseFont != nil || onIncreaseFont != nil) {
                HStack(spacing: 0) {
                    Button(action: {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        onDecreaseFont?()
                    }) {
                        Text("A-")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.85))
                            .frame(width: 28, height: 28)
                            .contentShape(Rectangle())
                    }

                    Rectangle()
                        .fill(Color.white.opacity(0.15))
                        .frame(width: 1, height: 14)

                    Button(action: {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        onIncreaseFont?()
                    }) {
                        Text("A+")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white.opacity(0.85))
                            .frame(width: 28, height: 28)
                            .contentShape(Rectangle())
                    }
                }
                .frame(height: 28)
                .background(Color(hex: "1e293b"))
                .cornerRadius(6)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
            }

            // Tappable Page Counter Pill (Jump to Page Dialog)
            Button(action: {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onOpenJumpToPage?()
            }) {
                Text("\(currentPageIndex + 1)/\(max(1, totalPages))")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .frame(height: 28)
                    .background(Color(hex: "1e293b"))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
            }

            // Edit Mode Toggle Button
            if let onToggleEditMode = onToggleEditMode {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onToggleEditMode()
                }) {
                    Group {
                        if isEditMode {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 12, weight: .bold))
                                Text("Xong")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .frame(height: 28)
                            .background(Color(hex: "d97706"))
                            .cornerRadius(6)
                        } else {
                            Image(systemName: "pencil")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(width: 32, height: 28)
                                .background(Color(hex: "1e293b"))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                )
                        }
                    }
                }
            }

            // iPad-only direct TOC & Bookmark buttons
            if !isPhone {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onToggleBookmark()
                }) {
                    Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(isBookmarked ? Color(hex: "f59e0b") : .white)
                        .frame(width: 28, height: 28)
                }

                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onOpenTOC()
                }) {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 28, height: 28)
                }
            }

            // More Options Menu (Streamlined, no clutter)
            Menu {
                // If on Phone, include Bookmark and TOC in Menu
                if isPhone {
                    Button(action: onToggleBookmark) {
                        Label(
                            isBookmarked ? "Bỏ đánh dấu trang này" : "Đánh dấu trang này",
                            systemImage: isBookmarked ? "bookmark.fill" : "bookmark"
                        )
                    }

                    Button(action: onOpenTOC) {
                        Label("Mục lục (\(totalPages) trang)", systemImage: "list.bullet")
                    }

                    Divider()

                    if let onIncrease = onIncreaseFont {
                        Button(action: onIncrease) {
                            Label("Chữ to hơn (A+)", systemImage: "textformat.size.larger")
                        }
                    }

                    if let onDecrease = onDecreaseFont {
                        Button(action: onDecrease) {
                            Label("Chữ nhỏ hơn (A-)", systemImage: "textformat.size.smaller")
                        }
                    }

                    Divider()
                }

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
                    Label("Tùy biến hiển thị", systemImage: "slider.horizontal.3")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 32, height: 28)
                    .background(Color(hex: "1e293b"))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(Color(hex: "0f172a"))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 0.5)
        }
    }
}

typealias ReaderHeaderView = ReaderChromeView

#Preview {
    ReaderChromeView(
        title: "Sổ tay kiến trúc hệ thống",
        currentPageIndex: 2,
        totalPages: 10,
        isBookmarked: true,
        isEditMode: false,
        onBack: {},
        onToggleBookmark: {},
        onToggleEditMode: {},
        onOpenJumpToPage: {},
        onOpenTOC: {},
        onOpenSettings: {}
    )
}
