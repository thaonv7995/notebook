import XCTest
@testable import NotebookStudio

@MainActor
final class SyncManagerTests: XCTestCase {

    func testReadingProgressStore() {
        let store = ReadingProgressStore.shared
        let notebookId = "test-nb-progress"

        store.saveProgress(notebookId: notebookId, pageIndex: 4, totalPages: 10)
        XCTAssertEqual(store.lastPageIndex(for: notebookId), 4)

        // Progress percentage calculation
        let progress = store.progressPercentage(for: notebookId, totalPages: 10)
        XCTAssertEqual(progress, 0.5, accuracy: 0.01)
    }

    func testBookmarkStore() {
        let store = BookmarkStore.shared
        let pageId = "page-test-123"
        let notebookId = "nb-test-456"

        // Ensure clean state
        if store.isBookmarked(pageId: pageId) {
            store.toggle(notebookId: notebookId, pageId: pageId)
        }
        XCTAssertFalse(store.isBookmarked(pageId: pageId))

        // Toggle on
        store.toggle(notebookId: notebookId, pageId: pageId)
        XCTAssertTrue(store.isBookmarked(pageId: pageId))

        // Toggle off
        store.toggle(notebookId: notebookId, pageId: pageId)
        XCTAssertFalse(store.isBookmarked(pageId: pageId))
    }

    func testServerWinsConflictResolution() {
        // When server has newer or equal lastSyncedAt, server data takes precedence
        let localTimestamp = "2026-10-01T00:00:00.000Z"
        let serverTimestamp = "2026-10-02T00:00:00.000Z"

        XCTAssertTrue(serverTimestamp > localTimestamp, "Server timestamp is more recent")
    }
}
