import XCTest
@testable import NotebookStudio

final class HTMLParserTests: XCTestCase {

    func testEmptyHtmlReturnsEmptyBlocks() {
        let blocks = HTMLParser.shared.parseBlocks(from: "")
        XCTAssertTrue(blocks.isEmpty)

        let whitespaceBlocks = HTMLParser.shared.parseBlocks(from: "   \n\t  ")
        XCTAssertTrue(whitespaceBlocks.isEmpty)
    }

    func testHeadingsParsing() {
        let html = "<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>"
        let blocks = HTMLParser.shared.parseBlocks(from: html)

        XCTAssertEqual(blocks.count, 3)

        if case .heading(let lvl, let txt) = blocks[0] {
            XCTAssertEqual(lvl, 1)
            XCTAssertTrue(String(txt.characters).contains("Heading 1"))
        } else {
            XCTFail("Expected H1")
        }

        if case .heading(let lvl, _) = blocks[1] {
            XCTAssertEqual(lvl, 2)
        } else {
            XCTFail("Expected H2")
        }

        if case .heading(let lvl, _) = blocks[2] {
            XCTAssertEqual(lvl, 3)
        } else {
            XCTFail("Expected H3")
        }
    }

    func testBlockquoteAndCodeBlock() {
        let html = "<blockquote>Đoạn trích dẫn</blockquote><pre>let x = 42;</pre>"
        let blocks = HTMLParser.shared.parseBlocks(from: html)

        XCTAssertEqual(blocks.count, 2)

        if case .quote(let txt) = blocks[0] {
            XCTAssertTrue(String(txt.characters).contains("Đoạn trích dẫn"))
        } else {
            XCTFail("Expected quote block")
        }

        if case .codeBlock(let code) = blocks[1] {
            XCTAssertEqual(code.trimmingCharacters(in: .whitespacesAndNewlines), "let x = 42;")
        } else {
            XCTFail("Expected codeBlock")
        }
    }

    func testListItemsParsing() {
        let html = "<ul><li>Mục 1</li><li>Mục 2</li></ul><ol><li>Bước A</li><li>Bước B</li></ol>"
        let blocks = HTMLParser.shared.parseBlocks(from: html)

        XCTAssertEqual(blocks.count, 4)

        if case .listItem(let num, let txt) = blocks[0] {
            XCTAssertNil(num)
            XCTAssertTrue(String(txt.characters).contains("Mục 1"))
        } else {
            XCTFail("Expected unordered list item")
        }

        if case .listItem(let num, let txt) = blocks[2] {
            XCTAssertEqual(num, 1)
            XCTAssertTrue(String(txt.characters).contains("Bước A"))
        } else {
            XCTFail("Expected ordered list item 1")
        }
    }

    func testEmbeddedFigureExtraction() {
        let figureHtml = """
        <figure class="notebook-image-card img-align-left img-size-sm">
          <div class="notebook-image-frame">
            <img class="notebook-embedded-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" alt="Test">
          </div>
          <figcaption class="notebook-image-caption">Sơ đồ kiến trúc</figcaption>
        </figure>
        <p>Văn bản sau ảnh</p>
        """

        let blocks = HTMLParser.shared.parseBlocks(from: figureHtml)
        XCTAssertGreaterThanOrEqual(blocks.count, 2)

        if case .image(let data, let caption, _) = blocks[0] {
            XCTAssertNotNil(data)
            XCTAssertEqual(caption, "Sơ đồ kiến trúc")
        } else {
            XCTFail("Expected image block")
        }
    }

    func testInlineFormattingAttributedString() {
        let inline = "<b>In đậm</b> và <i>in nghiêng</i> và <u>gạch chân</u>"
        let attr = HTMLParser.shared.parseInlineHtml(inline)
        let plain = String(attr.characters)
        XCTAssertTrue(plain.contains("In đậm"))
        XCTAssertTrue(plain.contains("in nghiêng"))
        XCTAssertTrue(plain.contains("gạch chân"))
    }
}
