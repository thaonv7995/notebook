import Foundation

/// Service layer for notebook CRUD and sync operations.
///
/// Reference: `server/api.js` — GET /api/notebooks, PUT /api/notebooks/sync, etc.
enum NotebookService {

    // MARK: - Fetch All Notebooks

    /// Fetch the full notebook library from the server.
    ///
    /// - Returns: Tuple of (notebooks, lastSyncedAt timestamp).
    /// - Throws: `APIError` on failure.
    static func fetchAll() async throws -> (notebooks: [Notebook], lastSyncedAt: String?) {
        let response: NotebooksResponse = try await APIClient.shared.request(.notebooks)

        guard response.ok else {
            throw APIError.server("Tải sổ tay thất bại")
        }

        return (response.notebooks, response.lastSyncedAt)
    }

    // MARK: - Sync Meta

    /// Check the server's last sync timestamp without downloading full data.
    /// Useful for determining if a full sync is needed.
    ///
    /// - Returns: The server's lastSyncedAt timestamp, or nil.
    static func getSyncMeta() async throws -> String? {
        let response: SyncMetaResponse = try await APIClient.shared.request(
            .syncMeta,
            timeout: APIConfig.pingTimeout
        )
        return response.ok ? response.lastSyncedAt : nil
    }

    // MARK: - Smart Sync

    /// Upload local notebooks and receive merged result from server.
    ///
    /// The server performs page-level deep merge (see `server/db.js` mergeAndSaveState).
    /// This means:
    /// - New pages from client are added
    /// - Pages with newer `updatedAt` win
    /// - `deletedPageIds` tombstones are respected
    /// - Server returns the final merged state
    ///
    /// - Parameters:
    ///   - notebooks: The local notebooks to sync.
    ///   - lastSyncedAt: The client's last known sync timestamp for conflict detection.
    /// - Returns: The sync response with merged notebooks.
    /// - Throws: `APIError.conflict` if server data is newer (409).
    static func sync(notebooks: [Notebook], lastSyncedAt: String?) async throws -> SyncResponse {
        let body = SyncRequest(notebooks: notebooks, lastSyncedAt: lastSyncedAt)

        let response: SyncResponse = try await APIClient.shared.request(
            .sync,
            body: body,
            timeout: APIConfig.syncTimeout
        )

        guard response.ok else {
            throw APIError.server("Đồng bộ thất bại")
        }

        return response
    }

    // MARK: - Delete Notebook

    /// Delete a notebook from the server.
    ///
    /// - Parameter id: The notebook ID to delete.
    static func deleteNotebook(id: String) async throws {
        try await APIClient.shared.send(.deleteNotebook(id: id))
    }
}
