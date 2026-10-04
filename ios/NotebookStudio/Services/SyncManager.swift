import Foundation
import Combine

/// Orchestrates data synchronization between local cache and the server.
///
/// Strategy (reader-first, server wins):
/// 1. On launch → load local cache → display immediately
/// 2. Background: check server sync-meta timestamp
/// 3. If server is newer → fetch full data → save to local cache
/// 4. Only local changes synced up: reading progress (lastPageIndex)
@MainActor
class SyncManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SyncManager()

    // MARK: - Published State

    @Published var isSyncing: Bool = false
    @Published var lastSyncedAt: String?
    @Published var syncError: String?
    @Published var isOffline: Bool = false

    // MARK: - Storage Keys

    private let lastSyncedAtKey = "notebook_last_synced_at"

    // MARK: - Init

    private init() {
        lastSyncedAt = UserDefaults.standard.string(forKey: lastSyncedAtKey)
    }

    // MARK: - Full Sync Flow

    /// Primary sync: load cache → show → fetch from server → update cache.
    ///
    /// - Returns: The latest notebooks (from cache or server).
    func syncNotebooks() async -> [Notebook] {
        // 1. Load from local cache first (instant)
        let localNotebooks = LocalStorageManager.shared.loadNotebooks()

        // 2. If not logged in, return local cache immediately
        guard KeychainManager.getToken() != nil else {
            return localNotebooks
        }

        // 3. Try to fetch from server
        isSyncing = true
        syncError = nil

        do {
            // Check if server has newer data
            let serverTimestamp = try await NotebookService.getSyncMeta()
            let needsSync = shouldSync(serverTimestamp: serverTimestamp, localCount: localNotebooks.count)

            if needsSync {
                // Fetch full data from server
                let (serverNotebooks, newSyncedAt) = try await NotebookService.fetchAll()

                // Replace local cache with authoritative server state
                LocalStorageManager.shared.replaceNotebooks(serverNotebooks)

                // Update sync timestamp
                if let newSyncedAt {
                    lastSyncedAt = newSyncedAt
                    UserDefaults.standard.set(newSyncedAt, forKey: lastSyncedAtKey)
                }

                isOffline = false
                isSyncing = false
                return serverNotebooks
            }

            // Server data is same or older — use local cache
            isOffline = false
            isSyncing = false
            return localNotebooks

        } catch let error as APIError where error.isOffline {
            // Offline — use cache silently
            isOffline = true
            isSyncing = false
            return localNotebooks

        } catch {
            // Other error — use cache, show error
            syncError = (error as? APIError)?.localizedDescription ?? error.localizedDescription
            isSyncing = false
            return localNotebooks
        }
    }

    // MARK: - Sync Reading Progress

    /// Upload reading progress to server (best-effort, non-blocking).
    func syncReadingProgress(notebooks: [Notebook]) {
        Task {
            do {
                let response = try await NotebookService.sync(
                    notebooks: notebooks,
                    lastSyncedAt: lastSyncedAt
                )
                if let savedAt = response.savedAt {
                    lastSyncedAt = savedAt
                    UserDefaults.standard.set(savedAt, forKey: lastSyncedAtKey)
                }
            } catch {
                // Silent fail — reading progress will sync next time
                #if DEBUG
                print("⚠️ Reading progress sync failed: \(error)")
                #endif
            }
        }
    }

    // MARK: - Force Refresh

    /// Force a full refresh from server (pull-to-refresh).
    func forceRefresh() async -> [Notebook] {
        // Clear timestamp to force full fetch
        let saved = lastSyncedAt
        lastSyncedAt = nil
        UserDefaults.standard.removeObject(forKey: lastSyncedAtKey)

        let result = await syncNotebooks()

        // If sync failed, restore old timestamp
        if syncError != nil {
            lastSyncedAt = saved
            if let saved {
                UserDefaults.standard.set(saved, forKey: lastSyncedAtKey)
            }
        }

        return result
    }

    // MARK: - Clear

    /// Clear all sync state (on logout).
    func clearSyncState() {
        lastSyncedAt = nil
        syncError = nil
        isOffline = false
        UserDefaults.standard.removeObject(forKey: lastSyncedAtKey)
        LocalStorageManager.shared.deleteAll()
    }

    // MARK: - Private

    /// Determine if we need to fetch from server based on timestamps.
    private func shouldSync(serverTimestamp: String?, localCount: Int) -> Bool {
        // Always sync if local cache is completely empty
        if localCount == 0 { return true }
        guard let serverTimestamp else { return true }
        guard let localTimestamp = lastSyncedAt else { return true }

        // If server timestamp is different from local, we need to sync
        return serverTimestamp != localTimestamp
    }
}
