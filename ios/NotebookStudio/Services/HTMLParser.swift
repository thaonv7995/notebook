import SwiftUI
import Foundation

/// Alignment for inline figures/images in notebook pages.
enum ImageAlignment: String, Codable {
    case left
    case center
    case right
}

/// A structured block of rich content parsed from HTML.
enum RichTextBlock: Identifiable, Equatable {
    case heading(level: Int, text: AttributedString)
    case paragraph(text: AttributedString)
    case quote(text: AttributedString)
    case codeBlock(code: String)
    case listItem(number: Int?, text: AttributedString)
    case image(data: Data?, caption: String?, align: ImageAlignment)
    case divider

    var id: String {
        switch self {
        case .heading(let lvl, let txt):
            return "h\(lvl)_\(String(txt.characters).hashValue)"
        case .paragraph(let txt):
            return "p_\(String(txt.characters).hashValue)"
        case .quote(let txt):
            return "q_\(String(txt.characters).hashValue)"
        case .codeBlock(let code):
            return "c_\(code.hashValue)"
        case .listItem(let num, let txt):
            return "li_\(num ?? 0)_\(String(txt.characters).hashValue)"
        case .image(let data, let cap, _):
            return "img_\(data?.count ?? 0)_\(cap?.hashValue ?? 0)"
        case .divider:
            return "divider_\(UUID().uuidString)"
        }
    }
}

/// Parser that converts HTML rich-text (from web contentEditable) into SwiftUI-friendly structures.
final class HTMLParser {
    static let shared = HTMLParser()

    private init() {}

    /// Parses an HTML string into structured `[RichTextBlock]` items.
    func parseBlocks(from rawHtml: String) -> [RichTextBlock] {
        guard !rawHtml.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return []
        }

        var blocks: [RichTextBlock] = []

        // Extract <figure ...> ... </figure> image cards first
        let htmlWithExtractedFigures = extractFigures(from: rawHtml, into: &blocks)

        // Split HTML by top-level block delimiters
        let pattern = "(?i)<(h[1-3]|p|div|blockquote|pre|ul|ol|hr)[^>]*>(.*?)</\\1>|<hr[^>]*/>|<(h[1-3]|p|div|blockquote|pre|ul|ol)[^>]*/>|([^<]+)"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else {
            let attr = parseInlineHtml(htmlWithExtractedFigures)
            return [RichTextBlock.paragraph(text: attr)]
        }

        let nsString = htmlWithExtractedFigures as NSString
        let matches = regex.matches(in: htmlWithExtractedFigures, range: NSRange(location: 0, length: nsString.length))

        if matches.isEmpty {
            let attr = parseInlineHtml(htmlWithExtractedFigures)
            if !attr.characters.isEmpty {
                blocks.append(.paragraph(text: attr))
            }
            return blocks
        }

