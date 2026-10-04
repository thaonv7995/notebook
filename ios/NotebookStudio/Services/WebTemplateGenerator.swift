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
        fontSize: Int = 15,
        fontFamily: String? = nil,
        isEditable: Bool = false
    ) -> String {
        let css = getCombinedCSS()
        let authorHandle = formatAuthorHandle(author)
        let templateContent = generateTemplateBody(for: page, authorHandle: authorHandle, pageNum: pageNum, isEditable: isEditable)
        let resolvedFontFamilyCSS = cssFontFamily(for: fontFamily)

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
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600;700;900&family=Dancing+Script:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Patrick+Hand&family=Kalam:wght@300;400;700&family=Indie+Flower&family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
          <style>
            \(css)

            /* Auto-Enlarging CJK / Chinese Character Font Face */
            @font-face {
              font-family: 'CJK-Smart-Enlarged';
              src: local('Kaiti SC'), local('STKaiti'), local('KaiTi'), local('SimKai'),
                   local('KaiTi_GB2312'), local('BiauKai'),
                   local('Songti SC'), local('STSong');
              unicode-range: U+2E80-2EFF, U+2F00-2FDF, U+3000-303F, U+3100-312F,
                             U+31C0-31EF, U+3200-32FF, U+3400-4DBF, U+4E00-9FFF,
                             U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF;
              size-adjust: 140%;
              font-display: swap;
            }

            :root {
              --paper-cream: \(bgHex);
              --ink-primary: \(textHex);
              --rule-main: \(lineHex);
              --rule-accent: \(textHex);
              --ink-muted: \(secondaryHex);
              --notebook-font-size: \(fontSize)px;
              --cjk-calligraphic-font: "CJK-Smart-Enlarged", "Kaiti SC", "STKaiti", "KaiTi", "SimKai", "KaiTi_GB2312", "BiauKai", "Ma Shan Zheng", "Noto Serif SC", "Songti SC", "STSong", serif;
              --notebook-font-family: \(resolvedFontFamilyCSS);
            }

            /* Chinese / Hanzi character optical alignment & calligraphic stroke contrast */
            .hanzi-cjk {
              display: inline;
              position: relative;
              top: -2px;
              font-family: 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', 'ZCOOL XiaoWei', 'Kaiti SC', 'Songti SC', serif;
              font-size: 1.15em;
              font-weight: 500;
              line-height: 1;
            }

            .template-writing-area {
              font-family: var(--notebook-font-family);
            }

            .template-writing-area div {
              line-height: var(--notebook-line-height, 28px);
              min-height: var(--notebook-line-height, 28px);
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

            /* Desktop / iPad Floating Sheet (> 640px) */
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

            /* --- Mobile Full-Bleed Reading Experience (<= 640px) --- */
            @media (max-width: 640px) {
              html, body {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                min-height: 100% !important;
                overflow-x: hidden !important;
                background: transparent !important;
              }

              .book-desk-scaler {
                width: 100% !important;
                max-width: 100% !important;
                min-height: 100vh !important;
                margin: 0 !important;
                transform: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }

              .a4-template-sheet {
                width: 100% !important;
                max-width: 100% !important;
                min-height: 100vh !important;
                margin: 0 !important;
                padding: 16px 14px 28px 16px !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }

              /* Hide punch margin line and edge notches on phone so the page has maximum usable reading space */
              .punch-margin-line,
              .edge-index-markers {
                display: none !important;
              }

              /* Ruled lines and writing area typography on mobile */
              .template-writing-area {
                font-size: var(--notebook-font-size, 16px) !important;
              }

              .template-writing-area div {
                min-height: 30px !important;
                line-height: 30px !important;
              }
            }

            /* --- Reading Mode Optimization --- */
            body.reading-mode {
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              user-select: none !important;
            }

            body.reading-mode input,
            body.reading-mode textarea {
              pointer-events: none !important;
              -webkit-user-select: none !important;
              user-select: none !important;
              cursor: default !important;
            }

            body.reading-mode .template-writing-area {
              cursor: default !important;
              outline: none !important;
              -webkit-user-select: text !important;
              user-select: text !important;
            }

            body.reading-mode .action-check-square,
            body.reading-mode .status-pill-btn {
              pointer-events: none !important;
              cursor: default !important;
            }

            /* --- Editing Mode Styling --- */
            body.editing-mode .template-writing-area {
              outline: 1px dashed rgba(217, 119, 6, 0.4);
              outline-offset: 4px;
              border-radius: 3px;
              cursor: text;
              min-height: 28px;
            }

            body.editing-mode .template-writing-area:focus {
              outline: 2px solid #D97706;
              background: rgba(217, 119, 6, 0.05);
            }

            body.editing-mode input.field-underline-input:focus,
            body.editing-mode input.sub-field-input:focus,
            body.editing-mode input.action-line-input:focus {
              border-bottom-color: #D97706 !important;
              outline: none !important;
            }
          </style>
          <script>
            function fitScale() {
              var w = window.innerWidth;
              var scaler = document.getElementById('sheetContainer');
              if (!scaler) return;
              if (w <= 640) {
                // Mobile phone mode: full bleed, 1:1 true point size
                scaler.style.transform = 'none';
                scaler.style.marginBottom = '0px';
              } else {
                // iPad / Desktop mode: scale authentic A4 sheet to fit desk
                var scale = Math.min((w - 16) / 660, 1.0);
                scaler.style.transform = 'scale(' + scale + ')';
                scaler.style.marginBottom = (820 * (scale - 1)) + 'px';
              }
            }
            window.addEventListener('resize', fitScale);
            window.addEventListener('DOMContentLoaded', fitScale);
            setTimeout(fitScale, 50);

            // Dynamic CJK / Hanzi Auto-aligner for interactive typing
            var CJK_REGEX = /([\\u4E00-\\u9FFF\\u3400-\\u4DBF\\uF900-\\uFAFF\\u2E80-\\u2EFF\\u3000-\\u303F\\uFF00-\\uFFEF]+)/;
            function wrapHanziInContainer(container) {
              if (!container) return;
              var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
                acceptNode: function(node) {
                  if (!node.nodeValue || !CJK_REGEX.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
                  if (node.parentElement && node.parentElement.closest('.hanzi-cjk')) return NodeFilter.FILTER_REJECT;
                  return NodeFilter.FILTER_ACCEPT;
                }
              });
              var textNodes = [];
              while (walker.nextNode()) textNodes.push(walker.currentNode);
              if (textNodes.length === 0) return;
              textNodes.forEach(function(node) {
                var parent = node.parentNode;
                if (!parent) return;
                var parts = node.nodeValue.split(CJK_REGEX);
                var frag = document.createDocumentFragment();
                parts.forEach(function(part) {
                  if (!part) return;
                  if (CJK_REGEX.test(part)) {
                    var span = document.createElement('span');
                    span.className = 'hanzi-cjk';
                    span.textContent = part;
                    frag.appendChild(span);
                  } else {
                    frag.appendChild(document.createTextNode(part));
                  }
                });
                parent.replaceChild(frag, node);
              });
            }

            document.addEventListener('input', function(e) {
              if (e.target && e.target.classList.contains('template-writing-area')) {
                wrapHanziInContainer(e.target);
              }
            });

            // Interactive handlers & Tap-to-Toggle Chrome
            document.addEventListener('click', function(e) {
              var isEdit = \(isEditable ? "true" : "false");
              if (isEdit) {
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
                  return;
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
                  return;
                }
              } else {
                // Reading mode: tap anywhere to toggle chrome
                if (window.getSelection && window.getSelection().toString().length > 0) return;
                if (e.target.closest('a') || e.target.closest('button')) return;
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.notebookReader) {
                  window.webkit.messageHandlers.notebookReader.postMessage({ type: 'toggleChrome' });
                }
              }
            });
          </script>
        </head>
        <body class="\(isEditable ? "editing-mode" : "reading-mode")">
          <div class="book-desk-scaler" id="sheetContainer">
            \(templateContent)
          </div>
        </body>
        </html>
        """
    }

    // MARK: - Template HTML Dispatcher

    private func generateTemplateBody(for page: Page, authorHandle: String, pageNum: Int, isEditable: Bool) -> String {
        switch page.template {
        case .cornell:
            return generateCornell(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .work:
            return generateWork(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .ruled:
            return generateRuled(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .vocab:
            return generateVocab(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .charting:
            return generateCharting(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .reading:
            return generateReading(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .dotgrid:
            return generateDotGrid(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .grid:
            return generateGrid(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .blank:
            return generateBlank(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        case .quadrant:
            return generateEisenhower(page: page, author: authorHandle, pageNum: pageNum, isEditable: isEditable)
        }
    }

    private func edAttr(_ isEditable: Bool) -> String {
        isEditable ? "contenteditable=\"true\"" : "contenteditable=\"false\""
    }

    private func roAttr(_ isEditable: Bool) -> String {
        isEditable ? "" : "readonly tabindex=\"-1\""
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

    private func generateCornell(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="cornell-container">
            <div class="cornell-body-split">
              <div class="cornell-cue-col">
                <div class="col-guide-bar"><span class="section-guide-badge">CUES & QUESTIONS</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area cornell-cues-text">\(formatContentToHtml(page.cues))</div>
              </div>
              <div class="cornell-notes-col">
                <div class="col-guide-bar"><span class="section-guide-badge">NOTES</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area cornell-notes-text">\(formatContentToHtml((page.notes?.isEmpty ?? true) ? page.content : page.notes))</div>
              </div>
            </div>
            <div class="cornell-summary-area">
              <div class="col-guide-bar"><span class="section-guide-badge">SUMMARY & SYNTHESIS</span></div>
              <div \(edAttr(isEditable)) class="template-writing-area cornell-summary-text">\(formatContentToHtml(page.summary))</div>
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

    private func generateWork(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
        let storedActions = page.actions ?? []
        var actions = storedActions.map { ActionItem(checked: $0.checked, text: $0.text) }
        while actions.count < 5 {
            actions.append(ActionItem(checked: false, text: ""))
        }

        let actionRowsHtml = actions.enumerated().map { idx, act in
            """
            <div class="action-row" data-idx="\(idx)">
              <button type="button" class="action-check-square \(act.checked ? "checked" : "")" data-idx="\(idx)" title="Đánh dấu hoàn thành" \(isEditable ? "" : "disabled")></button>
              \(idx == 0 ? "<span class=\"section-guide-badge\" style=\"position: static; margin-right: 4px;\">ACTION ITEMS & NEXT STEPS</span>" : "")
              <input type="text" class="action-line-input \(act.checked ? "done-line" : "")" data-idx="\(idx)" value="\(escapeAttr(act.text))" \(roAttr(isEditable)) />
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
              <input type="text" class="field-underline-input project-input" value="\(escapeAttr(page.project ?? page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 75px;" \(roAttr(isEditable)) />
                <span style="font-weight: 700; margin-left: 6px;">DEADLINE:</span>
                <input type="text" class="sub-field-input deadline-input" value="\(escapeAttr(page.deadline ?? ""))" style="width: 75px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">STATUS:</span>
                <div class="status-pills">
                  <button type="button" class="status-pill-btn \(currentStatus == "TODO" ? "active-todo" : "")" data-status="TODO" \(isEditable ? "" : "disabled")>[ ] TODO</button>
                  <button type="button" class="status-pill-btn \(currentStatus == "WIP" ? "active-wip" : "")" data-status="WIP" \(isEditable ? "" : "disabled")>[ ] WIP</button>
                  <button type="button" class="status-pill-btn \(currentStatus == "DONE" ? "active-done" : "")" data-status="DONE" \(isEditable ? "" : "disabled")>[✓] DONE</button>
                </div>
              </div>
            </div>
          </div>

          <div class="work-container">
            <div class="work-body-split">
              <div class="work-side-col">
                <div class="col-guide-bar"><span class="section-guide-badge">AGENDA & DECISIONS</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area work-agenda-text">\(formatContentToHtml(page.agenda))</div>
              </div>
              <div class="work-notes-col">
                <div class="col-guide-bar"><span class="section-guide-badge">NOTES & DISCUSSIONS</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area work-notes-text">\(formatContentToHtml((page.discussions?.isEmpty ?? true) ? page.content : page.discussions))</div>
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

    private func generateRuled(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="ruled-full-canvas">
            <div \(edAttr(isEditable)) class="template-writing-area ruled-canvas-text">\(formatContentToHtml(page.content))</div>
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

    private func generateEisenhower(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
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
                <div \(edAttr(isEditable)) class="template-writing-area quadrant-text quadrant-q1-text">\(formatContentToHtml(q.q1))</div>
              </div>
              <div class="quadrant-cell quadrant-tr eisenhower-schedule">
                <div class="col-guide-bar eisenhower-bar schedule-bar"><span class="section-guide-badge eisenhower-badge schedule-badge">🟡 SCHEDULE — Important, Not Urgent</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area quadrant-text quadrant-q2-text">\(formatContentToHtml(q.q2))</div>
              </div>
            </div>
            <div class="quadrant-row">
              <div class="quadrant-cell quadrant-bl eisenhower-delegate">
                <div class="col-guide-bar eisenhower-bar delegate-bar"><span class="section-guide-badge eisenhower-badge delegate-badge">🟠 DELEGATE — Urgent, Not Important</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area quadrant-text quadrant-q3-text">\(formatContentToHtml(q.q3))</div>
              </div>
              <div class="quadrant-cell quadrant-br eisenhower-eliminate">
                <div class="col-guide-bar eisenhower-bar eliminate-bar"><span class="section-guide-badge eisenhower-badge eliminate-badge">⚪ ELIMINATE — Not Urgent, Not Important</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area quadrant-text quadrant-q4-text">\(formatContentToHtml(q.q4))</div>
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

    private func generateVocab(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="vocab-container">
            <div class="vocab-body-split">
              <div class="vocab-word-col">
                <div class="col-guide-bar"><span class="section-guide-badge">WORD / PHRASE</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area vocab-word-text">\(formatContentToHtml(page.vocabWord))</div>
              </div>
              <div class="vocab-meaning-col">
                <div class="col-guide-bar"><span class="section-guide-badge">MEANING · PRONUNCIATION</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area vocab-meaning-text">\(formatContentToHtml(page.vocabMeaning))</div>
              </div>
              <div class="vocab-example-col">
                <div class="col-guide-bar"><span class="section-guide-badge">EXAMPLE SENTENCE</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area vocab-example-text">\(formatContentToHtml((page.vocabExample?.isEmpty ?? true) ? page.content : page.vocabExample))</div>
              </div>
            </div>
            <div class="vocab-review-area">
              <div class="col-guide-bar"><span class="section-guide-badge">REVIEW NOTES · MEMORY TIPS</span></div>
              <div \(edAttr(isEditable)) class="template-writing-area vocab-review-text">\(formatContentToHtml(page.vocabReview))</div>
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

    private func generateReading(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">CH.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="reading-container">
            <div class="reading-body-split">
              <div class="reading-ideas-col">
                <div class="col-guide-bar"><span class="section-guide-badge">KEY IDEAS & TAKEAWAYS</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area reading-ideas-text">\(formatContentToHtml(page.cues))</div>
              </div>
              <div class="reading-quotes-col">
                <div class="col-guide-bar"><span class="section-guide-badge">QUOTES & HIGHLIGHTS</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area reading-quotes-text">\(formatContentToHtml((page.notes?.isEmpty ?? true) ? page.content : page.notes))</div>
              </div>
            </div>
            <div class="reading-summary-area">
              <div class="col-guide-bar"><span class="section-guide-badge">SUMMARY & PERSONAL REFLECTION</span></div>
              <div \(edAttr(isEditable)) class="template-writing-area reading-summary-text">\(formatContentToHtml(page.summary))</div>
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

    private func generateCharting(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="charting-container">
            <div class="charting-columns">
              <div class="charting-col">
                <div class="col-guide-bar"><span class="section-guide-badge">COLUMN A</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area charting-col1-text">\(formatContentToHtml(chart.col1))</div>
              </div>
              <div class="charting-col">
                <div class="col-guide-bar"><span class="section-guide-badge">COLUMN B</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area charting-col2-text">\(formatContentToHtml(chart.col2))</div>
              </div>
              <div class="charting-col charting-col-last">
                <div class="col-guide-bar"><span class="section-guide-badge">COLUMN C</span></div>
                <div \(edAttr(isEditable)) class="template-writing-area charting-col3-text">\(formatContentToHtml(chart.col3))</div>
              </div>
            </div>
            <div class="charting-notes-area">
              <div class="col-guide-bar"><span class="section-guide-badge">ANALYSIS & CONCLUSIONS</span></div>
              <div \(edAttr(isEditable)) class="template-writing-area charting-notes-text">\(formatContentToHtml((page.summary?.isEmpty ?? true) ? page.content : page.summary))</div>
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

    private func generateDotGrid(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="dotgrid-container">
            <div \(edAttr(isEditable)) class="template-writing-area dotgrid-canvas-text">\(formatContentToHtml(page.content))</div>
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

    private func generateGrid(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="grid-container">
            <div \(edAttr(isEditable)) class="template-writing-area grid-canvas-text">\(formatContentToHtml(page.content))</div>
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

    private func generateBlank(page: Page, author: String, pageNum: Int, isEditable: Bool) -> String {
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
              <input type="text" class="field-underline-input topic-input" value="\(escapeAttr(page.topic ?? page.title ?? ""))" \(roAttr(isEditable)) />
            </div>
            <div class="header-sub-fields">
              <div class="sub-field-group">
                <span style="font-weight: 700;">DATE:</span>
                <input type="text" class="sub-field-input date-input" value="\(escapeAttr(page.date ?? ""))" style="width: 80px;" \(roAttr(isEditable)) />
              </div>
              <div class="sub-field-group">
                <span style="font-weight: 700;">NO.</span>
                <input type="text" class="sub-field-input no-input" value="\(escapeAttr(page.no ?? String(format: "%02d", pageNum)))" style="width: 45px;" \(roAttr(isEditable)) />
              </div>
            </div>
          </div>

          <div class="blank-container">
            <div \(edAttr(isEditable)) class="template-writing-area blank-canvas-text">\(formatContentToHtml(page.content))</div>
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

    // MARK: - CJK Optical Alignment & Text Formatting (matching src/editor/hanzi-aligner.js & sanitizer.js)

    /// Wraps Chinese / CJK ideographs in `<span class="hanzi-cjk">` for optical centering and calligraphic rendering.
    func wrapHanziInHtml(_ html: String) -> String {
        guard !html.isEmpty else { return "" }

        // Strip existing hanzi-cjk tags to avoid nested spans
        let cleaned = html.replacingOccurrences(
            of: #"<span class="hanzi-cjk">([\s\S]*?)</span>"#,
            with: "$1",
            options: .regularExpression
        )

        let pattern = #"(<[^>]+>)|([\u{4E00}-\u{9FFF}\u{3400}-\u{4DBF}\u{F900}-\u{FAFF}\u{2E80}-\u{2EFF}\u{3000}-\u{303F}\u{FF00}-\u{FFEF}]+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return cleaned
        }

        let nsString = cleaned as NSString
        let matches = regex.matches(in: cleaned, options: [], range: NSRange(location: 0, length: nsString.length))

        var result = ""
        var lastIndex = 0

        for match in matches {
            if match.range.location > lastIndex {
                result += nsString.substring(with: NSRange(location: lastIndex, length: match.range.location - lastIndex))
            }

            let tagRange = match.range(at: 1)
            let cjkRange = match.range(at: 2)

            if tagRange.location != NSNotFound {
                result += nsString.substring(with: tagRange)
            } else if cjkRange.location != NSNotFound {
                let cjkText = nsString.substring(with: cjkRange)
                result += "<span class=\"hanzi-cjk\">\(cjkText)</span>"
            }

            lastIndex = match.range.location + match.range.length
        }

        if lastIndex < nsString.length {
            result += nsString.substring(with: NSRange(location: lastIndex, length: nsString.length - lastIndex))
        }

        return result
    }

    /// Formats content to block HTML elements on ruled lines with Hanzi CJK optical elevation.
    func formatContentToHtml(_ raw: String?) -> String {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
            return ""
        }

        var html = raw

        // Decode accidentally escaped markup
        html = html.replacingOccurrences(of: "&lt;strong&gt;", with: "<strong>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;/strong&gt;", with: "</strong>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;b&gt;", with: "<b>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;/b&gt;", with: "</b>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;i&gt;", with: "<i>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;/i&gt;", with: "</i>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;em&gt;", with: "<em>", options: .caseInsensitive)
        html = html.replacingOccurrences(of: "&lt;/em&gt;", with: "</em>", options: .caseInsensitive)

        // Check if content already contains block elements (preformatted rich text)
        let blockTagPattern = #"<(p|div|blockquote|ul|ol|h[1-6]|figure|img)[^>]*>"#
        if html.range(of: blockTagPattern, options: .regularExpression) != nil {
            return wrapHanziInHtml(html)
        }

        // Process line-by-line for ruled notebook lines
        let rawLines = html.components(separatedBy: "\n")
        var processedLines: [String] = []

        for rawLine in rawLines {
            var line = rawLine

            // Markdown inline
            line = line.replacingOccurrences(of: #"\*\*(.+?)\*\*"#, with: "<strong>$1</strong>", options: .regularExpression)
            line = line.replacingOccurrences(of: "**", with: "")
            line = line.replacingOccurrences(of: #"(^|[^\*])\*([^\*\n]+)\*([^\*]|$)"#, with: "$1<em>$2</em>$3", options: .regularExpression)
            line = line.replacingOccurrences(of: #"~~(.+?)~~"#, with: "<s>$1</s>", options: .regularExpression)
            line = line.replacingOccurrences(of: #"`([^`]+)`"#, with: "<code>$1</code>", options: .regularExpression)

            // Block levels
            if line.range(of: #"^###\s+"#, options: .regularExpression) != nil {
                line = line.replacingOccurrences(of: #"^###\s+(.*)$"#, with: "<h3>$1</h3>", options: .regularExpression)
                processedLines.append(line)
            } else if line.range(of: #"^##?\s+"#, options: .regularExpression) != nil {
                line = line.replacingOccurrences(of: #"^##?\s+(.*)$"#, with: "<h2>$1</h2>", options: .regularExpression)
                processedLines.append(line)
            } else if line.range(of: #"^>\s+"#, options: .regularExpression) != nil {
                line = line.replacingOccurrences(of: #"^>\s+(.*)$"#, with: "<blockquote>$1</blockquote>", options: .regularExpression)
                processedLines.append(line)
            } else if line.range(of: #"^([-\*]|\•)\s+"#, options: .regularExpression) != nil {
                line = line.replacingOccurrences(of: #"^([-\*]|\•)\s+(.*)$"#, with: "<div>• $2</div>", options: .regularExpression)
                processedLines.append(line)
            } else if line.range(of: #"^\d+[\.\)]\s+"#, options: .regularExpression) != nil {
                processedLines.append("<div>\(line)</div>")
            } else {
                let content = line.isEmpty ? "<br>" : line
                processedLines.append("<div>\(content)</div>")
            }
        }

        let combined = processedLines.joined()
        return wrapHanziInHtml(combined)
    }

    /// Resolves CSS font stack matching `src/config/constants.js`.
    func cssFontFamily(for key: String?) -> String {
        switch key?.lowercased() {
        case "vietnam":
            return "'CJK-Smart-Enlarged', 'Be Vietnam Pro', 'Noto Serif SC', 'Ma Shan Zheng', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, serif"
        case "serif":
            return "'CJK-Smart-Enlarged', 'Cormorant Garamond', 'Noto Serif SC', 'Ma Shan Zheng', Georgia, serif"
        case "kaiti":
            return "'CJK-Smart-Enlarged', 'Kaiti SC', 'STKaiti', 'KaiTi', 'SimKai', 'Ma Shan Zheng', 'Noto Serif SC', 'ZCOOL XiaoWei', serif"
        case "mono", "monospace":
            return "'JetBrains Mono', 'CJK-Smart-Enlarged', 'Noto Serif SC', 'Ma Shan Zheng', 'Courier New', monospace"
        case "dancing":
            return "'Dancing Script', 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', cursive"
        case "caveat":
            return "'Caveat', 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', cursive"
        case "patrickhand":
            return "'Patrick Hand', 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', cursive"
        case "kalam":
            return "'Kalam', 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', cursive"
        case "indieflower":
            return "'Indie Flower', 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', cursive"
        case "sans", "jakarta":
            fallthrough
        default:
            return "'CJK-Smart-Enlarged', 'Plus Jakarta Sans', 'Noto Serif SC', 'Ma Shan Zheng', var(--cjk-calligraphic-font)"
        }
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
          --cjk-calligraphic-font: "CJK-Smart-Enlarged", "Kaiti SC", "STKaiti", "KaiTi", "SimKai", "KaiTi_GB2312", "BiauKai", "Ma Shan Zheng", "Noto Serif SC", "Songti SC", "STSong", serif;
          --notebook-font-family: 'CJK-Smart-Enlarged', 'Plus Jakarta Sans', 'Noto Serif SC', 'Ma Shan Zheng', var(--cjk-calligraphic-font);
        }
        .hanzi-cjk {
          display: inline;
          position: relative;
          top: -2px;
          font-family: 'CJK-Smart-Enlarged', 'Ma Shan Zheng', 'Noto Serif SC', 'ZCOOL XiaoWei', 'Kaiti SC', 'Songti SC', serif;
          font-size: 1.15em;
          font-weight: 500;
          line-height: 1;
        }
        """
    }
}
