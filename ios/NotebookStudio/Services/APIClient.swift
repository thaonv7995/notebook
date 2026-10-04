import Foundation

/// Generic API client wrapping URLSession for all backend communication.
///
/// Features:
/// - Async/await with Swift concurrency
/// - Automatic JWT Bearer header injection
/// - 401 auto-logout via notification
/// - Typed error handling with user-friendly messages
/// - Configurable timeouts per request type
actor APIClient {

    // MARK: - Singleton

    static let shared = APIClient()

    // MARK: - Properties

    private let session: URLSession
    private var jwtToken: String?

    /// Posted when a 401 is received — AuthViewModel listens to force logout.
    static let unauthorizedNotification = Notification.Name("APIClient.unauthorized")

    // MARK: - Init

    private init() {
        self.session = URLSession(configuration: APIConfig.sessionConfiguration)
    }

    // MARK: - Token Management

    /// Set the JWT token (called after login).
    func setToken(_ token: String?) {
        self.jwtToken = token
    }

    /// Get current token (for Keychain persistence).
    func getToken() -> String? {
        return jwtToken
    }

    // MARK: - Core Request

    /// Perform a typed API request.
    ///
    /// - Parameters:
    ///   - endpoint: The API endpoint to call.
    ///   - body: Optional Encodable body for POST/PUT requests.
    ///   - timeout: Custom timeout override. Defaults to endpoint-appropriate value.
    /// - Returns: Decoded response of type `T`.
    /// - Throws: `APIError` on failure.
    func request<T: Decodable>(
        _ endpoint: APIConfig.Endpoint,
        body: (any Encodable)? = nil,
        timeout: TimeInterval? = nil
    ) async throws -> T {

        guard let url = endpoint.url() else {
            throw APIError.invalidURL(endpoint.path)
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method
        request.timeoutInterval = timeout ?? APIConfig.requestTimeout

        // Headers
        for (key, value) in APIConfig.commonHeaders {
            request.setValue(value, forHTTPHeaderField: key)
        }

        // Auth header
        if let token = jwtToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Body
        if let body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        // Execute
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            switch error.code {
            case .notConnectedToInternet, .networkConnectionLost:
                throw APIError.offline
            case .timedOut:
                throw APIError.timeout
            default:
                throw APIError.network(error.localizedDescription)
            }
        }

        // HTTP status
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        switch httpResponse.statusCode {
        case 200..<300:
            break // Success
        case 401:
            // Session expired — notify app to logout
            await MainActor.run {
                NotificationCenter.default.post(name: Self.unauthorizedNotification, object: nil)
            }
            throw APIError.unauthorized
        case 409:
            // Sync conflict
            if let errorResponse = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
                throw APIError.conflict(errorResponse.error ?? "Sync conflict")
            }
            throw APIError.conflict("Conflict")
        case 400..<500:
            if let errorResponse = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
                throw APIError.server(errorResponse.error ?? "Request failed")
            }
            throw APIError.server("Request failed (\(httpResponse.statusCode))")
        case 500...:
            throw APIError.server("Server error (\(httpResponse.statusCode))")
        default:
            throw APIError.server("Unexpected status \(httpResponse.statusCode)")
        }

        // Decode
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            #if DEBUG
            if let raw = String(data: data, encoding: .utf8) {
                print("⚠️ Decode error for \(T.self): \(error)")
                print("   Raw response: \(raw.prefix(500))")
            }
            #endif
            throw APIError.decodingFailed(String(describing: error))
        }
    }

    // MARK: - Convenience: Fire-and-forget (no response body needed)

    /// Perform a request that returns no meaningful response body.
    func send(
        _ endpoint: APIConfig.Endpoint,
        body: (any Encodable)? = nil
    ) async throws {
        let _: EmptyResponse = try await request(endpoint, body: body)
    }
}

// MARK: - Empty response for fire-and-forget

private struct EmptyResponse: Decodable {
    // Accepts any JSON — we don't care about the body
    init(from decoder: Decoder) throws {
        // Accept anything
    }
}

// MARK: - API Errors

/// Strongly-typed API errors with user-friendly messages.
enum APIError: LocalizedError {
    case invalidURL(String)
    case offline
    case timeout
    case network(String)
    case unauthorized
    case conflict(String)
    case server(String)
    case decodingFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL(let path):
            return "URL không hợp lệ: \(path)"
        case .offline:
            return "Không có kết nối mạng. Vui lòng kiểm tra WiFi hoặc dữ liệu di động."
        case .timeout:
            return "Kết nối quá thời gian. Vui lòng thử lại."
        case .network(let detail):
            return "Lỗi mạng: \(detail)"
        case .unauthorized:
            return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
        case .conflict(let detail):
            return "Xung đột đồng bộ: \(detail)"
        case .server(let detail):
            return "Lỗi server: \(detail)"
        case .decodingFailed(let detail):
            return "Lỗi xử lý dữ liệu: \(detail)"
        }
    }

    /// Whether this error means the device is offline (for UI decisions).
    var isOffline: Bool {
        if case .offline = self { return true }
        return false
    }

    /// Whether this error means the user needs to re-login.
    var isAuthError: Bool {
        if case .unauthorized = self { return true }
        return false
    }
}
