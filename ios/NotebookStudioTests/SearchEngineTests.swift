import XCTest
@testable import NotebookStudio

final class SearchEngineTests: XCTestCase {

    let sampleNotebooks: [Notebook] = [
        Notebook(
            id: "nb-1",
            title: "Học Swift và iOS",
            pages: [
                Page(
                    id: "p-1",
                    template: .cornell,
                    title: "SwiftUI Cơ bản",
                    topic: "SwiftUI Cơ bản",
                    cues: "<p>State và Binding</p>",
                    notes: "<p>SwiftUI là declarative UI framework được giới thiệu từ iOS 13.</p>",
                    summary: "<p>Thực hành tạo UI hiện đại.</p>"
                ),
                Page(
                    id: "p-2",
                    template: .work,
                    title: "Kế hoạch tuần",
                    project: "Phát triển App",
                    actions: [
                        ActionItem(checked: true, text: "Viết SearchEngine"),
                        ActionItem(checked: false, text: "Deploy App Store")
                    ]
                )
            ]
        ),
        Notebook(
            id: "nb-2",
            title: "Từ vựng tiếng Anh",
            pages: [
                Page(
                    id: "p-3",
                    template: .vocab,
                    title: "Architecture",
                    vocabWord: "Architecture",
                    vocabMeaning: "Kiến trúc hệ thống phần mềm"
                )
            ]
        )
    ]

    func testEmptyQueryReturnsEmptyResults() {
        let results = SearchEngine.shared.search(query: "", in: sampleNotebooks)
        XCTAssertTrue(results.isEmpty)

        let whitespaceResults = SearchEngine.shared.search(query: "   ", in: sampleNotebooks)
        XCTAssertTrue(whitespaceResults.isEmpty)
    }

    func testSearchMatchingPageTitleAndTopic() {
        let results = SearchEngine.shared.search(query: "SwiftUI", in: sampleNotebooks)
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results[0].notebook.id, "nb-1")
        XCTAssertEqual(results[0].pageIndex, 0)
    }

    func testSearchMatchingNotesContent() {
        let results = SearchEngine.shared.search(query: "declarative", in: sampleNotebooks)
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results[0].matchField, "Nội dung")
        XCTAssertTrue(results[0].snippet.contains("declarative"))
    }

    func testSearchMatchingActionItem() {
        let results = SearchEngine.shared.search(query: "SearchEngine", in: sampleNotebooks)
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results[0].matchField, "Việc cần làm")
        XCTAssertTrue(results[0].snippet.contains("Viết SearchEngine"))
    }

    func testSearchMatchingVocab() {
        let results = SearchEngine.shared.search(query: "Kiến trúc", in: sampleNotebooks)
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results[0].notebook.id, "nb-2")
        XCTAssertEqual(results[0].matchField, "Từ vựng")
    }

    func testStripHtmlUtility() {
        let raw = "<p>Xin <b>chào</b> các bạn! &nbsp;&amp;&nbsp; hẹn gặp lại.</p>"
        let stripped = SearchEngine.shared.stripHtml(raw)
        XCTAssertEqual(stripped, "Xin chào các bạn! & hẹn gặp lại.")
    }
}
