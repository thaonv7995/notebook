import Foundation

/// Central API configuration for connecting to the Notebook Studio backend.
///
/// The server URL is persisted in UserDefaults so the user only enters it once
/// at login. All other settings have sensible defaults.
///
/// Backend reference: `server/index.js` (Express on port 27972)
enum APIConfig {

    // MARK: - Storage Keys

    private static let serverURLKey = "notebook_server_url"

    // MARK: - Server URL

    /// The base server URL (e.g. "https://notebook.example.com" or "http://192.168.1.10:27972").
    /// Persisted in UserDefaults after first login.
    static var serverURL: String {
        get {
            UserDefaults.standard.string(forKey: serverURLKey) ?? ""
        }
        set {
            // Normalize: remove trailing slash
            let cleaned = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            UserDefaults.standard.set(cleaned, forKey: serverURLKey)
        }
    }

    /// Whether a server URL has been configured.
    static var isConfigured: Bool {
        !serverURL.isEmpty
    }

    /// Clear saved server URL (on logout or reset).
    static func clearServerURL() {
        UserDefaults.standard.removeObject(forKey: serverURLKey)
    }

    // MARK: - Endpoints

    /// All API endpoint paths matching the Express backend routes.
    enum Endpoint {
        // Auth — server/auth.js
        case login
        case logout
        case me
        case changePassword

        // Notebooks — server/api.js
        case notebooks
        case syncMeta
        case sync
        case syncBeacon
        case deleteNotebook(id: String)

        /// The relative path for this endpoint.
        var path: String {
            switch self {
            case .login:                return "/api/auth/login"
            case .logout:               return "/api/auth/logout"
            case .me:                   return "/api/auth/me"
            case .changePassword:       return "/api/auth/change-password"
            case .notebooks:            return "/api/notebooks"
            case .syncMeta:             return "/api/notebooks/sync-meta"
            case .sync:                 return "/api/notebooks/sync"
            case .syncBeacon:           return "/api/notebooks/sync-beacon"
            case .deleteNotebook(let id): return "/api/notebooks/\(id)"
            }
        }

        /// The HTTP method for this endpoint.
        var method: String {
            switch self {
            case .login, .logout, .changePassword, .syncBeacon:
                return "POST"
            case .sync:
                return "PUT"
            case .deleteNotebook:
                return "DELETE"
            case .me, .notebooks, .syncMeta:
                return "GET"
            }
        }

        /// Build the full URL for this endpoint.
        func url(baseURL: String? = nil) -> URL? {
            let base = baseURL ?? APIConfig.serverURL
            guard !base.isEmpty else { return nil }
            return URL(string: base + path)
        }
    }

    // MARK: - Timeouts

    /// Timeout for regular requests (login, fetch notebooks).
    static let requestTimeout: TimeInterval = 30

    /// Timeout for sync operations (may transfer larger payloads).
    static let syncTimeout: TimeInterval = 60

    /// Timeout for connectivity checks (sync-meta).
    static let pingTimeout: TimeInterval = 10

    // MARK: - Headers

    /// Common headers sent with every request.
    static let commonHeaders: [String: String] = [
        "Content-Type": "application/json",
        "Accept": "application/json"
    ]

    /// Build the Authorization header value from a JWT token.
    static func authHeader(token: String) -> [String: String] {
        ["Authorization": "Bearer \(token)"]
    }

    // MARK: - Request Size Limits

    /// Maximum payload size for sync requests (matches Express body-parser limit).
    static let maxSyncPayloadBytes = 50 * 1024 * 1024  // 50MB

    // MARK: - URLSession Configuration

    /// A pre-configured URLSessionConfiguration for API requests.
    static var sessionConfiguration: URLSessionConfiguration {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = requestTimeout
        config.timeoutIntervalForResource = syncTimeout
        config.httpAdditionalHeaders = commonHeaders
        config.waitsForConnectivity = true
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        return config
    }
}
