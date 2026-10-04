import SwiftUI

/// Table of Contents drawer/sheet listing all pages in the notebook (P5-23).
struct TableOfContentsView: View {
    let notebook: Notebook
    @Binding var currentPageIndex: Int
    @ObservedObject var bookmarkStore = BookmarkStore.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0f172a")
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(Array(notebook.pages.enumerated()), id: \.element.id) { index, page in
                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                currentPageIndex = index
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    // Page number badge
                                    Text("\(index + 1)")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(index == currentPageIndex ? Color(hex: "2dd4bf") : .white)
                                        .frame(width: 28, height: 28)
                                        .background(index == currentPageIndex ? Color(hex: "2dd4bf").opacity(0.2) : Color.white.opacity(0.08))
                                        .clipShape(Circle())

                                    // Template icon
                                    Image(systemName: page.template.iconName)
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "38bdf8"))
                                        .frame(width: 20)

                                    // Title & Template Name
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text((page.topic ?? page.title ?? "Trang \(index + 1)").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Trang \(index + 1)" : (page.topic ?? page.title ?? "Trang \(index + 1)"))
                                            .font(.system(size: 14, weight: index == currentPageIndex ? .bold : .medium))
                                            .foregroundColor(.white)
                                            .lineLimit(1)

                                        Text(page.template.displayName)
                                            .font(.system(size: 11))
                                            .foregroundColor(Color(hex: "94a3b8"))
                                    }

                                    Spacer()

                                    // Bookmark indicator
                                    if bookmarkStore.isBookmarked(pageId: page.id) {
                                        Image(systemName: "bookmark.fill")
                                            .font(.system(size: 13))
                                            .foregroundColor(Color(hex: "f59e0b"))
                                    }

                                    // Current page indicator
                                    if index == currentPageIndex {
                                        Text("Đang đọc")
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(Color(hex: "2dd4bf"))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 3)
                                            .background(Color(hex: "2dd4bf").opacity(0.15))
                                            .clipShape(Capsule())
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(Color(hex: "1e293b"))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(index == currentPageIndex ? Color(hex: "2dd4bf").opacity(0.4) : Color.white.opacity(0.06), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
            .navigationTitle("Mục lục (\(notebook.pages.count) trang)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Đóng") {
                        dismiss()
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(hex: "38bdf8"))
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
