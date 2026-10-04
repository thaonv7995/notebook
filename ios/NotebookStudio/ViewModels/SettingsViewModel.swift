import SwiftUI

/// ViewModel for Settings Tab managing preferences, sync, cache, and password changes (P6-7).
@MainActor
final class SettingsViewModel: ObservableObject {
    // MARK: - Published State
    @Published var serverURL: String = ""
    @Published var lastSyncedTime: String = "Chưa đồng bộ"
    @Published var cachedNotebooksCount: Int = 0
    @Published var isSyncing: Bool = false
    @Published var syncStatusMessage: String? = nil

    // Change Password Form State
    @Published var showChangePasswordSheet: Bool = false
    @Published var oldPassword: String = ""
    @Published var newPassword: String = ""
    @Published var confirmPassword: String = ""
    @Published var isChangingPassword: Bool = false
    @Published var passwordAlertMessage: String? = nil
    @Published var showPasswordAlert: Bool = false

    // Clear Cache Confirmation
    @Published var showClearCacheAlert: Bool = false

    // Color Scheme (system, light, dark)
    @AppStorage("app_color_scheme") var colorSchemeRaw: String = "system"

    init() {
        loadSettings()
    }

    func loadSettings() {
        serverURL = KeychainManager.getServerURL() ?? ""
        cachedNotebooksCount = LocalStorageManager.shared.fetchNotebooks().count
        updateLastSyncedTime()
    }

    private func updateLastSyncedTime() {
        guard let lastSync = SyncManager.shared.lastSyncedAt else {
            lastSyncedTime = "Chưa có"
            return
        }
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = isoFormatter.date(from: lastSync)
        if date == nil {
            isoFormatter.formatOptions = [.withInternetDateTime]
            date = isoFormatter.date(from: lastSync)
        }
        if let validDate = date {
            let relFormatter = RelativeDateTimeFormatter()
            relFormatter.unitsStyle = .full
            lastSyncedTime = relFormatter.localizedString(for: validDate, relativeTo: Date())
        } else {
            lastSyncedTime = lastSync
        }
    }

    /// Triggers manual sync with server.
    func syncNow() async {
        isSyncing = true
        syncStatusMessage = nil

        let result = await SyncManager.shared.forceRefresh()
        cachedNotebooksCount = result.count
        updateLastSyncedTime()

        syncStatusMessage = "Đã đồng bộ \(result.count) sổ tay thành công."
        isSyncing = false
    }

    /// Clears local cache.
    func clearLocalCache() {
        LocalStorageManager.shared.deleteAll()
        cachedNotebooksCount = 0
        syncStatusMessage = "Đã xóa bộ nhớ đệm ngoại tuyến."
    }

    /// Handles changing password via AuthService.
    func submitChangePassword() async {
        guard !oldPassword.isEmpty, !newPassword.isEmpty else {
            passwordAlertMessage = "Vui lòng nhập đầy đủ thông tin."
            showPasswordAlert = true
            return
        }

        guard newPassword == confirmPassword else {
            passwordAlertMessage = "Mật khẩu xác nhận không khớp."
            showPasswordAlert = true
            return
        }

        isChangingPassword = true
        do {
            try await AuthService.changePassword(oldPassword: oldPassword, newPassword: newPassword)
            passwordAlertMessage = "Đổi mật khẩu thành công!"
            showPasswordAlert = true
            oldPassword = ""
            newPassword = ""
            confirmPassword = ""
            showChangePasswordSheet = false
        } catch {
            passwordAlertMessage = error.localizedDescription
            showPasswordAlert = true
        }
        isChangingPassword = false
    }
}
