import SwiftUI

/// Work & Project Log Template View (P5-9)
/// Matches web `work-container`:
/// - Header: Project, Date, Deadline, Status pills (TODO, WIP, DONE)
/// - Top Split: Agenda & Decisions (left) | Notes & Discussions (right) on ruled lines
/// - Bottom Area: 5 Action Item rows with interactive checkboxes and underline lines
struct WorkPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    @State private var actions: [ActionItem] = []
    @State private var currentStatus: String = "WIP"

    init(page: Page) {
        self.page = page
        let initialActions = page.actions ?? []
        var list = initialActions
        while list.count < 5 {
            list.append(ActionItem(checked: false, text: ""))
        }
        _actions = State(initialValue: list)
        _currentStatus = State(initialValue: page.status ?? "WIP")
    }

    var body: some View {
        A4PaperSheetView(systemTitle: "WORK & PROJECT LOG", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(spacing: 0) {
                // Functional Header with Deadline and Status Pills
                TemplateHeaderView(
                    purposeIcon: "💼",
                    purposeTitle: "WORK & PROJECT",
                    topicLabel: "PROJECT / OBJECTIVE:",
                    topic: page.project ?? page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "WORK ARCHIVE",
                    deadline: page.deadline,
                    status: currentStatus,
                    onStatusChange: { newStatus in
                        currentStatus = newStatus
                    }
                )

                // Work Container with 1.5pt crisp border
                VStack(spacing: 0) {
                    // Split Body: Agenda (left 32%) + Discussions (right 68%)
                    HStack(alignment: .top, spacing: 0) {
                        // Left Column: Agenda & Decisions
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "AGENDA & DECISIONS")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: page.agenda, customFontSize: CGFloat(settings.fontSize - 1.5))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 220)
                        }
                        .frame(width: 115)

                        // Vertical dividing line
                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(width: 1.5)

                        // Right Column: Notes & Discussions
                        VStack(alignment: .leading, spacing: 0) {
                            ColumnGuideBar(title: "NOTES & DISCUSSIONS")

                            ZStack(alignment: .topLeading) {
                                RuledBackgroundView(lineHeight: 26, lineColor: settings.paperTone.lineColor.opacity(0.45))

                                RichTextView(html: (page.discussions?.isEmpty ?? true) ? page.content : page.discussions)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                            }
                            .frame(minHeight: 220)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Horizontal dividing line
                    Rectangle()
                        .fill(settings.paperTone.lineColor)
                        .frame(height: 1.5)

                    // Bottom Action Area: 5 Action Item Rows matching web .action-row
                    VStack(spacing: 0) {
                        ForEach(0..<min(5, actions.count), id: \.self) { idx in
                            actionRow(idx: idx)
                        }
                    }
                    .background(settings.paperTone.backgroundColor)
                }
                .overlay(
                    Rectangle()
                        .stroke(settings.paperTone.lineColor, lineWidth: 1.5)
                )
            }
        }
    }

    // MARK: - Action Item Row matching web .action-row

    private func actionRow(idx: Int) -> some View {
        let item = actions[idx]

        return HStack(spacing: 6) {
            // Checkbox button [ ] / [✓]
            Button {
                actions[idx].checked.toggle()
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(item.checked ? Color(hex: "#16a34a") : settings.paperTone.textColor, lineWidth: 1.2)
                        .background(
                            item.checked ? Color(hex: "#16a34a") : Color.clear,
                            in: RoundedRectangle(cornerRadius: 2)
                        )
                        .frame(width: 14, height: 14)

                    if item.checked {
                        Image(systemName: "checkmark")
                            .font(.system(size: 9, weight: .black))
                            .foregroundStyle(.white)
                    }
                }
            }
            .buttonStyle(.plain)

            // First row badge
            if idx == 0 {
                Text("ACTION ITEMS & NEXT STEPS")
                    .font(.jakartaSans(size: 7.5, weight: .bold))
                    .tracking(0.8)
                    .foregroundStyle(settings.paperTone.textColor)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 1.5)
                    .background(settings.paperTone.backgroundColor)
                    .overlay(
                        Rectangle()
                            .stroke(settings.paperTone.lineColor, lineWidth: 1)
                    )
            }

            // Action line text with strikethrough if done
            Text(item.text.isEmpty ? (idx == 0 && actions[0].text.isEmpty ? "Thêm hành động cần làm..." : " ") : item.text)
                .font(settings.fontFamily.font(size: CGFloat(settings.fontSize - 1.5)))
                .strikethrough(item.checked, color: settings.paperTone.secondaryColor)
                .foregroundStyle(item.checked ? settings.paperTone.secondaryColor : (item.text.isEmpty ? settings.paperTone.secondaryColor.opacity(0.4) : settings.paperTone.textColor))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 8)
        .frame(height: 28)
        .overlay(
            Rectangle()
                .fill(settings.paperTone.lineColor.opacity(0.6))
                .frame(height: idx < 4 ? 1 : 0),
            alignment: .bottom
        )
    }
}

#Preview {
    WorkPageView(page: Page(
        id: "work-1",
        template: .work,
        project: "Notebook Studio iOS",
        deadline: "10/10/2026",
        status: "WIP",
        agenda: "<p>Kickoff sprint 1: Hoàn thiện Phase 5 Reader View.</p>",
        discussions: "<p>Thảo luận về hiệu năng SwiftUI TabView và cơ chế zoom ảnh base64.</p>",
        actions: [
            ActionItem(checked: true, text: "Viết HTMLParser và RichTextView"),
            ActionItem(checked: false, text: "Hoàn thiện 10 template views"),
            ActionItem(checked: false, text: "Kiểm thử trên simulator")
        ]
    ))
}
