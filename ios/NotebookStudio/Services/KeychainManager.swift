import Foundation
import KeychainAccess

/// Secure storage for authentication credentials using iOS Keychain.
///
/// Stores JWT token and server URL in the Keychain instead of UserDefaults
/// for security (encrypted at rest, not included in backups by default).
enum KeychainManager {

    // MARK: - Keychain Instance

    private static let keychain = Keychain(service: "com.thaonv.notebookstudio")
        .accessibility(.afterFirstUnlock)  // Available after first device unlock

    // MARK: - Keys

    private enum Key {
        static let jwtToken = "jwt_token"
        static let username = "username"
        static let serverURL = "server_url"
    }

    // MARK: - JWT Token

    /// Save JWT token securely.
    static func saveToken(_ token: String) throws {
        try keychain.set(token, key: Key.jwtToken)
    }

    /// Retrieve stored JWT token.
    static func getToken() -> String? {
        try? keychain.get(Key.jwtToken)
    }

    /// Delete stored JWT token.
    static func deleteToken() throws {
        try keychain.remove(Key.jwtToken)
    }

    // MARK: - Username

    /// Save username for display purposes.
    static func saveUsername(_ username: String) throws {
        try keychain.set(username, key: Key.username)
    }

    /// Retrieve stored username.
    static func getUsername() -> String? {
        try? keychain.get(Key.username)
    }

    // MARK: - Server URL

    /// Save the server URL securely.
    static func saveServerURL(_ url: String) throws {
        try keychain.set(url, key: Key.serverURL)
        // Also update APIConfig for immediate use
        APIConfig.serverURL = url
    }

    /// Retrieve stored server URL.
    static func getServerURL() -> String? {
        try? keychain.get(Key.serverURL)
    }

    // MARK: - Clear All

    /// Clear all stored credentials (on logout).
    static func clearAll() {
        try? keychain.remove(Key.jwtToken)
        try? keychain.remove(Key.username)
        try? keychain.remove(Key.serverURL)
        APIConfig.clearServerURL()
    }

    // MARK: - Restore Session

    /// Restore saved credentials into APIConfig and APIClient on app launch.
    /// Returns true if a token was found (session may still be expired).
    @discardableResult
    static func restoreSession() async -> Bool {
        // Restore server URL
        if let savedURL = getServerURL() {
            APIConfig.serverURL = savedURL
        }

        // Restore JWT token into APIClient
        if let token = getToken() {
            await APIClient.shared.setToken(token)
            return true
        }

        return false
    }
}
