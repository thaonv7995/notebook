import XCTest
@testable import NotebookStudio

/// Tests that all data models can decode real JSON from the web app backend.
final class ModelDecodingTests: XCTestCase {

    // MARK: - Notebook decoding

    func testDecodeNotebook() throws {
        let json = """
        {
            "id": "nb-1790783771028",
            "title": "Sổ số 1",
            "author": "@thaonv",
            "category": "Học tập",
            "lang": "EN · VI",
            "coverGradient": "linear-gradient(135deg, #1e3a8a, #0f172a)",
            "coverTextColor": "#ffffff",
            "createdAt": "2026-09-30T15:56:11.028Z",
            "updatedAt": "2026-10-03T06:28:36.154Z",
            "lastPageIndex": 0,
            "isPinned": false,
            "fontFamily": "sans",
            "lineHeight": "28",
            "deletedPageIds": [],
            "pages": [
                {
                    "id": "p-1790783771028-1",
                    "template": "cornell",
                    "title": "Sổ số 1",
                    "topic": "Sổ số 1",
                    "date": "30/9/2026",
                    "no": "01",
                    "lang": "VI",
                    "updatedAt": "2026-10-03T06:28:36.154Z",
                    "content": "<h2>Hello</h2>",
                    "cues": "<div>Keywords</div>",
                    "notes": "<div>Main notes</div>",
                    "summary": "<div>Summary text</div>"
                }
            ]
        }
        """.data(using: .utf8)!

        let notebook = try JSONDecoder().decode(Notebook.self, from: json)

        XCTAssertEqual(notebook.id, "nb-1790783771028")
        XCTAssertEqual(notebook.title, "Sổ số 1")
        XCTAssertEqual(notebook.author, "@thaonv")
        XCTAssertEqual(notebook.category, "Học tập")
        XCTAssertEqual(notebook.lang, "EN · VI")
        XCTAssertEqual(notebook.isPinned, false)
        XCTAssertEqual(notebook.lastPageIndex, 0)
        XCTAssertEqual(notebook.fontFamily, "sans")
        XCTAssertEqual(notebook.lineHeight, "28")
        XCTAssertEqual(notebook.deletedPageIds, [])
        XCTAssertEqual(notebook.pageCount, 1)
        XCTAssertEqual(notebook.primaryTemplate, .cornell)
    }

    func testDecodeNotebookMissingOptionalFields() throws {
        let json = """
        {
            "id": "nb-minimal",
            "pages": []
        }
        """.data(using: .utf8)!

        let notebook = try JSONDecoder().decode(Notebook.self, from: json)

        XCTAssertEqual(notebook.id, "nb-minimal")
        XCTAssertEqual(notebook.title, "Cuốn sổ chưa đặt tên")
        XCTAssertEqual(notebook.author, "@thaonv")
        XCTAssertEqual(notebook.category, "Ghi chép")
        XCTAssertEqual(notebook.fontFamily, "sans")
        XCTAssertEqual(notebook.isPinned, false)
        XCTAssertEqual(notebook.pageCount, 0)
    }

    // MARK: - Page decoding

    func testDecodeCornellPage() throws {
        let json = """
        {
            "id": "p-cornell-1",
            "template": "cornell",
            "title": "System Design",
            "topic": "Scalability",
            "date": "29/09/2026",
            "no": "01",
            "lang": "EN",
            "cues": "<div>• Scalability</div><div>• Caching</div>",
            "notes": "<h2>Horizontal Scaling</h2><div>Add servers behind load balancer</div>",
            "summary": "<div>Scale horizontally with stateless services</div>",
            "content": "",
            "updatedAt": "2026-10-03T06:28:36.154Z"
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.id, "p-cornell-1")
        XCTAssertEqual(page.template, .cornell)
        XCTAssertEqual(page.topic, "Scalability")
        XCTAssertEqual(page.pageNumber, "01")
        XCTAssertTrue(page.hasContent)
    }

    func testDecodeWorkPage() throws {
        let json = """
        {
            "id": "p-work-1",
            "template": "work",
            "project": "Notebook Studio iOS",
            "deadline": "2026-12-01",
            "status": "WIP",
            "agenda": "<div>Build reader view</div>",
            "discussions": "<div>Use SwiftUI</div>",
            "actions": [
                {"checked": true, "text": "Create Xcode project"},
                {"checked": false, "text": "Build data models"},
                {"checked": false, "text": "Implement API client"}
            ],
            "date": "04/10/2026",
            "no": "01"
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.template, .work)
        XCTAssertEqual(page.project, "Notebook Studio iOS")
        XCTAssertEqual(page.workStatus, .wip)
        XCTAssertEqual(page.actions?.count, 3)
        XCTAssertEqual(page.actions?[0].checked, true)
        XCTAssertEqual(page.actions?[0].text, "Create Xcode project")
        XCTAssertTrue(page.hasContent)
    }

    func testDecodeRuledPage() throws {
        let json = """
        {
            "id": "p-ruled-1",
            "template": "ruled",
            "content": "<h2>Bài 1: 你好</h2><div>Xin chào!</div>",
            "date": "30/9/2026",
            "no": "02"
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.template, .ruled)
        XCTAssertTrue(page.content?.contains("你好") ?? false)
    }

    func testDecodePageWithQuadrants() throws {
        let json = """
        {
            "id": "p-quad-1",
            "template": "quadrant",
            "quadrants": {
                "q1": "<div>Do first: urgent tasks</div>",
                "q2": "<div>Schedule: important goals</div>",
                "q3": "<div>Delegate: meetings</div>",
                "q4": "<div>Eliminate: distractions</div>"
            }
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.template, .quadrant)
        XCTAssertNotNil(page.quadrants)
        XCTAssertTrue(page.quadrants?.q1.contains("urgent") ?? false)
    }

