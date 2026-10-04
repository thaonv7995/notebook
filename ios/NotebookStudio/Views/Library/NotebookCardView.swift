import SwiftUI

/// A single notebook card in the library list.
///
/// Layout: [Gradient Thumbnail] [Title + Category + Progress] [Progress Ring]
/// Supports swipe actions: Pin, Delete.
struct NotebookCardView: View {
    let notebook: Notebook

    @State private var isPressed = false

    var body: some View {
        HStack(spacing: DesignTokens.spacingMD) {
            // Gradient thumbnail
            NotebookThumbnail(notebook: notebook)

            // Text info
            VStack(alignment: .leading, spacing: 4) {
                // Title
                Text(notebook.title)
                    .font(.jakartaSans(size: DesignTokens.fontSizeNotebookTitle, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(2)

                // Category + Template
                HStack(spacing: 6) {
                    Text(notebook.category)
                        .font(.jakartaSans(size: DesignTokens.fontSizeBadge, weight: .medium))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(DesignTokens.accentLight.opacity(0.8), in: Capsule())

                    Image(systemName: notebook.primaryTemplate.iconName)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)

                    Text(notebook.primaryTemplate.displayName)
                        .font(.jakartaSans(size: DesignTokens.fontSizeBadge))
                        .foregroundStyle(.secondary)
                }

                // Pages count + Last updated
                HStack(spacing: 4) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 10))
                    Text("\(notebook.pageCount) trang")
                    Text("·")
                    Text(formattedDate(notebook.updatedAt))
                }
                .font(.jakartaSans(size: DesignTokens.fontSizeBadge))
                .foregroundStyle(.tertiary)
            }

            Spacer(minLength: 4)

            // Progress ring
            ProgressRing(progress: notebook.readingProgress)
                .frame(width: 38, height: 38)
        }
        .padding(DesignTokens.spacingMD)
        .background {
            RoundedRectangle(cornerRadius: DesignTokens.radiusMD)
                .fill(.background)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        }
        .overlay {
            if notebook.isPinned {
                // Pin indicator
                VStack {
                    HStack {
                        Spacer()
                        Image(systemName: "pin.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(DesignTokens.accentLight)
                            .padding(4)
                    }
                    Spacer()
                }
            }
        }
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.easeOut(duration: 0.15), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }

    // MARK: - Date Formatting

    private func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else {
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: isoString) else {
                return isoString
            }
            return relativeDate(date)
        }
        return relativeDate(date)
    }

    private func relativeDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Notebook Thumbnail

/// Mini cover thumbnail parsed from CSS gradient.
struct NotebookThumbnail: View {
    let notebook: Notebook

    var body: some View {
        ZStack {
            // Gradient background
            GradientParser.gradient(from: notebook.coverGradient)

            // Book icon + page count
            VStack(spacing: 2) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 18))
                Text("\(notebook.pageCount)")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
            }
            .foregroundStyle(Color(hex: notebook.coverTextColor))
        }
        .frame(width: 56, height: 72)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusSM))
        .shadow(color: .black.opacity(0.15), radius: 3, y: 1)
    }
}

// MARK: - Progress Ring

/// Circular progress indicator showing reading progress.
struct ProgressRing: View {
    let progress: Double

    private let lineWidth: CGFloat = 3.5

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(.quaternary, lineWidth: lineWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    progressGradient,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Percentage text
            Text(progressText)
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(progress >= 1.0 ? .green : .secondary)
        }
    }

    private var progressGradient: AngularGradient {
        AngularGradient(
            colors: progress >= 1.0
                ? [.green, .green]
                : [DesignTokens.accentLight, DesignTokens.accentDark],
            center: .center,
            startAngle: .degrees(-90),
            endAngle: .degrees(-90 + 360 * progress)
        )
    }

    private var progressText: String {
        if progress >= 1.0 { return "✓" }
        return "\(Int(progress * 100))%"
    }
}

// MARK: - Notebook Book Card (Bilingual-app style shelf item)

struct NotebookBookCard: View {
    let notebook: Notebook
    let onSelect: () -> Void
    var onShowDetail: (() -> Void)? = nil
    let onTogglePriority: () -> Void
    let onStartReading: () -> Void

    @ObservedObject private var progressStore = ReadingProgressStore.shared

    private var currentProgressPage: Int {
        progressStore.lastPageIndex(for: notebook.id)
    }

