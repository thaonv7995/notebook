import SwiftUI

/// Renders parsed HTML blocks into native SwiftUI views with typography and styling.
struct RichTextView: View {
    let blocks: [RichTextBlock]
    var customFontSize: CGFloat? = nil
    var customLineSpacing: CGFloat? = nil

    @ObservedObject private var settings = ReaderSettings.shared

    init(html: String?, customFontSize: CGFloat? = nil, customLineSpacing: CGFloat? = nil) {
        self.blocks = HTMLParser.shared.parseBlocks(from: html ?? "")
        self.customFontSize = customFontSize
        self.customLineSpacing = customLineSpacing
    }

    init(blocks: [RichTextBlock], customFontSize: CGFloat? = nil, customLineSpacing: CGFloat? = nil) {
        self.blocks = blocks
        self.customFontSize = customFontSize
        self.customLineSpacing = customLineSpacing
    }

    private var effectiveFontSize: CGFloat {
        customFontSize ?? CGFloat(settings.fontSize)
    }

    private var effectiveLineSpacing: CGFloat {
        customLineSpacing ?? CGFloat(settings.lineSpacing)
    }

    var body: some View {
        if blocks.isEmpty {
            Text("Không có nội dung")
                .font(settings.fontFamily.font(size: effectiveFontSize).italic())
                .foregroundStyle(settings.paperTone.secondaryColor.opacity(0.6))
                .padding(.vertical, DesignTokens.spacingSM)
        } else {
            VStack(alignment: .leading, spacing: DesignTokens.spacingMD) {
                ForEach(blocks) { block in
                    renderBlock(block)
                }
            }
        }
    }

    @ViewBuilder
    private func renderBlock(_ block: RichTextBlock) -> some View {
        switch block {
        case .heading(let level, let text):
            let size: CGFloat = {
                switch level {
                case 1: return effectiveFontSize * 1.5
                case 2: return effectiveFontSize * 1.3
                default: return effectiveFontSize * 1.15
                }
            }()
            Text(text)
                .font(settings.fontFamily.font(size: size, weight: .bold))
                .foregroundStyle(settings.paperTone.textColor)
                .padding(.top, DesignTokens.spacingXS)

        case .paragraph(let text):
            Text(text)
                .font(settings.fontFamily.font(size: effectiveFontSize))
                .lineSpacing(effectiveLineSpacing)
                .foregroundStyle(settings.paperTone.textColor)
                .fixedSize(horizontal: false, vertical: true)

        case .quote(let text):
            HStack(spacing: DesignTokens.spacingMD) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(DesignTokens.accentLight)
                    .frame(width: 4)

                Text(text)
                    .font(settings.fontFamily.font(size: effectiveFontSize).italic())
                    .lineSpacing(effectiveLineSpacing)
                    .foregroundStyle(settings.paperTone.textColor.opacity(0.9))
            }
            .padding(.vertical, DesignTokens.spacingXS)
            .padding(.horizontal, DesignTokens.spacingSM)
            .background(settings.paperTone.secondaryColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 6))

        case .codeBlock(let code):
            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(.system(size: effectiveFontSize - 2, weight: .regular, design: .monospaced))
                    .foregroundStyle(settings.paperTone.textColor)
                    .padding(DesignTokens.spacingMD)
            }
            .background(settings.paperTone.lineColor.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))

        case .listItem(let number, let text):
            HStack(alignment: .top, spacing: DesignTokens.spacingSM) {
                if let num = number {
                    Text("\(num).")
                        .font(settings.fontFamily.font(size: effectiveFontSize, weight: .semibold))
                        .foregroundStyle(DesignTokens.accentLight)
                        .frame(width: 24, alignment: .trailing)
                } else {
                    Text("•")
                        .font(settings.fontFamily.font(size: effectiveFontSize + 2, weight: .bold))
                        .foregroundStyle(DesignTokens.accentLight)
                        .frame(width: 16, alignment: .center)
                }

                Text(text)
                    .font(settings.fontFamily.font(size: effectiveFontSize))
                    .lineSpacing(effectiveLineSpacing)
                    .foregroundStyle(settings.paperTone.textColor)
                    .fixedSize(horizontal: false, vertical: true)
            }

        case .image(let data, let caption, _):
            VStack(alignment: .center, spacing: DesignTokens.spacingXS) {
                if let data = data, let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
                        .shadow(color: .black.opacity(0.08), radius: 6, y: 2)
                }

                if let caption = caption, !caption.isEmpty {
                    Text(caption)
                        .font(.jakartaSans(size: DesignTokens.fontSizeBadge).italic())
                        .foregroundStyle(settings.paperTone.secondaryColor)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.spacingSM)

        case .divider:
            Divider()
                .overlay(settings.paperTone.lineColor)
                .padding(.vertical, DesignTokens.spacingSM)
        }
    }
}

#Preview {
    VStack {
        RichTextView(html: "<h2>Tiêu đề bài viết</h2><p>Đây là <b>văn bản in đậm</b> và <i>in nghiêng</i>.</p><blockquote>Trích dẫn đáng chú ý</blockquote><ul><li>Mục thứ nhất</li><li>Mục thứ hai</li></ul>")
            .padding()
    }
}
