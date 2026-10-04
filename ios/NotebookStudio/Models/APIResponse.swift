import Foundation

// MARK: - Auth Responses

/// Response from `POST /api/auth/login`.
/// Reference: `server/auth.js` lines 88-91.
struct LoginResponse: Codable {
    let ok: Bool
    let user: UserInfo?
    let token: String?  // JWT token (requires backend P2-7 change)

    struct UserInfo: Codable {
        let id: Int
        let username: String
    }
}

/// Response from `GET /api/auth/me`.
struct MeResponse: Codable {
    let ok: Bool
    let user: LoginResponse.UserInfo?
}

/// Response from `POST /api/auth/change-password`.
struct ChangePasswordResponse: Codable {
    let ok: Bool
    let message: String?
    let error: String?
}

// MARK: - Notebook Responses

/// Response from `GET /api/notebooks`.
/// Reference: `server/api.js` lines 19-28.
struct NotebooksResponse: Codable {
    let ok: Bool
    let notebooks: [Notebook]
    let lastSyncedAt: String?
}

/// Response from `PUT /api/notebooks/sync`.
/// Reference: `server/api.js` lines 41-69.
struct SyncResponse: Codable {
    let ok: Bool
    let savedAt: String?
    let count: Int?
    let notebooks: [Notebook]?
}

/// Response from `GET /api/notebooks/sync-meta`.
/// Reference: `server/api.js` lines 31-38.
struct SyncMetaResponse: Codable {
    let ok: Bool
    let lastSyncedAt: String?
}

// MARK: - Error Responses

/// Generic error response from the API.
struct APIErrorResponse: Codable {
    let error: String?
    let code: String?         // e.g. "EMPTY_SYNC_BLOCKED"
    let serverCount: Int?     // Only on conflict errors
}

// MARK: - Sync Request Body

/// Request body for `PUT /api/notebooks/sync`.
struct SyncRequest: Codable {
    let notebooks: [Notebook]
    let lastSyncedAt: String?
}
