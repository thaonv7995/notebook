import SwiftUI
import Combine

/// Central authentication state manager.
///
/// Handles login/logout flow, session persistence via Keychain,
/// auto-session check on launch, and 401 unauthorized auto-logout.
@MainActor
class AuthViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = false
    @Published var isCheckingSession: Bool = true  // True during initial session check
    @Published var error: String?
    @Published var username: String = ""

    private var cancellables = Set<AnyCancellable>()

    init() {
        // Listen for 401 unauthorized notifications from APIClient
        NotificationCenter.default.publisher(for: APIClient.unauthorizedNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleUnauthorized()
            }
            .store(in: &cancellables)

        // Restore username from Keychain for display
        if let savedUsername = KeychainManager.getUsername() {
            username = savedUsername
        }
    }

    // MARK: - Login

    /// Perform login with the given credentials.
    func login(serverURL: String, username: String, password: String) async {
        guard !serverURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            error = "Vui lòng nhập địa chỉ server"
            return
        }
        guard !username.isEmpty else {
            error = "Vui lòng nhập tên đăng nhập"
            return
        }
        guard !password.isEmpty else {
            error = "Vui lòng nhập mật khẩu"
            return
        }

        isLoading = true
        error = nil

        do {
            let user = try await AuthService.login(
                serverURL: serverURL,
                username: username,
                password: password
            )
            SyncManager.shared.clearSyncState()
            self.username = user.username
            self.isLoggedIn = true
        } catch let apiError as APIError {
            self.error = apiError.localizedDescription
        } catch {
            self.error = "Lỗi không xác định: \(error.localizedDescription)"
        }

        isLoading = false
    }

    // MARK: - Logout

    /// Log out and clear all credentials.
    func logout() {
        Task {
            await AuthService.logout()
        }
        isLoggedIn = false
        username = ""
        error = nil
    }

    // MARK: - Session Check

    /// Check if saved JWT is still valid on app launch.
    /// Shows content immediately if token exists, validates in background.
    func checkSession() async {
        isCheckingSession = true

        // 1. Restore saved credentials
        let hasToken = await KeychainManager.restoreSession()

        if !hasToken {
            // No saved session — show login
            isCheckingSession = false
            isLoggedIn = false
            return
        }

        // 2. Optimistically show as logged in (for fast launch)
        if let savedUsername = KeychainManager.getUsername() {
            username = savedUsername
        }
        isLoggedIn = true
        isCheckingSession = false

        // 3. Verify with server in background
        do {
            let user = try await AuthService.verifySession()
            self.username = user.username
        } catch let apiError as APIError where apiError.isAuthError {
            // Token expired (401) — force re-login
            handleUnauthorized()
        } catch {
            // Device is offline or network unreachable:
            // KEEP optimistic login state so user can continue reading cached notebooks!
            #if DEBUG
            print("ℹ️ Session check skipped (device offline / network unreachable): \(error.localizedDescription)")
            #endif
        }
    }

    // MARK: - Change Password

    /// Change the user's password.
    func changePassword(oldPassword: String, newPassword: String) async throws {
        try await AuthService.changePassword(
            oldPassword: oldPassword,
            newPassword: newPassword
        )
    }

    // MARK: - Private

    /// Handle 401 unauthorized — clear session and show login.
    private func handleUnauthorized() {
        isLoggedIn = false
        username = ""
        error = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
        KeychainManager.clearAll()
        Task {
            await APIClient.shared.setToken(nil)
        }
    }
}
