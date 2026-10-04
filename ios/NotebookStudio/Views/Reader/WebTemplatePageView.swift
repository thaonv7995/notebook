import SwiftUI
import WebKit

/// Displays the authentic 100% web-identical template notebook page in a WKWebView.
/// Renders the exact HTML, CSS tokens, SVG royal corners, edge notches, and fonts.
/// Supports clean read-only viewing and interactive edit mode.
struct WebTemplatePageView: View {
    let page: Page
    var author: String? = "@thaonv"
    var pageNum: Int = 1
    var isEditable: Bool = false
    var onToggleChrome: (() -> Void)? = nil

    @ObservedObject private var settings = ReaderSettings.shared

    var body: some View {
        ZStack {
            Color(hex: "0f172a")
                .ignoresSafeArea()

            WKWebViewContainer(
                html: WebTemplateGenerator.shared.generateHTML(
                    for: page,
                    author: author,
                    pageNum: pageNum,
                    paperTone: settings.paperTone,
                    fontSize: Int(settings.fontSize),
                    isEditable: isEditable
                ),
                isEditable: isEditable,
                onToggleChrome: onToggleChrome
            )
        }
    }
}

// MARK: - WKWebView UIViewRepresentable

struct WKWebViewContainer: UIViewRepresentable {
    let html: String
    var isEditable: Bool = false
    var onToggleChrome: (() -> Void)? = nil

    func makeCoordinator() -> Coordinator {
        Coordinator(onToggleChrome: onToggleChrome)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = true
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.showsVerticalScrollIndicator = false

        // Tap gesture to toggle chrome in reading mode
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        tap.numberOfTapsRequired = 1
        tap.cancelsTouchesInView = false
        webView.addGestureRecognizer(tap)
        context.coordinator.tapGesture = tap

        // In reading mode, disable webview scrollview so UIPageViewController page curl pan gesture works instantly
        webView.scrollView.isScrollEnabled = isEditable

        context.coordinator.lastHTML = html
        webView.loadHTMLString(html, baseURL: nil)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        context.coordinator.onToggleChrome = onToggleChrome
        uiView.scrollView.isScrollEnabled = isEditable
        context.coordinator.tapGesture?.isEnabled = !isEditable

        // Only reload if HTML actually changed
        if context.coordinator.lastHTML != html {
            context.coordinator.lastHTML = html
            uiView.loadHTMLString(html, baseURL: nil)
        }
    }

    final class Coordinator: NSObject {
        var onToggleChrome: (() -> Void)?
        var lastHTML: String = ""
        weak var tapGesture: UITapGestureRecognizer?

        init(onToggleChrome: (() -> Void)?) {
            self.onToggleChrome = onToggleChrome
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            DispatchQueue.main.async {
                self.onToggleChrome?()
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
