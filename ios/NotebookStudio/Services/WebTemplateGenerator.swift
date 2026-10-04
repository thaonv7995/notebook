import Foundation

/// Generates 100% pixel-identical HTML matching the web app's `src/templates/` and `src/styles/templates.css`.
/// Includes:
/// - Exact A4 sheet layout and fixed aspect ratio (660px x 820px)
/// - Exact vector Royal Corner Frames SVG (top-left, top-right, bottom-left, bottom-right)
/// - Exact Edge Index Notches (I, II, III, IV, V, VI)
/// - Exact Punch Margin Line
/// - Exact Functional Header with author signature seal and serif underline inputs
/// - Exact Ruled lines, status pills, and interactive checkboxes
/// - Exact Scholar Footer with PAGE box
final class WebTemplateGenerator {
    static let shared = WebTemplateGenerator()

    private var cachedCSS: String?

    private init() {}

    /// Loads the web app's `tokens.css` and `templates.css` from the app bundle or fallback.
    private func getCombinedCSS() -> String {
        if let cached = cachedCSS { return cached }

        var css = ""
        // Try loading from Bundle
        if let tokensUrl = Bundle.main.url(forResource: "tokens", withExtension: "css", subdirectory: "Web") ?? Bundle.main.url(forResource: "tokens", withExtension: "css"),
           let tokensData = try? String(contentsOf: tokensUrl, encoding: .utf8) {
            css += tokensData + "\n"
        }

        if let templatesUrl = Bundle.main.url(forResource: "templates", withExtension: "css", subdirectory: "Web") ?? Bundle.main.url(forResource: "templates", withExtension: "css"),
           let templatesData = try? String(contentsOf: templatesUrl, encoding: .utf8) {
            css += templatesData + "\n"
        }

        if css.isEmpty {
            css = defaultEmbeddedCSS
        }

        cachedCSS = css
        return css
    }

    /// Generates complete standalone HTML document for the given page.
    func generateHTML(
        for page: Page,
        author: String? = "@thaonv",
        pageNum: Int = 1,
        paperTone: PaperTone = .cream,
        fontSize: Int = 15
    ) -> String {
        let css = getCombinedCSS()
        let authorHandle = formatAuthorHandle(author)
        let templateContent = generateTemplateBody(for: page, authorHandle: authorHandle, pageNum: pageNum)

        let bgHex: String
        let textHex: String
        let lineHex: String
        let secondaryHex: String

        switch paperTone {
        case .cream:
            bgHex = "#FAF6ED"
            textHex = "#2C2621"
            lineHex = "#D8CEBE"
            secondaryHex = "#8C827A"
        case .white:
            bgHex = "#FFFFFF"
            textHex = "#0F172A"
            lineHex = "#CBD5E1"
            secondaryHex = "#64748B"
        case .sepia:
            bgHex = "#F4ECD8"
            textHex = "#3D312A"
            lineHex = "#D9C8B0"
            secondaryHex = "#8B7355"
        case .dark:
            bgHex = "#1E2430"
            textHex = "#F8FAFC"
            lineHex = "#334155"
            secondaryHex = "#94A3B8"
        }

        return """
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=680, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
          <style>
            \(css)

            :root {
              --paper-cream: \(bgHex);
              --ink-primary: \(textHex);
              --rule-main: \(lineHex);
              --rule-accent: \(textHex);
              --ink-muted: \(secondaryHex);
              --notebook-font-size: \(fontSize)px;
            }

            * {
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              min-height: 100%;
              background: transparent;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              -webkit-font-smoothing: antialiased;
              overflow-x: hidden;
            }

            .book-desk-scaler {
              width: 660px;
              min-height: 820px;
              transform-origin: top center;
              margin: 6px auto;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
              border-radius: 4px;
            }

            .a4-template-sheet {
              width: 660px !important;
              min-height: 820px !important;
              padding: 22px 20px 16px 36px !important;
              border-radius: 4px;
            }
          </style>
          <script>
            function fitScale() {
              var w = window.innerWidth - 12;
              var scale = Math.min(w / 660, 1.0);
              var scaler = document.getElementById('sheetContainer');
              if (scaler) {
                scaler.style.transform = 'scale(' + scale + ')';
                scaler.style.marginBottom = (820 * (scale - 1)) + 'px';
              }
            }
            window.addEventListener('resize', fitScale);
            window.addEventListener('DOMContentLoaded', fitScale);
            setTimeout(fitScale, 50);

            // Interactive handlers
            document.addEventListener('click', function(e) {
              // Status pill click
              var pill = e.target.closest('.status-pill-btn');
              if (pill) {
                var group = pill.closest('.status-pills');
                if (group) {
                  group.querySelectorAll('.status-pill-btn').forEach(function(b) {
                    b.classList.remove('active-todo', 'active-wip', 'active-done');
                  });
                  var st = pill.getAttribute('data-status');
                  if (st === 'TODO') pill.classList.add('active-todo');
                  if (st === 'WIP') pill.classList.add('active-wip');
                  if (st === 'DONE') pill.classList.add('active-done');
                }
              }

              // Checkbox click
              var checkBtn = e.target.closest('.action-check-square');
              if (checkBtn) {
                checkBtn.classList.toggle('checked');
                var row = checkBtn.closest('.action-row');
                if (row) {
                  var input = row.querySelector('.action-line-input');
                  if (input) input.classList.toggle('done-line');
                }
              }
            });
          </script>
        </head>
        <body>
          <div class="book-desk-scaler" id="sheetContainer">
            \(templateContent)
          </div>
        </body>
        </html>
        """
    }

