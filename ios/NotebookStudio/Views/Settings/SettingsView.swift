import SwiftUI

/// Settings tab — account, server sync, reading preferences, appearance, and cache management (P6-6).
struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = SettingsViewModel()
    @ObservedObject private var readerSettings = ReaderSettings.shared
    @ObservedObject private var biometricManager = BiometricAuthManager.shared

    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            Form {
                // Section 1: Account
                Section("Tài khoản") {
                    HStack(spacing: DesignTokens.spacingMD) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(DesignTokens.accentLight)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(authViewModel.username.isEmpty ? "Người dùng" : authViewModel.username)
                                .font(.jakartaSans(size: 16, weight: .bold))

                            Text("Đang đăng nhập")
                                .font(.jakartaSans(size: 12))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)

                    Button {
                        viewModel.showChangePasswordSheet = true
                    } label: {
                        Label("Đổi mật khẩu", systemImage: "key.fill")
                    }

                    Button(role: .destructive) {
                        showLogoutConfirmation = true
                    } label: {
                        Label("Đăng xuất", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }

                // Security Section
                Section("Bảo mật & Quyền riêng tư") {
                    Toggle(isOn: $biometricManager.isBiometricEnabled) {
                        Label("Khóa bằng \(biometricManager.biometricName)", systemImage: biometricManager.biometricIcon)
                    }
                    .tint(DesignTokens.accentLight)
                }

                // Section 2: Server & Sync
                Section("Máy chủ & Đồng bộ") {
                    LabeledContent("Địa chỉ máy chủ", value: viewModel.serverURL.isEmpty ? "Chưa cấu hình" : viewModel.serverURL)
                    LabeledContent("Lần đồng bộ cuối", value: viewModel.lastSyncedTime)

                    Button {
                        Task {
                            await viewModel.syncNow()
                        }
                    } label: {
                        HStack {
                            Label("Đồng bộ ngay", systemImage: "arrow.triangle.2.circlepath")
                            Spacer()
                            if viewModel.isSyncing {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                        }
                    }
                    .disabled(viewModel.isSyncing)

                    if let msg = viewModel.syncStatusMessage {
                        Text(msg)
                            .font(.jakartaSans(size: 12))
                            .foregroundStyle(.green)
                    }
                }

                // Section 3: Reading Preferences
                Section("Tùy chọn đọc sách") {
                    // Paper Tone Picker
                    Picker("Nền giấy mặc định", selection: $readerSettings.paperTone) {
                        ForEach(PaperTone.allCases) { tone in
                            Text(tone.displayName).tag(tone)
                        }
                    }

                    // Font Family Picker
                    Picker("Font chữ", selection: $readerSettings.fontFamily) {
                        ForEach(ReaderFontFamily.allCases) { family in
                            Text(family.displayName).tag(family)
                        }
                    }

                    // Font Size Slider
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Cỡ chữ mặc định")
                            Spacer()
                            Text("\(Int(readerSettings.fontSize)) pt")
                                .foregroundStyle(.secondary)
                        }
                        Slider(value: $readerSettings.fontSize, in: 13...24, step: 1)
                            .tint(DesignTokens.accentLight)
                    }

                    // Line Spacing Slider
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Khoảng cách dòng")
                            Spacer()
                            Text("\(Int(readerSettings.lineSpacing)) pt")
                                .foregroundStyle(.secondary)
                        }
                        Slider(value: $readerSettings.lineSpacing, in: 4...12, step: 1)
                            .tint(DesignTokens.accentLight)
                    }
                }

                // Section 4: Appearance
                Section("Giao diện hệ thống") {
                    Picker("Chế độ hiển thị", selection: $viewModel.colorSchemeRaw) {
                        Text("Theo hệ thống").tag("system")
                        Text("Sáng").tag("light")
                        Text("Tối").tag("dark")
                    }
                    .pickerStyle(.segmented)
                }

                // Section 5: Offline Storage
                Section("Bộ nhớ ngoại tuyến") {
                    LabeledContent("Sổ tay đã lưu", value: "\(viewModel.cachedNotebooksCount) sổ tay")

                    Button(role: .destructive) {
                        viewModel.showClearCacheAlert = true
                    } label: {
                        Label("Xóa bộ nhớ đệm", systemImage: "trash")
                    }
                }

                // Section 6: About
                Section("Thông tin ứng dụng") {
                    LabeledContent("Ứng dụng", value: "Notebook Studio")
                    LabeledContent("Phiên bản", value: "1.0.0")
                    LabeledContent("Build", value: "1")
                    LabeledContent("Nền tảng", value: "iOS 17+")
                }
            }
            .navigationTitle("Cài đặt")
            .sheet(isPresented: $viewModel.showChangePasswordSheet) {
                changePasswordSheet
            }
            .confirmationDialog("Đăng xuất khỏi tài khoản?", isPresented: $showLogoutConfirmation, titleVisibility: .visible) {
                Button("Đăng xuất", role: .destructive) {
                    authViewModel.logout()
                }
                Button("Hủy", role: .cancel) {}
            }
            .alert("Xác nhận xóa bộ nhớ đệm?", isPresented: $viewModel.showClearCacheAlert) {
                Button("Xóa tất cả", role: .destructive) {
                    viewModel.clearLocalCache()
                }
                Button("Hủy", role: .cancel) {}
            } message: {
                Text("Dữ liệu lưu offline sẽ bị xóa và được tải lại khi có kết nối mạng.")
            }
            .alert(viewModel.passwordAlertMessage ?? "Thông báo", isPresented: $viewModel.showPasswordAlert) {
                Button("Đồng ý", role: .cancel) {}
            }
        }
    }

    // MARK: - Change Password Sheet

    private var changePasswordSheet: some View {
        NavigationStack {
            Form {
                Section("Đổi mật khẩu đăng nhập") {
                    SecureField("Mật khẩu hiện tại", text: $viewModel.oldPassword)
                    SecureField("Mật khẩu mới", text: $viewModel.newPassword)
                    SecureField("Xác nhận mật khẩu mới", text: $viewModel.confirmPassword)
                }

                Button {
                    Task {
                        await viewModel.submitChangePassword()
                    }
                } label: {
                    HStack {
                        Spacer()
                        if viewModel.isChangingPassword {
                            ProgressView()
                        } else {
                            Text("Cập nhật mật khẩu")
                                .font(.jakartaSans(size: 15, weight: .bold))
                        }
                        Spacer()
                    }
                }
                .disabled(viewModel.isChangingPassword)
            }
            .navigationTitle("Đổi mật khẩu")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Hủy") {
                        viewModel.showChangePasswordSheet = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthViewModel())
}
