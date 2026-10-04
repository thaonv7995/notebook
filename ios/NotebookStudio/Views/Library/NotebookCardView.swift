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

        NotebookCardView(notebook: Notebook(
            id: "nb-2",
            title: "Kế hoạch dự án Q4",
            category: "Công việc",
            coverGradient: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            lastPageIndex: 7,
            pages: (1...8).map { Page(id: "p-\($0)", template: .work) }
        ))

        NotebookCardView(notebook: Notebook(
            id: "nb-3",
            title: "Nhật ký cá nhân",
            category: "Cá nhân",
            coverGradient: "linear-gradient(45deg, #059669, #10b981)",
            lastPageIndex: 0,
            pages: [Page(id: "p-1", template: .ruled)]
        ))
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
