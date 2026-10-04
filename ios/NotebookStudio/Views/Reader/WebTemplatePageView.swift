import SwiftUI
import WebKit

/// Displays the authentic 100% web-identical template notebook page in a WKWebView.
/// Renders the exact HTML, CSS tokens, SVG royal corners, edge notches, and fonts.
struct WebTemplatePageView: View {
    let page: Page
    var author: String? = "@thaonv"
    var pageNum: Int = 1

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
                    fontSize: Int(settings.fontSize)
                )
            )
        }
    }
}

// MARK: - WKWebView UIViewRepresentable

struct WKWebViewContainer: UIViewRepresentable {
    let html: String

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

        // Load HTML
        webView.loadHTMLString(html, baseURL: nil)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // If HTML changed, reload content
        uiView.loadHTMLString(html, baseURL: nil)
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
        pageNum: 1
    )
}
