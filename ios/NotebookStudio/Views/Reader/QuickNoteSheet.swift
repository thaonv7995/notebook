import SwiftUI

/// Bottom sheet for appending quick personal notes to the active page (P8-11).
struct QuickNoteSheet: View {
    let pageTopic: String
    @Binding var text: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var noteContent: String = ""

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: DesignTokens.spacingMD) {
                Text("Thêm ghi chú cá nhân vào trang: **\(pageTopic)**")
                    .font(.jakartaSans(size: 13))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, DesignTokens.spacingLG)
                    .padding(.top, DesignTokens.spacingSM)

                TextEditor(text: $noteContent)
                    .font(.jakartaSans(size: 15))
                    .padding(DesignTokens.spacingMD)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
                    .padding(.horizontal, DesignTokens.spacingLG)
                    .overlay(
                        Group {
                            if noteContent.isEmpty {
                                Text("Nhập suy nghĩ, ý tưởng nhanh hoặc nhắc nhở...")
                                    .font(.jakartaSans(size: 14))
                                    .foregroundStyle(.tertiary)
                                    .padding(.leading, 32)
                                    .padding(.top, 24)
                                    .allowsHitTesting(false)
                            }
                        },
                        alignment: .topLeading
                    )

                Spacer()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Ghi chú nhanh")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Hủy") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Lưu") {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        onSave(noteContent)
                        dismiss()
                    }
                    .font(.jakartaSans(size: 15, weight: .bold))
                    .foregroundStyle(DesignTokens.accentLight)
                    .disabled(noteContent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    QuickNoteSheet(
        pageTopic: "Kiến trúc hệ thống",
        text: .constant(""),
        onSave: { _ in }
    )
}
