import SwiftUI
import UIKit

/// UIViewControllerRepresentable wrapper for UIActivityViewController (P8-8).
struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]
    let applicationActivities: [UIActivity]? = nil

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: applicationActivities)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

/// Helper for generating shareable content from notebooks and pages.
final class ShareSheetManager {
    static let shared = ShareSheetManager()

    private init() {}

    /// Formats a notebook page into a clean shareable plain text note.
    func formatPageForSharing(notebook: Notebook, page: Page, pageIndex: Int) -> String {
        var text = "📖 \(notebook.title) — Trang \(pageIndex + 1)\n"
        if let topic = page.topic ?? page.title, !topic.isEmpty {
            text += "Chủ đề: \(topic)\n"
        }
        text += "Mẫu trang: \(page.template.displayName)\n"
        text += "----------------------------------------\n\n"

        let content = page.notes ?? page.content ?? page.cues ?? page.summary ?? ""
        text += SearchEngine.shared.stripHtml(content)

        text += "\n\n— Được chia sẻ từ Notebook Studio iOS"
        return text
    }
}
