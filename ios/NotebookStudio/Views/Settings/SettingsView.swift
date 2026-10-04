import SwiftUI

/// Settings tab — account, sync, reading preferences, appearance.
/// TODO: P6-6, P6-7 — Full implementation.
struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationStack {
            Form {
                // Account
                Section("Tài khoản") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(DesignTokens.accentLight)
                        VStack(alignment: .leading) {
                            Text(authViewModel.username.isEmpty ? "User" : authViewModel.username)
                                .font(.system(size: DesignTokens.fontSizeNotebookTitle, weight: .semibold))
                            Text("Đang đăng nhập")
                                .font(.system(size: DesignTokens.fontSizeCaption))
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button("Đổi mật khẩu", systemImage: "lock.rotation") {
                        // TODO: P6-6
                    }

                    Button("Đăng xuất", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                        authViewModel.logout()
                    }
                }

                // Sync
                Section("Đồng bộ") {
                    LabeledContent("Trạng thái", value: "Đã kết nối")
                    LabeledContent("Lần sync cuối", value: "—")
                    Button("Đồng bộ ngay", systemImage: "arrow.triangle.2.circlepath") {
                        // TODO: P3-3
                    }
                }

                // Reading
                Section("Đọc sách") {
                    LabeledContent("Font", value: "Jakarta Sans")
                    LabeledContent("Cỡ chữ", value: "16pt")
                    LabeledContent("Khoảng cách dòng", value: "28px")
                }

                // Appearance
                Section("Giao diện") {
                    LabeledContent("Chế độ", value: "Tự động")
                    LabeledContent("Tông giấy", value: "Giấy Kem")
                }

                // About
                Section("Thông tin") {
                    LabeledContent("Phiên bản", value: "1.0.0")
                    LabeledContent("Build", value: "1")
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthViewModel())
}