    // MARK: - Template HTML Dispatcher

    private func generateTemplateBody(for page: Page, authorHandle: String, pageNum: Int) -> String {
        switch page.template {
        case .cornell:
            return generateCornell(page: page, author: authorHandle, pageNum: pageNum)
        case .work:
            return generateWork(page: page, author: authorHandle, pageNum: pageNum)
        case .ruled:
            return generateRuled(page: page, author: authorHandle, pageNum: pageNum)
        case .vocab:
            return generateVocab(page: page, author: authorHandle, pageNum: pageNum)
        case .charting:
            return generateCharting(page: page, author: authorHandle, pageNum: pageNum)
        case .reading:
            return generateReading(page: page, author: authorHandle, pageNum: pageNum)
        case .dotgrid:
            return generateDotGrid(page: page, author: authorHandle, pageNum: pageNum)
        case .grid:
            return generateGrid(page: page, author: authorHandle, pageNum: pageNum)
        case .blank:
            return generateBlank(page: page, author: authorHandle, pageNum: pageNum)
        case .quadrant:
            return generateEisenhower(page: page, author: authorHandle, pageNum: pageNum)
        }
    }

    // MARK: - Ornaments (Exact SVG matching src/templates/ornaments.js)

    private let royalCornersSVG = """
      <svg class="content-corner-frame corner-tl" viewBox="0 0 45 45" fill="none">
        <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="var(--ink-primary)" stroke-width="1.5"/>
        <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="var(--rule-main)" stroke-width="1"/>
        <polygon points="12,12 15,9 12,6 9,9" fill="var(--ink-primary)"/>
      </svg>
      <svg class="content-corner-frame corner-tr" viewBox="0 0 45 45" fill="none">
        <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="var(--ink-primary)" stroke-width="1.5"/>
        <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="var(--rule-main)" stroke-width="1"/>
        <polygon points="12,12 15,9 12,6 9,9" fill="var(--ink-primary)"/>
      </svg>
      <svg class="content-corner-frame corner-bl" viewBox="0 0 45 45" fill="none">
        <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="var(--ink-primary)" stroke-width="1.5"/>
        <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="var(--rule-main)" stroke-width="1"/>
        <polygon points="12,12 15,9 12,6 9,9" fill="var(--ink-primary)"/>
      </svg>
      <svg class="content-corner-frame corner-br" viewBox="0 0 45 45" fill="none">
        <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="var(--ink-primary)" stroke-width="1.5"/>
        <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="var(--rule-main)" stroke-width="1"/>
        <polygon points="12,12 15,9 12,6 9,9" fill="var(--ink-primary)"/>
      </svg>
    """

