import Foundation

/// Service layer for authentication operations.
///
/// Wraps APIClient calls for login/logout/session and manages
/// token persistence in Keychain.
///
/// Reference: `server/auth.js` — all 4 endpoints.
enum AuthService {

    // MARK: - Login

    /// Authenticate with the backend. Saves JWT + credentials on success.
    ///
    /// - Parameters:
    ///   - serverURL: Base server URL (e.g. "http://192.168.1.10:27972")
    ///   - username: Username string
    ///   - password: Password string
    /// - Returns: The authenticated user info.
    /// - Throws: `APIError` on failure.
    @discardableResult
    static func login(serverURL: String, username: String, password: String) async throws -> LoginResponse.UserInfo {
        // 1. Configure server URL
        APIConfig.serverURL = serverURL
        try KeychainManager.saveServerURL(serverURL)

        // 2. Call login endpoint
        struct LoginBody: Encodable {
            let username: String
            let password: String
        }

        let response: LoginResponse = try await APIClient.shared.request(
            .login,
            body: LoginBody(username: username, password: password)
        )

        guard response.ok, let user = response.user else {
            throw APIError.server("Đăng nhập thất bại")
        }

        // 3. Save JWT token
        guard let token = response.token else {
            throw APIError.server("Server chưa hỗ trợ token cho mobile. Vui lòng cập nhật backend.")
        }

        try KeychainManager.saveToken(token)
        try KeychainManager.saveUsername(user.username)
        await APIClient.shared.setToken(token)

        return user
    }

    // MARK: - Logout

    /// Log out: clear local credentials. Best-effort notify server.
    static func logout() async {
        // Best-effort server logout (don't throw if it fails)
        try? await APIClient.shared.send(.logout)

        // Clear local state
        await APIClient.shared.setToken(nil)
        KeychainManager.clearAll()
    }

    // MARK: - Check Session

    /// Verify the current JWT is still valid with the server.
    ///
    /// - Returns: User info if session is valid, nil if expired/invalid.
    static func checkSession() async -> LoginResponse.UserInfo? {
        do {
            let response: MeResponse = try await APIClient.shared.request(.me)
            if response.ok, let user = response.user {
                return .init(id: user.id, username: user.username)
            }
            return nil
        } catch {
            return nil
        }
    }

    // MARK: - Change Password

    /// Change the authenticated user's password.
    ///
    /// - Parameters:
    ///   - oldPassword: Current password for verification.
    ///   - newPassword: New password (min 6 chars, validated server-side).
    /// - Throws: `APIError` with descriptive Vietnamese message on failure.
    static func changePassword(oldPassword: String, newPassword: String) async throws {
        struct ChangePasswordBody: Encodable {
            let oldPassword: String
            let newPassword: String
        }

        let response: ChangePasswordResponse = try await APIClient.shared.request(
            .changePassword,
            body: ChangePasswordBody(oldPassword: oldPassword, newPassword: newPassword)
        )

        if !response.ok {
            throw APIError.server(response.error ?? "Đổi mật khẩu thất bại")
        }
    }
}
