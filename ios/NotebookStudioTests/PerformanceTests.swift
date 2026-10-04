import XCTest
@testable import NotebookStudio

final class PerformanceTests: XCTestCase {

    /// Generates large dataset for stress testing.
    private func generateMockNotebooks(count: Int, pagesPerNotebook: Int) -> [Notebook] {
        (0..<count).map { nbIdx in
            let pages = (0..<pagesPerNotebook).map { pageIdx in
                Page(
                    id: "p-\(nbIdx)-\(pageIdx)",
                    template: PageTemplate.allCases[pageIdx % PageTemplate.allCases.count],
                    title: "Chủ đề trang số \(pageIdx + 1)",
                    topic: "Chủ đề nghiên cứu khoa học và phát triển phần mềm \(pageIdx)",
                    notes: "<p>Nội dung ghi chép thử nghiệm cho trang \(pageIdx) trong cuốn sổ \(nbIdx).</p>",
                    content: "Nội dung văn bản dài hơn..."
                )
            }
            return Notebook(
                id: "nb-\(nbIdx)",
                title: "Sổ tay nghiên cứu dự án \(nbIdx)",
                category: nbIdx % 2 == 0 ? "Công việc" : "Học tập",
                pages: pages
            )
        }
    }

    /// P9-10: Test search performance across 50+ notebooks (500 pages)
    func testSearchPerformanceOver500Pages() {
        let dataset = generateMockNotebooks(count: 50, pagesPerNotebook: 10)

        measure {
            let results = SearchEngine.shared.search(query: "khoa học", in: dataset)
            XCTAssertFalse(results.isEmpty)
        }
    }

    /// P9-11: Test HTML parsing performance for 100 blocks
    func testHtmlParserPerformance() {
        let complexHtml = (0..<100).map { i in
            "<h2>Tiêu đề \(i)</h2><p>Đoạn văn <b>in đậm</b> số \(i).</p><blockquote>Trích dẫn \(i)</blockquote>"
        }.joined()

        measure {
            let blocks = HTMLParser.shared.parseBlocks(from: complexHtml)
            XCTAssertGreaterThanOrEqual(blocks.count, 100)
        }
    }

    /// Tests GradientParser with various CSS gradients
    func testGradientParserPerformance() {
        let cssGradients = [
            "linear-gradient(135deg, #1e3a8a, #0f172a)",
            "linear-gradient(to right, #ec4899, #8b5cf6)",
            "linear-gradient(45deg, rgb(30, 58, 138), rgb(15, 23, 42))",
            "linear-gradient(180deg, #10b981 0%, #059669 50%, #047857 100%)"
        ]

        measure {
            for _ in 0..<100 {
                for css in cssGradients {
                    _ = GradientParser.parse(css)
                }
            }
        }
    }
}
