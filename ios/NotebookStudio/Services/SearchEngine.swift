import Foundation
import SwiftUI

/// Search result model representing a match in a page or notebook (P6-2, P6-3).
struct SearchResult: Identifiable, Hashable {
    var id: String { "\(notebook.id)_\(page.id)_\(matchField)" }
    let notebook: Notebook
    let page: Page
    let pageIndex: Int
    let matchField: String
    let snippet: String
    let query: String

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: SearchResult, rhs: SearchResult) -> Bool {
        lhs.id == rhs.id
    }
}

/// Full-text search engine for notebooks and pages (P6-2).
final class SearchEngine {
    static let shared = SearchEngine()

    private init() {}

    /// Searches all notebooks for the given query.
    func search(query: String, in notebooks: [Notebook]) -> [SearchResult] {
        let cleanQuery = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleanQuery.isEmpty else { return [] }

        var results: [SearchResult] = []

        for notebook in notebooks {
            let nbTitleClean = stripHtml(notebook.title)

            for (index, page) in notebook.pages.enumerated() {
                var matched = false

                // 1. Check page title / topic
                if let topic = page.topic ?? page.title, !topic.isEmpty {
                    let cleanTopic = stripHtml(topic)
                    if cleanTopic.localizedCaseInsensitiveContains(cleanQuery) {
                        results.append(SearchResult(
                            notebook: notebook,
                            page: page,
                            pageIndex: index,
                            matchField: "Chủ đề",
                            snippet: extractSnippet(text: cleanTopic, query: cleanQuery),
                            query: query
                        ))
                        matched = true
                    }
                }

                // 2. Check notebook title if page hasn't matched yet
                if !matched && nbTitleClean.localizedCaseInsensitiveContains(cleanQuery) {
                    results.append(SearchResult(
                        notebook: notebook,
                        page: page,
                        pageIndex: index,
                        matchField: "Tên sổ tay",
                        snippet: nbTitleClean,
                        query: query
                    ))
                    matched = true
                }

                // 3. Check notes / content
                let contentText = stripHtml(page.notes ?? page.content ?? "")
                if !matched && !contentText.isEmpty && contentText.localizedCaseInsensitiveContains(cleanQuery) {
                    results.append(SearchResult(
                        notebook: notebook,
                        page: page,
                        pageIndex: index,
                        matchField: "Nội dung",
                        snippet: extractSnippet(text: contentText, query: cleanQuery),
                        query: query
                    ))
                    matched = true
                }

                // 4. Check cues (Cornell, Reading)
                let cuesText = stripHtml(page.cues ?? "")
                if !matched && !cuesText.isEmpty && cuesText.localizedCaseInsensitiveContains(cleanQuery) {
                    results.append(SearchResult(
                        notebook: notebook,
                        page: page,
                        pageIndex: index,
                        matchField: "Gợi ý / Từ khóa",
                        snippet: extractSnippet(text: cuesText, query: cleanQuery),
                        query: query
                    ))
                    matched = true
                }

                // 5. Check summary
                let summaryText = stripHtml(page.summary ?? "")
                if !matched && !summaryText.isEmpty && summaryText.localizedCaseInsensitiveContains(cleanQuery) {
                    results.append(SearchResult(
                        notebook: notebook,
                        page: page,
                        pageIndex: index,
                        matchField: "Tóm tắt",
                        snippet: extractSnippet(text: summaryText, query: cleanQuery),
                        query: query
                    ))
                    matched = true
                }

                // 6. Check action items (Work template)
                if !matched, let actions = page.actions {
                    for action in actions {
                        if action.text.localizedCaseInsensitiveContains(cleanQuery) {
                            results.append(SearchResult(
                                notebook: notebook,
                                page: page,
                                pageIndex: index,
                                matchField: "Việc cần làm",
                                snippet: action.text,
                                query: query
                            ))
                            matched = true
                            break
                        }
                    }
                }

                // 7. Check vocab fields
                if !matched {
                    let vocabCombined = [page.vocabWord, page.vocabMeaning, page.vocabExample, page.vocabReview]
                        .compactMap { $0 }
                        .map { stripHtml($0) }
                        .joined(separator: " ")

                    if vocabCombined.localizedCaseInsensitiveContains(cleanQuery) {
                        results.append(SearchResult(
                            notebook: notebook,
                            page: page,
                            pageIndex: index,
                            matchField: "Từ vựng",
                            snippet: extractSnippet(text: vocabCombined, query: cleanQuery),
                            query: query
                        ))
                        matched = true
                    }
                }

                // 8. Check Eisenhower quadrants
                if !matched, let q = page.quadrants {
                    let qCombined = [q.q1, q.q2, q.q3, q.q4].map { stripHtml($0) }.joined(separator: " ")
                    if qCombined.localizedCaseInsensitiveContains(cleanQuery) {
                        results.append(SearchResult(
                            notebook: notebook,
                            page: page,
                            pageIndex: index,
                            matchField: "Ma trận ưu tiên",
                            snippet: extractSnippet(text: qCombined, query: cleanQuery),
                            query: query
                        ))
                        matched = true
                    }
                }

                // 9. Check ChartData
                if !matched, let cd = page.chartData {
                    let cdCombined = [cd.col1, cd.col2, cd.col3].compactMap { $0 }.map { stripHtml($0) }.joined(separator: " ")
                    if cdCombined.localizedCaseInsensitiveContains(cleanQuery) {
                        results.append(SearchResult(
                            notebook: notebook,
                            page: page,
                            pageIndex: index,
                            matchField: "Bảng so sánh",
                            snippet: extractSnippet(text: cdCombined, query: cleanQuery),
                            query: query
                        ))
                        matched = true
                    }
                }
            }
        }

        return results
    }

    // MARK: - Helpers

    /// Removes HTML tags and cleans up whitespace.
    func stripHtml(_ html: String) -> String {
        let noTags = html.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        let decoded = noTags
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'")
        return decoded
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    /// Extracts a readable snippet around the search query keyword.
    private func extractSnippet(text: String, query: String) -> String {
        guard let range = text.range(of: query, options: .caseInsensitive) else {
            return String(text.prefix(100))
        }

        let prefixDistance = 40
        let suffixDistance = 60

        let start = text.index(range.lowerBound, offsetBy: -prefixDistance, limitedBy: text.startIndex) ?? text.startIndex
        let end = text.index(range.upperBound, offsetBy: suffixDistance, limitedBy: text.endIndex) ?? text.endIndex

        var snippet = String(text[start..<end])
        if start > text.startIndex { snippet = "..." + snippet }
        if end < text.endIndex { snippet = snippet + "..." }
        return snippet
    }
}
