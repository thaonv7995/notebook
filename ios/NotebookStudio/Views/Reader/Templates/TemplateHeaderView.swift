import SwiftUI

/// Shared functional header for notebook template pages.
/// Matches `templates.css` `.functional-header` with vintage stationery aesthetics:
/// - Purpose badge with sharp rectangular border
/// - Monogrammed signature seal cartouche
/// - Serif topic label with classic underline field
/// - Date, Number, Deadline, and status pills (TODO / WIP / DONE)
struct TemplateHeaderView: View {
    let purposeIcon: String
    let purposeTitle: String
    let topicLabel: String
    let topic: String?
    let date: String?
    let number: String?
    var numberLabel: String = "NO."
    var author: String? = "@thaonv"
    var sealSubLabel: String = "ARCHIVE"
    var deadline: String? = nil
    var status: String? = nil
    var onStatusChange: ((String) -> Void)? = nil

    @ObservedObject private var settings = ReaderSettings.shared
    @State private var currentStatus: String = "WIP"

    private var effectiveStatus: String {
        status ?? currentStatus
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // MARK: - Row 1: Header Top Meta (Purpose badge + Signature Seal)
            HStack(alignment: .center) {
                // Purpose badge (Sharp rectangular border matching web)
                HStack(spacing: 4) {
                    Text(purposeIcon)
                        .font(.system(size: 9))
                    Text(purposeTitle.uppercased())
                        .font(.jakartaSans(size: 8.5, weight: .bold))
                        .tracking(1.2)
                }
                .foregroundStyle(settings.paperTone.textColor)
                .padding(.horizontal, 6)
                .padding(.vertical, 2.5)
                .background(settings.paperTone.backgroundColor)
                .overlay(
                    Rectangle()
                        .stroke(settings.paperTone.lineColor, lineWidth: 1)
                )

                Spacer()

                // Signature Seal Cartouche (@thaonv • ARCHIVE)
                if let author = author, !author.isEmpty {
                    VStack(spacing: 1) {
                        Text(author.hasPrefix("@") ? author : "@\(author)")
                            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                            .foregroundStyle(settings.paperTone.textColor)
                        Text(sealSubLabel.uppercased())
                            .font(.jakartaSans(size: 5.5, weight: .bold))
                            .tracking(1.0)
                            .foregroundStyle(settings.paperTone.secondaryColor)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(settings.paperTone.backgroundColor)
                    .overlay(
                        RoundedRectangle(cornerRadius: 2)
                            .stroke(settings.paperTone.textColor.opacity(0.85), lineWidth: 1.2)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 2)
                            .stroke(settings.paperTone.lineColor.opacity(0.5), lineWidth: 0.5)
                            .padding(1)
                    )
                }
            }

            // MARK: - Row 2: Header Main Field (Serif label + Underline field)
            HStack(alignment: .bottom, spacing: 6) {
                Text(topicLabel.uppercased())
                    .font(.system(size: 12.5, weight: .bold, design: .serif))
                    .tracking(0.8)
                    .foregroundStyle(settings.paperTone.textColor)
                    .layoutPriority(1)

                VStack(spacing: 0) {
                    Text((topic?.isEmpty ?? true) ? " " : (topic ?? " "))
                        .font(.jakartaSans(size: 13, weight: .semibold))
                        .foregroundStyle(settings.paperTone.textColor)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                        .padding(.bottom, 2)

                    Rectangle()
                        .fill(settings.paperTone.textColor.opacity(0.85))
                        .frame(height: 1.3)
                }
            }
            .padding(.top, 1)

            // MARK: - Row 3: Sub-fields (Date, Deadline, Status Pills, No.)
            HStack(alignment: .center, spacing: 10) {
                // Date sub-field
                HStack(spacing: 4) {
                    Text("DATE:")
                        .font(.jakartaSans(size: 9.5, weight: .bold))
                        .foregroundStyle(settings.paperTone.secondaryColor)

                    VStack(spacing: 0) {
                        Text(date ?? "   /   /      ")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundStyle(settings.paperTone.textColor)
                            .padding(.horizontal, 2)
                            .padding(.bottom, 1)

                        Rectangle()
                            .fill(settings.paperTone.lineColor)
                            .frame(height: 1)
                    }
                    .frame(minWidth: 70)
                }

                // Optional Deadline sub-field
                if let deadline = deadline, !deadline.isEmpty {
                    HStack(spacing: 4) {
                        Text("DEADLINE:")
                            .font(.jakartaSans(size: 9.5, weight: .bold))
                            .foregroundStyle(settings.paperTone.secondaryColor)

                        VStack(spacing: 0) {
                            Text(deadline)
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .foregroundStyle(settings.paperTone.textColor)
                                .padding(.horizontal, 2)
                                .padding(.bottom, 1)

                            Rectangle()
                                .fill(settings.paperTone.lineColor)
                                .frame(height: 1)
                        }
                        .frame(minWidth: 65)
                    }
                }

                Spacer()

                // Optional Work Status Pills
                if status != nil || onStatusChange != nil {
                    HStack(spacing: 3) {
                        statusPill(title: "[ ] TODO", isActive: effectiveStatus == "TODO", activeBg: "#fee2e2", activeBorder: "#ef4444", activeText: "#b91c1c") {
                            currentStatus = "TODO"
                            onStatusChange?("TODO")
                        }
                        statusPill(title: "[ ] WIP", isActive: effectiveStatus == "WIP" || effectiveStatus.isEmpty, activeBg: "#fef3c7", activeBorder: "#f59e0b", activeText: "#b45309") {
                            currentStatus = "WIP"
                            onStatusChange?("WIP")
                        }
                        statusPill(title: "[✓] DONE", isActive: effectiveStatus == "DONE", activeBg: "#dcfce7", activeBorder: "#22c55e", activeText: "#15803d") {
                            currentStatus = "DONE"
                            onStatusChange?("DONE")
                        }
                    }
                }

                // Page Number sub-field
                if let number = number, !number.isEmpty {
                    HStack(spacing: 4) {
                        Text(numberLabel)
                            .font(.jakartaSans(size: 9.5, weight: .bold))
                            .foregroundStyle(settings.paperTone.secondaryColor)

                        VStack(spacing: 0) {
                            Text(number)
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .foregroundStyle(settings.paperTone.textColor)
                                .padding(.horizontal, 3)
                                .padding(.bottom, 1)

                            Rectangle()
                                .fill(settings.paperTone.lineColor)
                                .frame(height: 1)
                        }
                        .frame(minWidth: 32)
                    }
                }
            }
            .padding(.top, 1)
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 6)
        .onAppear {
            if let status = status {
                currentStatus = status
            }
        }
    }

    private func statusPill(
        title: String,
        isActive: Bool,
        activeBg: String,
        activeBorder: String,
        activeText: String,
        onTap: @escaping () -> Void
    ) -> some View {
        Button(action: onTap) {
            Text(title)
                .font(.jakartaSans(size: 8, weight: .bold))
                .foregroundStyle(isActive ? Color(hex: activeText) : settings.paperTone.secondaryColor)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(isActive ? Color(hex: activeBg) : settings.paperTone.backgroundColor)
                .overlay(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(isActive ? Color(hex: activeBorder) : settings.paperTone.lineColor, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    VStack(spacing: 20) {
        TemplateHeaderView(
            purposeIcon: "✦",
            purposeTitle: "STUDY JOURNAL",
            topicLabel: "SUBJECT / TOPIC:",
            topic: "Lập trình iOS với SwiftUI",
            date: "04/10/2026",
            number: "01",
            author: "thaonv",
            sealSubLabel: "STUDY ARCHIVE"
        )

        TemplateHeaderView(
            purposeIcon: "💼",
            purposeTitle: "WORK & PROJECT",
            topicLabel: "PROJECT / OBJECTIVE:",
            topic: "Xây dựng ứng dụng di động",
            date: "04/10/2026",
            number: "02",
            author: "thaonv",
            sealSubLabel: "WORK ARCHIVE",
            deadline: "10/10/2026",
            status: "WIP"
        )
    }
    .padding()
    .background(Color(hex: "#FAF5E8"))
}