    private var progressRatio: Double {
        guard notebook.pageCount > 0 else { return 0 }
        return min(1.0, max(0.0, Double(currentProgressPage + 1) / Double(notebook.pageCount)))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Book Cover Wrapper (Aspect ratio 154 / 220)
            ZStack {
                // Background Gradient
                GradientParser.gradient(from: notebook.coverGradient)

                // Spine highlight effect (left edge)
                HStack(spacing: 0) {
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.22),
                            Color.white.opacity(0.08),
                            Color.clear,
                            Color.black.opacity(0.3)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: 8)

                    Rectangle()
                        .fill(Color.black.opacity(0.25))
                        .frame(width: 1)

                    Spacer()
                }

                // Inner Cover Pattern / Text
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        // Category Pill
                        Text(notebook.category)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white.opacity(0.9))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.35))
                            .clipShape(Capsule())

                        Spacer()

                        // Pin Indicator (if pinned)
                        if notebook.isPinned {
                            Image(systemName: "star.fill")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(hex: "fbbf24"))
                                .padding(5)
                                .background(Color.black.opacity(0.4))
                                .clipShape(Circle())
                        }
                    }

                    Spacer()

                    // Watermark / Icon of template
                    HStack {
                        Spacer()
                        Image(systemName: notebook.primaryTemplate.iconName)
                            .font(.system(size: 26))
                            .foregroundColor(Color(hex: notebook.coverTextColor).opacity(0.25))
                            .padding(.trailing, 8)
                            .padding(.bottom, 36)
                    }
                }
                .padding(10)

                // Bottom Gradient & Information Overlay (modeled after bilingual-app)
                VStack {
                    Spacer()

                    VStack(alignment: .leading, spacing: 4) {
                        // Author / Category
                        Text(notebook.author.isEmpty ? "@thaonv" : notebook.author)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                            .lineLimit(1)

                        // Progress Text + Updated
                        HStack(alignment: .firstTextBaseline) {
                            if notebook.pageCount > 0 {
                                Text("Trang \(currentProgressPage + 1)/\(notebook.pageCount)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(Color(hex: "2dd4bf"))
                            } else {
                                Text("\(notebook.pageCount) trang")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white.opacity(0.9))
                            }

                            Spacer()

                            Text(formattedRelativeDate(notebook.updatedAt))
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.7))
                        }

                        // Progress Bar (Teal)
                        if notebook.pageCount > 0 {
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color.white.opacity(0.2))
                                        .frame(height: 3)

                                    Capsule()
                                        .fill(Color(hex: "2dd4bf"))
                                        .frame(width: geo.size.width * CGFloat(progressRatio), height: 3)
                                }
                            }
                            .frame(height: 3)
                            .padding(.top, 2)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.top, 24)
                    .padding(.bottom, 10)
                    .background(
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.65), .black.opacity(0.95)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
            }
            .aspectRatio(154.0 / 220.0, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
            .contentShape(Rectangle())
            .onTapGesture {
                onSelect()
            }

            // Notebook Title & Star Button
            HStack(alignment: .top, spacing: 6) {
                Text(notebook.title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)

                Spacer(minLength: 0)

                Button(action: onTogglePriority) {
                    Image(systemName: notebook.isPinned ? "star.fill" : "star")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(notebook.isPinned ? Color(hex: "fbbf24") : .white.opacity(0.55))
                        .frame(width: 24, height: 24)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(notebook.isPinned ? "Bỏ ưu tiên" : "Ưu tiên đọc")
            }
            .frame(maxWidth: .infinity, minHeight: 40, alignment: .topLeading)
            .padding(.horizontal, 4)
            .contentShape(Rectangle())
            .onTapGesture {
                onSelect()
            }
        }
        .contextMenu {
            Button {
                onStartReading()
            } label: {
                Label("Mở đọc ngay", systemImage: "book.fill")
            }

            if let onShowDetail = onShowDetail {
                Button {
                    onShowDetail()
                } label: {
                    Label("Chi tiết & Mục lục", systemImage: "info.circle")
                }
            }

            Button {
                onTogglePriority()
            } label: {
                Label(notebook.isPinned ? "Bỏ ưu tiên" : "Ưu tiên đọc", systemImage: notebook.isPinned ? "star.slash" : "star.fill")
            }
        }
    }

    private func formattedRelativeDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let d = date else { return "" }
        let rel = RelativeDateTimeFormatter()
        rel.locale = Locale(identifier: "vi_VN")
        rel.unitsStyle = .abbreviated
        return rel.localizedString(for: d, relativeTo: Date())
    }
}

