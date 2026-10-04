import CoreSpotlight
import Foundation
import MobileCoreServices

/// Indexes notebooks and pages into iOS Spotlight for system-wide search (P8-7).
final class SpotlightIndexer {
    static let shared = SpotlightIndexer()

    private init() {}

    /// Indexes an array of notebooks for Spotlight.
    func indexNotebooks(_ notebooks: [Notebook]) {
        var searchableItems: [CSSearchableItem] = []

        for notebook in notebooks {
            let attributeSet = CSSearchableItemAttributeSet(contentType: .text)
            attributeSet.title = notebook.title
            attributeSet.contentDescription = "\(notebook.category) · \(notebook.pages.count) trang · Tác giả: \(notebook.author)"
            attributeSet.keywords = [notebook.title, notebook.category, notebook.author, "notebook", "sổ tay"]

            let item = CSSearchableItem(
                uniqueIdentifier: "notebook_\(notebook.id)",
                domainIdentifier: "com.notebookstudio.notebooks",
                attributeSet: attributeSet
            )
            searchableItems.append(item)

            // Index individual pages
            for (index, page) in notebook.pages.enumerated() {
                if let topic = page.topic ?? page.title, !topic.isEmpty {
                    let pageSet = CSSearchableItemAttributeSet(contentType: .text)
                    pageSet.title = topic
                    pageSet.contentDescription = "\(notebook.title) — Trang \(index + 1) (\(page.template.displayName))"
                    pageSet.keywords = [topic, notebook.title, page.template.displayName]

                    let pageItem = CSSearchableItem(
                        uniqueIdentifier: "page_\(notebook.id)_\(index)",
                        domainIdentifier: "com.notebookstudio.pages",
                        attributeSet: pageSet
                    )
                    searchableItems.append(pageItem)
                }
            }
        }

        CSSearchableIndex.default().indexSearchableItems(searchableItems) { error in
            if let error = error {
                print("[Spotlight] Lỗi indexing: \(error.localizedDescription)")
            }
        }
    }

    /// Clears all Spotlight indexed items.
    func clearIndex() {
        CSSearchableIndex.default().deleteAllSearchableItems { error in
            if let error = error {
                print("[Spotlight] Lỗi xóa index: \(error.localizedDescription)")
            }
        }
    }
}
