import SwiftUI

/// Work & Project Log Template View (P5-9)
/// Layout:
/// - Header: Project, Deadline, Status badge (TODO, WIP, DONE)
/// - Agenda & Key Objectives
/// - 2 Columns or stacked sections: Discussions/Notes + Action Items checklist
struct WorkPageView: View {
    let page: Page
    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        A4PaperSheetView(systemTitle: "WORK SYSTEM", pageNumber: Int(page.no ?? "1") ?? 1) {
            VStack(alignment: .leading, spacing: DesignTokens.spacingMD) {
                // Header
                TemplateHeaderView(
                    purposeIcon: "💼",
                    purposeTitle: "WORK & PROJECT",
                    topicLabel: "PROJECT / OBJECTIVE:",
                    topic: page.project ?? page.topic ?? page.title,
                    date: page.date,
                    number: page.no,
                    author: "@thaonv",
                    sealSubLabel: "WORK ARCHIVE"
                )

                // Sub-header: Deadline + Status badge
                HStack(spacing: DesignTokens.spacingMD) {
                    if let deadline = page.deadline, !deadline.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 11))
                                .foregroundStyle(.red.opacity(0.8))
                            Text("DEADLINE:")
                                .font(.jakartaSans(size: 10, weight: .bold))
                                .foregroundStyle(settings.paperTone.secondaryColor)
                            Text(deadline)
                                .font(.jakartaSans(size: 11, weight: .semibold))
                                .foregroundStyle(settings.paperTone.textColor)
                        }
                    }

                    Spacer()

                    // Status Badge
                    if let status = page.status, !status.isEmpty {
                        statusBadge(status)
                    }
                }
                .padding(.horizontal, DesignTokens.spacingLG)

                // Agenda Section
                if let agenda = page.agenda, !agenda.isEmpty {
                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        sectionBadge(title: "AGENDA & OBJECTIVES", icon: "target")
                        RichTextView(html: agenda)
                    }
                    .padding(.horizontal, DesignTokens.spacingLG)
                    .padding(.top, DesignTokens.spacingXS)

                    Divider()
                        .overlay(settings.paperTone.lineColor)
                        .padding(.horizontal, DesignTokens.spacingLG)
                }

                // Discussions & Detailed Notes
                VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                    sectionBadge(title: "DISCUSSIONS & NOTES", icon: "text.bubble")
                    RichTextView(html: (page.discussions?.isEmpty ?? true) ? page.content : page.discussions)
                }
                .padding(.horizontal, DesignTokens.spacingLG)

                // Action Items Checklist
                if let actions = page.actions, !actions.isEmpty {
                    Divider()
                        .overlay(settings.paperTone.lineColor)
                        .padding(.horizontal, DesignTokens.spacingLG)

                    VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                        sectionBadge(title: "ACTION ITEMS & NEXT STEPS", icon: "checklist")

                        VStack(alignment: .leading, spacing: DesignTokens.spacingSM) {
                            ForEach(Array(actions.enumerated()), id: \.offset) { _, item in
                                HStack(alignment: .top, spacing: DesignTokens.spacingSM) {
                                    Image(systemName: item.checked ? "checkmark.square.fill" : "square")
                                        .font(.system(size: 16))
                                        .foregroundStyle(item.checked ? DesignTokens.accentLight : settings.paperTone.secondaryColor)

                                    Text(item.text)
                                        .font(settings.fontFamily.font(size: CGFloat(settings.fontSize)))
                                        .strikethrough(item.checked)
                                        .foregroundStyle(item.checked ? settings.paperTone.secondaryColor : settings.paperTone.textColor)
                                }
                                .padding(.vertical, 2)
                            }
                        }
                    }
                    .padding(.horizontal, DesignTokens.spacingLG)
                }
            }
        }
    }

    private func statusBadge(_ status: String) -> some View {
        let (color, text): (Color, String) = {
            switch status.uppercased() {
            case "DONE": return (.green, "DONE")
            case "WIP": return (.orange, "IN PROGRESS")
            default: return (.blue, "TO DO")
            }
        }()

        return HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(text)
                .font(.jakartaSans(size: 10, weight: .bold))
                .tracking(1.0)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.12), in: Capsule())
    }

    private func sectionBadge(title: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .bold))
            Text(title)
                .font(.jakartaSans(size: 10, weight: .bold))
                .tracking(1.0)
        }
        .foregroundStyle(DesignTokens.accentLight)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(DesignTokens.accentLight.opacity(0.1), in: RoundedRectangle(cornerRadius: 4))
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
