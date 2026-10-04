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

        let (response, httpResponse): (LoginResponse, HTTPURLResponse) = try await APIClient.shared.requestWithResponse(
            .login,
            body: LoginBody(username: username, password: password)
        )

        guard response.ok, let user = response.user else {
            throw APIError.server("Đăng nhập thất bại")
        }

        // 3. Extract JWT token:
        // Priority 1: JSON response body (.token)
        // Priority 2: Set-Cookie header / HTTPCookieStorage (nb_token)
        var token = response.token

        if token == nil || token?.isEmpty == true {
            token = extractCookieToken(from: httpResponse, serverURL: serverURL)
        }

        guard let validToken = token, !validToken.isEmpty else {
            throw APIError.server("Không tìm thấy mã xác thực (token/cookie) từ server. Vui lòng kiểm tra lại thông tin.")
        }

        // 4. Save JWT token & credentials
        try KeychainManager.saveToken(validToken)
        try KeychainManager.saveUsername(user.username)
        await APIClient.shared.setToken(validToken)

        return user
    }

    /// Extract nb_token cookie from HTTP response headers or URLSession cookie storage.
    private static func extractCookieToken(from httpResponse: HTTPURLResponse, serverURL: String) -> String? {
        // 1. Try URLSession's HTTPCookieStorage first
        if let targetURL = URL(string: serverURL) {
            if let cookies = HTTPCookieStorage.shared.cookies(for: targetURL),
               let nbCookie = cookies.first(where: { $0.name == "nb_token" && !$0.value.isEmpty }) {
                return nbCookie.value
            }
        }

        // 2. Try HTTPCookie.cookiesWithResponseHeaderFields
        let headers = httpResponse.allHeaderFields.reduce(into: [String: String]()) { acc, pair in
            if let k = pair.key as? String, let v = pair.value as? String {
                acc[k] = v
            }
        }
        if let targetURL = URL(string: serverURL) {
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: headers, for: targetURL)
            if let nbCookie = cookies.first(where: { $0.name == "nb_token" && !$0.value.isEmpty }) {
                return nbCookie.value
            }
        }

        // 3. Regex on raw Set-Cookie / set-cookie header
        let setCookie = (httpResponse.value(forHTTPHeaderField: "Set-Cookie"))
            ?? (httpResponse.value(forHTTPHeaderField: "set-cookie"))
            ?? (httpResponse.allHeaderFields["Set-Cookie"] as? String)
            ?? (httpResponse.allHeaderFields["set-cookie"] as? String)
            ?? ""

        if let match = setCookie.range(of: #"nb_token=([A-Za-z0-9\-_\.]+)"#, options: .regularExpression) {
            let raw = String(setCookie[match])
            return raw.replacingOccurrences(of: "nb_token=", with: "").trimmingCharacters(in: .whitespaces)
        }

        return nil
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
