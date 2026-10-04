import SwiftUI

/// Settings sheet for reader (Paper tone, Font family, Font size, Line height) (P5-19, P5-20).
struct ReaderSettingsSheet: View {
    @ObservedObject var settings = ReaderSettings.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                // Section 1: Paper Tone
                Section("Nền giấy (Paper Tone)") {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: DesignTokens.spacingSM) {
                        ForEach(PaperTone.allCases) { tone in
                            Button {
                                settings.paperTone = tone
                            } label: {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(tone.backgroundColor)
                                        .frame(width: 20, height: 20)
                                        .overlay(Circle().stroke(Color.gray.opacity(0.3), lineWidth: 1))

                                    Text(tone.displayName)
                                        .font(.jakartaSans(size: 14, weight: .medium))
                                        .foregroundStyle(tone.textColor)

                                    Spacer()

                                    if settings.paperTone == tone {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundStyle(DesignTokens.accentLight)
                                    }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(tone.backgroundColor, in: RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(settings.paperTone == tone ? DesignTokens.accentLight : Color.gray.opacity(0.2), lineWidth: settings.paperTone == tone ? 2 : 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Section 2: Font Family
                Section("Kiểu chữ (Font Family)") {
                    Picker("Font", selection: $settings.fontFamily) {
                        ForEach(ReaderFontFamily.allCases) { family in
                            Text(family.displayName).tag(family)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                // Section 3: Font Size
                Section("Cỡ chữ (Font Size: \(Int(settings.fontSize))pt)") {
                    HStack(spacing: DesignTokens.spacingMD) {
                        Image(systemName: "textformat.size.smaller")
                            .foregroundStyle(.secondary)

                        Slider(value: $settings.fontSize, in: 13...24, step: 1)
                            .tint(DesignTokens.accentLight)

                        Image(systemName: "textformat.size.larger")
                            .foregroundStyle(.secondary)
                    }
                }

                // Section 4: Line Spacing
                Section("Khoảng cách dòng") {
                    HStack(spacing: DesignTokens.spacingMD) {
                        Text("Chặt")
                            .font(.jakartaSans(size: 12))
                            .foregroundStyle(.secondary)

                        Slider(value: $settings.lineSpacing, in: 4...12, step: 1)
                            .tint(DesignTokens.accentLight)

                        Text("Thoáng")
                            .font(.jakartaSans(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Tùy biến hiển thị")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Xong") {
                        dismiss()
                    }
                    .font(.jakartaSans(size: 15, weight: .semibold))
                    .foregroundStyle(DesignTokens.accentLight)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    ReaderSettingsSheet()
}