// MARK: - Notebook Detail Sheet (Bilingual-app style Book Detail Sheet)

struct NotebookDetailSheet: View {
    let notebook: Notebook
    let onStartReading: (Notebook, Int) -> Void
    let onTogglePriority: () -> Void

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var progressStore = ReadingProgressStore.shared

    private var currentProgressPage: Int {
        progressStore.lastPageIndex(for: notebook.id)
    }

    private var progressRatio: Double {
        guard notebook.pageCount > 0 else { return 0 }
        return min(1.0, max(0.0, Double(currentProgressPage + 1) / Double(notebook.pageCount)))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0f172a")
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // 3D Book Cover Presentation
                        ZStack {
                            GradientParser.gradient(from: notebook.coverGradient)

                            // Spine highlight effect
                            HStack(spacing: 0) {
                                LinearGradient(
                                    colors: [
                                        Color.white.opacity(0.25),
                                        Color.white.opacity(0.08),
                                        Color.clear,
                                        Color.black.opacity(0.3)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                                .frame(width: 10)

                                Rectangle()
                                    .fill(Color.black.opacity(0.3))
                                    .frame(width: 1)

                                Spacer()
                            }

                            // Center icon
                            VStack(spacing: 8) {
                                Image(systemName: "book.closed.fill")
                                    .font(.system(size: 38))
                                    .foregroundColor(Color(hex: notebook.coverTextColor).opacity(0.85))

                                Text("\(notebook.pageCount) trang")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundColor(Color(hex: notebook.coverTextColor).opacity(0.9))
                            }
                        }
                        .frame(width: 154, height: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: Color.black.opacity(0.55), radius: 14, x: 0, y: 8)
                        .padding(.top, 16)

                        // Title & Metadata
                        VStack(spacing: 8) {
                            Text(notebook.title)
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)

                            HStack(spacing: 8) {
                                Label(notebook.category, systemImage: "folder.fill")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "38bdf8"))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(Color(hex: "38bdf8").opacity(0.15))
                                    .clipShape(Capsule())

                                Label(notebook.primaryTemplate.displayName, systemImage: notebook.primaryTemplate.iconName)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "d97706"))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(Color(hex: "d97706").opacity(0.15))
                                    .clipShape(Capsule())