        for match in matches {
            let fullMatch = nsString.substring(with: match.range)

            if fullMatch.lowercased().starts(with: "<h1") {
                let inner = stripTags(fullMatch, tag: "h1")
                let attr = parseInlineHtml(inner)
                blocks.append(.heading(level: 1, text: attr))
            } else if fullMatch.lowercased().starts(with: "<h2") {
                let inner = stripTags(fullMatch, tag: "h2")
                let attr = parseInlineHtml(inner)
                blocks.append(.heading(level: 2, text: attr))
            } else if fullMatch.lowercased().starts(with: "<h3") {
                let inner = stripTags(fullMatch, tag: "h3")
                let attr = parseInlineHtml(inner)
                blocks.append(.heading(level: 3, text: attr))
            } else if fullMatch.lowercased().starts(with: "<blockquote") {
                let inner = stripTags(fullMatch, tag: "blockquote")
                let attr = parseInlineHtml(inner)
                blocks.append(.quote(text: attr))
            } else if fullMatch.lowercased().starts(with: "<pre") {
                let inner = stripTags(fullMatch, tag: "pre")
                let codeOnly = stripAllTags(inner)
                blocks.append(.codeBlock(code: decodeHtmlEntities(codeOnly)))
            } else if fullMatch.lowercased().starts(with: "<hr") {
                blocks.append(.divider)
            } else if fullMatch.lowercased().starts(with: "<ul") {
                parseListItems(from: fullMatch, isOrdered: false, into: &blocks)
            } else if fullMatch.lowercased().starts(with: "<ol") {
                parseListItems(from: fullMatch, isOrdered: true, into: &blocks)
            } else {
                // p, div, or plain text
                let clean = fullMatch.replacingOccurrences(of: "(?i)</?(p|div)[^>]*>", with: "", options: .regularExpression)
                let attr = parseInlineHtml(clean)
                let trimmed = String(attr.characters).trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    blocks.append(.paragraph(text: attr))
                }
            }
        }

        return blocks
    }

    /// Converts inline HTML formatting (`<b>`, `<i>`, `<u>`, `<s>`, `<code>`, `<mark>`, color spans) into `AttributedString`.
    func parseInlineHtml(_ rawHtml: String) -> AttributedString {
        let decoded = decodeHtmlEntities(rawHtml)
        let cleaned = cleanBrTags(decoded)

        // Try using NSAttributedString HTML init for reliable rich text attributes
        if let data = cleaned.data(using: .utf8),
           let nsAttr = try? NSMutableAttributedString(
            data: data,
            options: [
                .documentType: NSAttributedString.DocumentType.html,
                .characterEncoding: String.Encoding.utf8.rawValue
            ],
            documentAttributes: nil
           ) {
            // Remove excessive trailing newlines
            while nsAttr.string.hasSuffix("\n") {
                nsAttr.deleteCharacters(in: NSRange(location: nsAttr.length - 1, length: 1))
            }
            return AttributedString(nsAttr)
        }

        // Fallback: strip tags and return plain AttributedString
        let plain = stripAllTags(cleaned)
        return AttributedString(plain)
    }

    // MARK: - Private Helpers

    /// Extracts <figure class="notebook-image-card ..."> and replaces with placeholders.
    private func extractFigures(from html: String, into blocks: inout [RichTextBlock]) -> String {
        let pattern = "(?i)<figure[^>]*>.*?<img[^>]+src=\"(data:image/[^;]+;base64,[^\"]+|\")\"[^>]*>.*?(?:<figcaption[^>]*>(.*?)</figcaption>)?.*?</figure>"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else {
            return html
        }

        let nsString = html as NSString
        let matches = regex.matches(in: html, range: NSRange(location: 0, length: nsString.length))

        for match in matches {
            var data: Data? = nil
            var caption: String? = nil

            if match.numberOfRanges > 1 && match.range(at: 1).location != NSNotFound {
                let src = nsString.substring(with: match.range(at: 1))
                if src.starts(with: "data:image"), let commaIdx = src.firstIndex(of: ",") {
                    let base64Str = String(src[src.index(after: commaIdx)...])
                    data = Data(base64Encoded: base64Str, options: .ignoreUnknownCharacters)
                }
            }

            if match.numberOfRanges > 2 && match.range(at: 2).location != NSNotFound {
                caption = decodeHtmlEntities(stripAllTags(nsString.substring(with: match.range(at: 2))))
            }

            blocks.append(.image(data: data, caption: caption, align: .center))
        }

        // Remove extracted figures from main text
        return regex.stringByReplacingMatches(in: html, range: NSRange(location: 0, length: nsString.length), withTemplate: "")
    }

    private func parseListItems(from listHtml: String, isOrdered: Bool, into blocks: inout [RichTextBlock]) {
        let pattern = "(?i)<li[^>]*>(.*?)</li>"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else { return }

        let ns = listHtml as NSString
        let matches = regex.matches(in: listHtml, range: NSRange(location: 0, length: ns.length))

        var index = 1
        for match in matches {
            if match.numberOfRanges > 1 {
                let inner = ns.substring(with: match.range(at: 1))
                let attr = parseInlineHtml(inner)
                blocks.append(.listItem(number: isOrdered ? index : nil, text: attr))
                index += 1
            }
        }
    }

    private func stripTags(_ string: String, tag: String) -> String {
        let pattern = "(?i)^<\\(tag)[^>]*>(.*?)</\\(tag)>$"
            .replacingOccurrences(of: "\\(tag)", with: tag)
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else {
            return string
        }
        let ns = string as NSString
        if let match = regex.firstMatch(in: string, range: NSRange(location: 0, length: ns.length)),
           match.numberOfRanges > 1 {
            return ns.substring(with: match.range(at: 1))
        }
        return string
    }

    private func stripAllTags(_ string: String) -> String {
        string.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
    }

    private func cleanBrTags(_ string: String) -> String {
        string.replacingOccurrences(of: "(?i)<br\\s*/?>", with: "\n", options: .regularExpression)
    }

    private func decodeHtmlEntities(_ string: String) -> String {
        var str = string
        str = str.replacingOccurrences(of: "&nbsp;", with: " ")
        str = str.replacingOccurrences(of: "&amp;", with: "&")
        str = str.replacingOccurrences(of: "&lt;", with: "<")
        str = str.replacingOccurrences(of: "&gt;", with: ">")
        str = str.replacingOccurrences(of: "&quot;", with: "\"")
        str = str.replacingOccurrences(of: "&#39;", with: "'")
        return str
    }
}
