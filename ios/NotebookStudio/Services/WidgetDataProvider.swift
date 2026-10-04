import Foundation

/// Provides data synchronization for iOS Home Screen / Lock Screen Widgets (P8-6).
final class WidgetDataProvider {
    static let shared = WidgetDataProvider()

    private let appGroupSuiteName = "group.com.notebookstudio.app"
    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: appGroupSuiteName) ?? UserDefaults.standard
    }

    private init() {}

    /// Updates shared widget data with current reading state.
    func updateCurrentReading(notebookTitle: String, pageIndex: Int, totalPages: Int) {
        let progress = totalPages > 0 ? Double(pageIndex + 1) / Double(totalPages) : 0.0

        sharedDefaults.set(notebookTitle, forKey: "widget_notebook_title")
        sharedDefaults.set(pageIndex + 1, forKey: "widget_current_page")
        sharedDefaults.set(totalPages, forKey: "widget_total_pages")
        sharedDefaults.set(progress, forKey: "widget_progress")
        sharedDefaults.set(Date().timeIntervalSince1970, forKey: "widget_last_updated")
    }

    /// Reads current reading state (for Widget extension).
    func getCurrentReading() -> (title: String, page: Int, total: Int, progress: Double)? {
        guard let title = sharedDefaults.string(forKey: "widget_notebook_title") else { return nil }
        let page = sharedDefaults.integer(forKey: "widget_current_page")
        let total = sharedDefaults.integer(forKey: "widget_total_pages")
        let progress = sharedDefaults.double(forKey: "widget_progress")
        return (title, page, total, progress)
    }
}