                                if !notebook.lang.isEmpty {
                                    Text(notebook.lang)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(Color(hex: "94a3b8"))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.white.opacity(0.08))
                                        .clipShape(Capsule())
                                }
                            }
                        }

                        // Reading Stats Card (Glassmorphism dark card #1e293b)
                        HStack(spacing: 0) {
                            statColumn(
                                value: "\(Int(progressRatio * 100))%",
                                label: "Tiến độ",
                                color: Color(hex: "2dd4bf")
                            )

                            Divider()
                                .background(Color.white.opacity(0.12))
                                .frame(height: 36)

                            statColumn(
                                value: notebook.pageCount > 0 ? "\(currentProgressPage + 1)/\(notebook.pageCount)" : "0/0",
                                label: "Trang hiện tại",
                                color: .white
                            )

                            Divider()
                                .background(Color.white.opacity(0.12))
                                .frame(height: 36)

                            statColumn(
                                value: progressRatio >= 1.0 ? "Đã xong" : (currentProgressPage > 0 ? "Đang đọc" : "Chưa đọc"),
                                label: "Trạng thái",
                                color: progressRatio >= 1.0 ? Color(hex: "22c55e") : Color(hex: "fbbf24")
                            )
                        }
                        .padding(.vertical, 16)
                        .background(Color(hex: "1e293b"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                        .padding(.horizontal, 20)

                        // Action Buttons
                        VStack(spacing: 12) {
                            // Primary Continue Reading Button
                            Button(action: {
                                dismiss()
                                onStartReading(notebook, currentProgressPage)
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "book.fill")
                                        .font(.system(size: 15, weight: .bold))
                                    Text(currentProgressPage > 0 ? "Tiếp tục đọc (Trang \(currentProgressPage + 1))" : "Bắt đầu đọc")
                                        .font(.system(size: 15, weight: .bold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(
                                    LinearGradient(
                                        colors: [Color(hex: "0284c7"), Color(hex: "0369a1")],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .shadow(color: Color(hex: "0284c7").opacity(0.35), radius: 8, y: 3)
                            }

                            // Secondary actions row
                            HStack(spacing: 12) {
                                Button(action: {
                                    dismiss()
                                    onStartReading(notebook, 0)
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "arrow.counterclockwise")
                                            .font(.system(size: 13))
                                        Text("Đọc từ đầu")
                                            .font(.system(size: 14, weight: .semibold))
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 42)
                                    .background(Color(hex: "1e293b"))
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                    )
                                }

                                Button(action: {
                                    onTogglePriority()
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: notebook.isPinned ? "star.fill" : "star")
                                            .font(.system(size: 13))
                                            .foregroundColor(notebook.isPinned ? Color(hex: "fbbf24") : .white)
                                        Text(notebook.isPinned ? "Đã ưu tiên" : "Ưu tiên")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.white)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 42)
                                    .background(notebook.isPinned ? Color(hex: "fbbf24").opacity(0.15) : Color(hex: "1e293b"))
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(notebook.isPinned ? Color(hex: "fbbf24").opacity(0.4) : Color.white.opacity(0.12), lineWidth: 1)
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, 20)

                        // Table of Contents Section
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Danh sách trang (\(notebook.pages.count))")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                Spacer()
                            }
                            .padding(.horizontal, 20)

                            if notebook.pages.isEmpty {
                                Text("Chưa có trang nào trong sổ tay này.")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color(hex: "94a3b8"))
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 8)
                            } else {
                                VStack(spacing: 8) {
                                    ForEach(Array(notebook.pages.enumerated()), id: \.element.id) { index, page in
                                        Button(action: {
                                            dismiss()
                                            onStartReading(notebook, index)
                                        }) {
                                            HStack(spacing: 12) {
                                                // Page number pill
                                                Text("\(index + 1)")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(index == currentProgressPage ? Color(hex: "2dd4bf") : .white)
                                                    .frame(width: 28, height: 28)
                                                    .background(index == currentProgressPage ? Color(hex: "2dd4bf").opacity(0.2) : Color.white.opacity(0.08))
                                                    .clipShape(Circle())

                                                // Page Title or Topic
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(pageTitle(page: page, index: index))
                                                        .font(.system(size: 14, weight: index == currentProgressPage ? .bold : .medium))
                                                        .foregroundColor(.white)
                                                        .lineLimit(1)

                                                    Text(page.template.displayName)
                                                        .font(.system(size: 11))
                                                        .foregroundColor(Color(hex: "94a3b8"))
                                                }

                                                Spacer()

                                                if index == currentProgressPage {
                                                    Text("Đang đọc")
                                                        .font(.system(size: 11, weight: .semibold))
                                                        .foregroundColor(Color(hex: "2dd4bf"))
                                                        .padding(.horizontal, 8)
                                                        .padding(.vertical, 3)
                                                        .background(Color(hex: "2dd4bf").opacity(0.15))
                                                        .clipShape(Capsule())
                                                }

                                                Image(systemName: "chevron.right")
                                                    .font(.system(size: 12, weight: .semibold))
                                                    .foregroundColor(Color(hex: "64748b"))
                                            }
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 10)
                                            .background(Color(hex: "1e293b"))
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 10)
                                                    .stroke(index == currentProgressPage ? Color(hex: "2dd4bf").opacity(0.4) : Color.white.opacity(0.06), lineWidth: 1)
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                        .padding(.top, 8)
                        .padding(.bottom, 36)
                    }
                }
            }
            .navigationTitle("Chi tiết sổ tay")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Xong") {
                        dismiss()
                    }
                    .foregroundColor(Color(hex: "38bdf8"))
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func statColumn(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "94a3b8"))
        }
        .frame(maxWidth: .infinity)
    }

    private func pageTitle(page: Page, index: Int) -> String {
        if let t = page.title, !t.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return t
        }
        if let topic = page.topic, !topic.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return topic
        }
        return "Trang \(index + 1)"
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 12) {
        NotebookCardView(notebook: Notebook(
            id: "nb-1",
            title: "Tiếng Trung cơ bản — HSK 1",
            category: "Học tập",
            lang: "EN · VI",
            coverGradient: "linear-gradient(135deg, #1e3a8a, #0f172a)",
            isPinned: true,
            lastPageIndex: 3,
            pages: (1...10).map { Page(id: "p-\($0)", template: .cornell) }
        ))
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
