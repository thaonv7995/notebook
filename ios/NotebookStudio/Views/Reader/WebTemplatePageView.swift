import SwiftUI
import WebKit

/// Displays the authentic 100% web-identical template notebook page in a WKWebView.
/// Renders the exact HTML, CSS tokens, SVG royal corners, edge notches, and fonts.
/// Supports clean read-only viewing and interactive edit mode.
struct WebTemplatePageView: View {
    let page: Page
    var author: String? = "@thaonv"
    var pageNum: Int = 1
    var fontFamily: String? = nil
    var isEditable: Bool = false
    var isFullScreen: Bool = false
    var topOverlayInset: CGFloat = 0
    var onToggleChrome: (() -> Void)? = nil

    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ZStack {
            settings.paperTone.backgroundColor
                .ignoresSafeArea()

            WKWebViewContainer(
                html: WebTemplateGenerator.shared.generateHTML(
                    for: page,
                    author: author,
                    pageNum: pageNum,
                    paperTone: settings.paperTone,
                    fontSize: Int(settings.fontSize),
                    fontFamily: (settings.fontFamily != .plusJakartaSans ? settings.fontFamily.rawValue : fontFamily) ?? settings.fontFamily.rawValue,
                    isEditable: isEditable,
                    isFullScreen: isFullScreen,
                    topOverlayInset: topOverlayInset
                ),
                paperTone: settings.paperTone,
                isEditable: isEditable,
                onToggleChrome: onToggleChrome
            )
            .ignoresSafeArea()
        }
        .ignoresSafeArea()
    }
}

// MARK: - WKWebView UIViewRepresentable

struct WKWebViewContainer: UIViewRepresentable {
    let html: String
    var paperTone: PaperTone = .cream
    var isEditable: Bool = false
    var onToggleChrome: (() -> Void)? = nil

    func makeCoordinator() -> Coordinator {
        Coordinator(onToggleChrome: onToggleChrome)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "notebookReader")
        config.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: config)
        let paperColor = UIColor(paperTone.backgroundColor)
        webView.isOpaque = false
        webView.backgroundColor = paperColor
        webView.scrollView.backgroundColor = paperColor
        webView.scrollView.bounces = true
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.isScrollEnabled = true

        context.coordinator.lastHTML = html
        webView.loadHTMLString(html, baseURL: URL(string: "https://notebook.thaonv.online"))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        context.coordinator.onToggleChrome = onToggleChrome

        let paperColor = UIColor(paperTone.backgroundColor)
        uiView.backgroundColor = paperColor
        uiView.scrollView.backgroundColor = paperColor

        // Only reload if HTML actually changed
        if context.coordinator.lastHTML != html {
            context.coordinator.lastHTML = html
            uiView.loadHTMLString(html, baseURL: URL(string: "https://notebook.thaonv.online"))
        }
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "notebookReader")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        var onToggleChrome: (() -> Void)?
        var lastHTML: String = ""
        private var lastToggleTimestamp: TimeInterval = 0

        init(onToggleChrome: (() -> Void)?) {
            self.onToggleChrome = onToggleChrome
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "notebookReader" {
                if let dict = message.body as? [String: Any],
                   let type = dict["type"] as? String,
                   type == "toggleFullScreen" || type == "toggleChrome" {
                    let now = ProcessInfo.processInfo.systemUptime
                    guard now - lastToggleTimestamp > 0.35 else { return }
                    lastToggleTimestamp = now

                    DispatchQueue.main.async {
                        self.onToggleChrome?()
                    }
                }
            }
        }
    }
}

#Preview {
    WebTemplatePageView(
        page: Page(
            id: "p1",
            template: .cornell,
            title: "Kiến trúc hệ thống iOS",
            topic: "Kiến trúc hệ thống iOS",
            date: "04/10/2026",
            no: "01",
            cues: "<p>• SwiftUI vs UIKit?</p><p>• WKWebView Bridge?</p>",
            notes: "<h2>Mô hình ứng dụng</h2><p>Trang hiển thị chuẩn 100% web template với CSS và SVG ornaments nguyên bản.</p>",
            summary: "<p>Giải pháp tối ưu cho trải nghiệm người dùng nhất quán giữa Desktop và Mobile.</p>"
        ),
        author: "@thaonv",
        pageNum: 1,
        isEditable: false
    )
}