    func testDecodePageWithChartData() throws {
        let json = """
        {
            "id": "p-chart-1",
            "template": "charting",
            "chartData": {
                "col1": "<div>Column 1 data</div>",
                "col2": "<div>Column 2 data</div>",
                "col3": ""
            }
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.template, .charting)
        XCTAssertNotNil(page.chartData)
        XCTAssertEqual(page.chartData?.col1, "<div>Column 1 data</div>")
    }

    func testDecodePageWithVocab() throws {
        let json = """
        {
            "id": "p-vocab-1",
            "template": "vocab",
            "vocabWord": "你好",
            "vocabMeaning": "Hello",
            "vocabExample": "你好吗？",
            "vocabReview": "Greeting"
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.template, .vocab)
        XCTAssertEqual(page.vocabWord, "你好")
    }

    func testDecodePageUnknownTemplateFallsBackToRuled() throws {
        let json = """
        {
            "id": "p-unknown-1",
            "template": "some_future_template",
            "content": "text"
        }
        """.data(using: .utf8)!

        let page = try JSONDecoder().decode(Page.self, from: json)

        XCTAssertEqual(page.template, .ruled)
    }

    // MARK: - API Response decoding

    func testDecodeNotebooksResponse() throws {
        let json = """
        {
            "ok": true,
            "notebooks": [
                {
                    "id": "nb-1",
                    "title": "Test",
                    "pages": [],
                    "deletedPageIds": []
                }
            ],
            "lastSyncedAt": "2026-10-03T06:28:36.154Z"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(NotebooksResponse.self, from: json)

        XCTAssertTrue(response.ok)
        XCTAssertEqual(response.notebooks.count, 1)
        XCTAssertEqual(response.notebooks[0].title, "Test")
        XCTAssertNotNil(response.lastSyncedAt)
    }

    func testDecodeSyncResponse() throws {
        let json = """
        {
            "ok": true,
            "savedAt": "2026-10-04T08:00:00.000Z",
            "count": 3,
            "notebooks": []
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(SyncResponse.self, from: json)

        XCTAssertTrue(response.ok)
        XCTAssertEqual(response.count, 3)
    }

    func testDecodeLoginResponse() throws {
        let json = """
        {
            "ok": true,
            "user": {"id": 1, "username": "thao"},
            "token": "eyJhbGciOiJIUzI1NiJ9.test"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(LoginResponse.self, from: json)

        XCTAssertTrue(response.ok)
        XCTAssertEqual(response.user?.username, "thao")
        XCTAssertNotNil(response.token)
    }

    func testDecodeErrorResponse() throws {
        let json = """
        {
            "error": "Không thể đồng bộ",
            "code": "EMPTY_SYNC_BLOCKED",
            "serverCount": 5
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIErrorResponse.self, from: json)

        XCTAssertEqual(response.code, "EMPTY_SYNC_BLOCKED")
        XCTAssertEqual(response.serverCount, 5)
    }

    // MARK: - Computed Properties

    func testNotebookReadingProgress() {
        let pages = (1...10).map { i in
            Page(id: "p-\(i)", template: .ruled, no: String(format: "%02d", i))
        }
        let nb = Notebook(id: "nb-1", lastPageIndex: 4, pages: pages)

        XCTAssertEqual(nb.readingProgress, 0.5, accuracy: 0.01)
    }

    func testNotebookReadingProgressEmptyPages() {
        let nb = Notebook(id: "nb-empty", pages: [])

        XCTAssertEqual(nb.readingProgress, 0.0)
    }

    func testPageTemplateDisplayNames() {
        XCTAssertEqual(PageTemplate.cornell.displayName, "Cornell Notes")
        XCTAssertEqual(PageTemplate.work.displayName, "Work & Project Log")
        XCTAssertEqual(PageTemplate.quadrant.displayName, "Eisenhower Matrix")
    }

    func testWorkStatusLabel() {
        XCTAssertEqual(WorkStatus.todo.label, "📋 TODO")
        XCTAssertEqual(WorkStatus.wip.label, "🟡 WIP")
        XCTAssertEqual(WorkStatus.done.label, "✅ DONE")
    }

    // MARK: - Encode roundtrip

    func testNotebookEncodeDecodeRoundtrip() throws {
        let page = Page(
            id: "p-1", template: .cornell,
            title: "Test", topic: "Topic",
            date: "04/10/2026", no: "01",
            cues: "<div>Cues</div>",
            notes: "<div>Notes</div>",
            summary: "<div>Summary</div>"
        )
        let original = Notebook(
            id: "nb-roundtrip", title: "Roundtrip Test",
            isPinned: true, lastPageIndex: 0, pages: [page]
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(Notebook.self, from: data)

        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.title, original.title)
        XCTAssertEqual(decoded.isPinned, true)
        XCTAssertEqual(decoded.pages.count, 1)
        XCTAssertEqual(decoded.pages[0].template, .cornell)
        XCTAssertEqual(decoded.pages[0].cues, "<div>Cues</div>")
    }
}