    private let edgeNotchesHTML = """
      <div class="edge-index-markers">
        <div class="index-notch">I</div>
        <div class="index-notch">II</div>
        <div class="index-notch">III</div>
        <div class="index-notch">IV</div>
        <div class="index-notch">V</div>
        <div class="index-notch">VI</div>
      </div>
    """

    private func renderSeal(author: String, sub: String) -> String {
        """
        <div class="signature-seal-cartouche" title="Tác giả">
          <span class="seal-user-handle">\(escapeHTML(author))</span>
          <span class="seal-user-sub">\(escapeHTML(sub))</span>
        </div>
        """
    }

    // MARK: - Template 1: Cornell (src/templates/cornell.js)

    private func generateCornell(page: Page, author: String, pageNum: Int) -> String {
        """
        <div class="a4-template-sheet cornell-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>✦</span> STUDY JOURNAL</div>
              \(renderSeal(author: author, sub: "STUDY ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">SUBJECT / TOPIC:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="cornell-container">
            <div class="cornell-body-split">
              <div class="cornell-cue-col">
                <div class="col-guide-bar"><span class="section-guide-badge">CUES & QUESTIONS</span></div>
                <div contenteditable="true" class="template-writing-area cornell-cues-text">\(page.cues ?? "")</div>
              </div>
              <div class="cornell-notes-col">
                <div class="col-guide-bar"><span class="section-guide-badge">NOTES</span></div>
                <div contenteditable="true" class="template-writing-area cornell-notes-text">\((page.notes?.isEmpty ?? true) ? (page.content ?? "") : (page.notes ?? ""))</div>
              </div>
            </div>
            <div class="cornell-summary-area">
              <div class="col-guide-bar"><span class="section-guide-badge">SUMMARY & SYNTHESIS</span></div>
              <div contenteditable="true" class="template-writing-area cornell-summary-text">\(page.summary ?? "")</div>
            </div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">CORNELL SYSTEM</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 2: Work & Project Log (src/templates/work.js)

    private func generateWork(page: Page, author: String, pageNum: Int) -> String {
        let storedActions = page.actions ?? []
        var actions = storedActions.map { ActionItem(checked: $0.checked, text: $0.text) }
        while actions.count < 5 {
            actions.append(ActionItem(checked: false, text: ""))
        }

        let actionRowsHtml = actions.enumerated().map { idx, act in
            """
            <div class="action-row" data-idx="\(idx)">
              <button type="button" class="action-check-square \(act.checked ? "checked" : "")" data-idx="\(idx)" title="Đánh dấu hoàn thành"></button>
              \(idx == 0 ? "<span class=\"section-guide-badge\" style=\"position: static; margin-right: 4px;\">ACTION ITEMS & NEXT STEPS</span>" : "")
              <input type="text" class="action-line-input \(act.checked ? "done-line" : "")" data-idx="\(idx)" value="\(escapeAttr(act.text))" />
            </div>
            """
        }.joined(separator: "\n")

        let currentStatus = page.status ?? "WIP"

        return """
        <div class="a4-template-sheet work-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>💼</span> WORK & PROJECT</div>
              \(renderSeal(author: author, sub: "WORK ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">PROJECT / OBJECTIVE:</span>
              <input type="text" class="field-underline-input project-input" value="\(escapeAttr(page.project ?? page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 75px;" />
                <span style="font-weight: 700; margin-left: 6px;">DEADLINE:</span>
                <input type="text" class="sub-field-input deadline-input" value="\(escapeAttr(page.deadline ?? ""))" style="width: 75px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">STATUS:</span>
                <div class="status-pills">
                  <button type="button" class="status-pill-btn \(currentStatus == "TODO" ? "active-todo" : "")" data-status="TODO">[ ] TODO</button>
                  <button type="button" class="status-pill-btn \(currentStatus == "WIP" ? "active-wip" : "")" data-status="WIP">[ ] WIP</button>
                  <button type="button" class="status-pill-btn \(currentStatus == "DONE" ? "active-done" : "")" data-status="DONE">[✓] DONE</button>
                </div>
              </div>
            </div>
          </div>

          <div class="work-container">
            <div class="work-body-split">
              <div class="work-side-col">
                <div class="col-guide-bar"><span class="section-guide-badge">AGENDA & DECISIONS</span></div>
                <div contenteditable="true" class="template-writing-area work-agenda-text">\(page.agenda ?? "")</div>
              </div>
              <div class="work-notes-col">
                <div class="col-guide-bar"><span class="section-guide-badge">NOTES & DISCUSSIONS</span></div>
                <div contenteditable="true" class="template-writing-area work-notes-text">\((page.discussions?.isEmpty ?? true) ? (page.content ?? "") : (page.discussions ?? ""))</div>
              </div>
            </div>
            <div class="work-action-area">
              \(actionRowsHtml)
            </div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">WORK & PROJECT LOG</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 3: Ruled Notebook (src/templates/ruled.js)

    private func generateRuled(page: Page, author: String, pageNum: Int) -> String {
        """
        <div class="a4-template-sheet ruled-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>✍️</span> GENERAL NOTEBOOK</div>
              \(renderSeal(author: author, sub: "STUDY ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">SUBJECT / TOPIC:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="ruled-full-canvas">
            <div contenteditable="true" class="template-writing-area ruled-canvas-text">\(page.content ?? "")</div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">RULED NOTEBOOK</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 4: Eisenhower Matrix (src/templates/quadrant.js)

    private func generateEisenhower(page: Page, author: String, pageNum: Int) -> String {
        let q = page.quadrants ?? Quadrants(q1: "", q2: "", q3: "", q4: "")

        return """
        <div class="a4-template-sheet eisenhower-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>⚡</span> EISENHOWER MATRIX</div>
              \(renderSeal(author: author, sub: "PRIORITY PLANNER"))
            </div>
            <div class="header-main-field">
              <span class="field-label">GOAL / CONTEXT:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="quadrant-container eisenhower-container">
            <div class="eisenhower-axis-labels">
              <span class="axis-label axis-urgent">← URGENT</span>
              <span class="axis-label axis-not-urgent">NOT URGENT →</span>
            </div>
            <div class="quadrant-row">
              <div class="quadrant-cell quadrant-tl eisenhower-do">
                <div class="col-guide-bar eisenhower-bar do-bar"><span class="section-guide-badge eisenhower-badge do-badge">🔴 DO FIRST — Urgent & Important</span></div>
                <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q1-text">\(q.q1 ?? "")</div>
              </div>
              <div class="quadrant-cell quadrant-tr eisenhower-schedule">
                <div class="col-guide-bar eisenhower-bar schedule-bar"><span class="section-guide-badge eisenhower-badge schedule-badge">🟡 SCHEDULE — Important, Not Urgent</span></div>
                <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q2-text">\(q.q2 ?? "")</div>
              </div>
            </div>
            <div class="quadrant-row">
              <div class="quadrant-cell quadrant-bl eisenhower-delegate">
                <div class="col-guide-bar eisenhower-bar delegate-bar"><span class="section-guide-badge eisenhower-badge delegate-badge">🟠 DELEGATE — Urgent, Not Important</span></div>
                <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q3-text">\(q.q3 ?? "")</div>
              </div>
              <div class="quadrant-cell quadrant-br eisenhower-eliminate">
                <div class="col-guide-bar eisenhower-bar eliminate-bar"><span class="section-guide-badge eisenhower-badge eliminate-badge">⚪ ELIMINATE — Not Urgent, Not Important</span></div>
                <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q4-text">\(q.q4 ?? "")</div>
              </div>
            </div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">EISENHOWER MATRIX</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 5: Vocabulary (src/templates/vocab.js)

    private func generateVocab(page: Page, author: String, pageNum: Int) -> String {
        let langLabel = (page.lang ?? "EN").uppercased()

        return """
        <div class="a4-template-sheet vocab-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>🗣️</span> VOCABULARY · \(langLabel)</div>
              \(renderSeal(author: author, sub: "LANGUAGE LAB"))
            </div>
            <div class="header-main-field">
              <span class="field-label">TOPIC / THEME:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="vocab-container">
            <div class="vocab-body-split">
              <div class="vocab-word-col">
                <div class="col-guide-bar"><span class="section-guide-badge">WORD / PHRASE</span></div>
                <div contenteditable="true" class="template-writing-area vocab-word-text">\(page.vocabWord ?? "")</div>
              </div>
              <div class="vocab-meaning-col">
                <div class="col-guide-bar"><span class="section-guide-badge">MEANING · PRONUNCIATION</span></div>
                <div contenteditable="true" class="template-writing-area vocab-meaning-text">\(page.vocabMeaning ?? "")</div>
              </div>
              <div class="vocab-example-col">
                <div class="col-guide-bar"><span class="section-guide-badge">EXAMPLE SENTENCE</span></div>
                <div contenteditable="true" class="template-writing-area vocab-example-text">\((page.vocabExample?.isEmpty ?? true) ? (page.content ?? "") : (page.vocabExample ?? ""))</div>
              </div>
            </div>
            <div class="vocab-review-area">
              <div class="col-guide-bar"><span class="section-guide-badge">REVIEW NOTES · MEMORY TIPS</span></div>
              <div contenteditable="true" class="template-writing-area vocab-review-text">\(page.vocabReview ?? "")</div>
            </div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">VOCABULARY · \(langLabel)</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 6: Reading Notes (src/templates/reading.js)

    private func generateReading(page: Page, author: String, pageNum: Int) -> String {
        """
        <div class="a4-template-sheet reading-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>📖</span> READING NOTES</div>
              \(renderSeal(author: author, sub: "BOOK ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">BOOK / ARTICLE:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">CH.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="reading-container">
            <div class="reading-body-split">
              <div class="reading-ideas-col">
                <div class="col-guide-bar"><span class="section-guide-badge">KEY IDEAS & TAKEAWAYS</span></div>
                <div contenteditable="true" class="template-writing-area reading-ideas-text">\(page.cues ?? "")</div>
              </div>
              <div class="reading-quotes-col">
                <div class="col-guide-bar"><span class="section-guide-badge">QUOTES & HIGHLIGHTS</span></div>
                <div contenteditable="true" class="template-writing-area reading-quotes-text">\((page.notes?.isEmpty ?? true) ? (page.content ?? "") : (page.notes ?? ""))</div>
              </div>
            </div>
            <div class="reading-summary-area">
              <div class="col-guide-bar"><span class="section-guide-badge">SUMMARY & PERSONAL REFLECTION</span></div>
              <div contenteditable="true" class="template-writing-area reading-summary-text">\(page.summary ?? "")</div>
            </div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">READING NOTES</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 7: Charting Method (src/templates/charting.js)

    private func generateCharting(page: Page, author: String, pageNum: Int) -> String {
        let chart = page.chartData ?? ChartData()

        return """
        <div class="a4-template-sheet charting-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>📊</span> CHARTING METHOD</div>
              \(renderSeal(author: author, sub: "DATA ANALYSIS"))
            </div>
            <div class="header-main-field">
              <span class="field-label">SUBJECT / TOPIC:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="charting-container">
            <div class="charting-columns">
              <div class="charting-col">
                <div class="col-guide-bar"><span class="section-guide-badge">COLUMN A</span></div>
                <div contenteditable="true" class="template-writing-area charting-col1-text">\(chart.col1 ?? "")</div>
              </div>
              <div class="charting-col">
                <div class="col-guide-bar"><span class="section-guide-badge">COLUMN B</span></div>
                <div contenteditable="true" class="template-writing-area charting-col2-text">\(chart.col2 ?? "")</div>
              </div>
              <div class="charting-col charting-col-last">
                <div class="col-guide-bar"><span class="section-guide-badge">COLUMN C</span></div>
                <div contenteditable="true" class="template-writing-area charting-col3-text">\(chart.col3 ?? "")</div>
              </div>
            </div>
            <div class="charting-notes-area">
              <div class="col-guide-bar"><span class="section-guide-badge">ANALYSIS & CONCLUSIONS</span></div>
              <div contenteditable="true" class="template-writing-area charting-notes-text">\((page.summary?.isEmpty ?? true) ? (page.content ?? "") : (page.summary ?? ""))</div>
            </div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">CHARTING METHOD</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 8: Dot Grid (src/templates/dotgrid.js)

    private func generateDotGrid(page: Page, author: String, pageNum: Int) -> String {
        """
        <div class="a4-template-sheet dotgrid-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>☷</span> DOT GRID JOURNAL</div>
              \(renderSeal(author: author, sub: "DOT GRID ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">SUBJECT / TOPIC:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="dotgrid-container">
            <div contenteditable="true" class="template-writing-area dotgrid-canvas-text">\(page.content ?? "")</div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">DOT GRID NOTEBOOK</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 9: Square Grid (src/templates/grid.js)

    private func generateGrid(page: Page, author: String, pageNum: Int) -> String {
        """
        <div class="a4-template-sheet grid-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>☵</span> GRID NOTEBOOK</div>
              \(renderSeal(author: author, sub: "GRID ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">SUBJECT / TOPIC:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="grid-container">
            <div contenteditable="true" class="template-writing-area grid-canvas-text">\(page.content ?? "")</div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">GRID NOTEBOOK</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Template 10: Blank Sheet (src/templates/blank.js)

    private func generateBlank(page: Page, author: String, pageNum: Int) -> String {
        """
        <div class="a4-template-sheet blank-template-sheet">
          <div class="punch-margin-line"></div>
          \(edgeNotchesHTML)
          \(royalCornersSVG)

          <div class="functional-header">
            <div class="header-top-meta">
              <div class="header-purpose-badge"><span>◻</span> BLANK SHEET</div>
              \(renderSeal(author: author, sub: "FREEFORM ARCHIVE"))
            </div>
            <div class="header-main-field">
              <span class="field-label">SUBJECT / TOPIC:</span>
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" />
              </div>
            </div>
          </div>

          <div class="blank-container">
            <div contenteditable="true" class="template-writing-area blank-canvas-text">\(page.content ?? "")</div>
          </div>

          <div class="scholar-footer">
            <span class="footer-left-tag">BLANK NOTEBOOK</span>
            <div class="footer-page-box">
              <span>PAGE</span>
              <span class="footer-page-line">\(pageNum)</span>
            </div>
          </div>
        </div>
        """
    }

    // MARK: - Helpers

    private func escapeHTML(_ str: String) -> String {
        str.replacingOccurrences(of: "&", with: "&amp;")
           .replacingOccurrences(of: "<", with: "&lt;")
           .replacingOccurrences(of: ">", with: "&gt;")
           .replacingOccurrences(of: "\"", with: "&quot;")
           .replacingOccurrences(of: "'", with: "&#39;")
    }

    private func escapeAttr(_ str: String) -> String {
        escapeHTML(str)
    }

    private func formatAuthorHandle(_ author: String?) -> String {
        guard let a = author?.trimmingCharacters(in: .whitespacesAndNewlines), !a.isEmpty, a != "Cá nhân" else {
            return "@thaonv"
        }
        return a.hasPrefix("@") ? a : "@\(a)"
    }

    // Fallback CSS if file not found in bundle
    private var defaultEmbeddedCSS: String {
        """
        :root {
          --paper-cream: #FAF6ED;
          --ink-primary: #0f172a;
          --rule-main: #94a3b8;
          --rule-accent: #1e293b;
          --ink-muted: #64748b;
          --notebook-font-size: 15px;
          --notebook-line-height: 28px;
          --notebook-lines-display: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--notebook-line-height, 28px) - 1px),
            #cbd5e1 calc(var(--notebook-line-height, 28px) - 1px),
            #cbd5e1 var(--notebook-line-height, 28px)
          );
          --notebook-font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }
        """
    }
}
