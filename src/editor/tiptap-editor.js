import { Editor, Mark, nodeInputRule, markInputRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

// Custom Underline with Markdown serialization
const CustomUnderline = Underline.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open() {
            return "<u>";
          },
          close() {
            return "</u>";
          }
        }
      }
    };
  }
});

// Custom Text Color Mark
const CustomTextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.style.color || el.getAttribute("data-color") || null,
        renderHTML: (attrs) => {
          if (!attrs.color) return {};
          return {
            style: `color: ${attrs.color}`,
            "data-color": attrs.color
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-color]",
        getAttrs: (el) => ({ color: el.getAttribute("data-color") })
      },
      {
        tag: "span[style*='color']",
        getAttrs: (el) => ({ color: el.style.color })
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setTextColor: (color) => ({ chain }) => {
        return chain().setMark(this.name, { color }).run();
      },
      unsetTextColor: () => ({ chain }) => {
        return chain().unsetMark(this.name).run();
      }
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state, mark) {
            return `<span style="color: ${mark.attrs.color}">`;
          },
          close() {
            return "</span>";
          }
        }
      }
    };
  }
});

// Custom Text Background / Highlighter Mark
const CustomTextBg = Mark.create({
  name: "textBg",
  addAttributes() {
    return {
      bg: {
        default: null,
        parseHTML: (el) => el.style.backgroundColor || el.getAttribute("data-bg") || null,
        renderHTML: (attrs) => {
          if (!attrs.bg) return {};
          return {
            style: `background-color: ${attrs.bg}`,
            "data-bg": attrs.bg
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "mark[data-bg]",
        getAttrs: (el) => ({ bg: el.getAttribute("data-bg") })
      },
      {
        tag: "mark",
        getAttrs: (el) => ({ bg: el.style.backgroundColor || "#fef08a" })
      },
      {
        tag: "span[data-bg]",
        getAttrs: (el) => ({ bg: el.getAttribute("data-bg") })
      },
      {
        tag: "span[style*='background']",
        getAttrs: (el) => ({ bg: el.style.backgroundColor })
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setTextBg: (bg) => ({ chain }) => {
        return chain().setMark(this.name, { bg }).run();
      },
      unsetTextBg: () => ({ chain }) => {
        return chain().unsetMark(this.name).run();
      }
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state, mark) {
            return `<mark style="background-color: ${mark.attrs.bg}">`;
          },
          close() {
            return "</mark>";
          }
        }
      }
    };
  }
});

// Custom Text Badge (Pill Border)
const CustomTextBadge = Mark.create({
  name: "textBadge",
  addAttributes() {
    return {
      badge: {
        default: "true",
        parseHTML: (el) => el.getAttribute("data-badge") || "true",
        renderHTML: () => ({
          "data-badge": "true",
          class: "badge-pill"
        })
      }
    };
  },
  parseHTML() {
    return [
      { tag: "span[data-badge]" },
      { tag: "span.badge-pill" }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
  addCommands() {
    return {
      toggleTextBadge: () => ({ chain }) => {
        return chain().toggleMark(this.name).run();
      }
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize: {
          open() {
            return `<span class="badge-pill" data-badge="true">`;
          },
          close() {
            return "</span>";
          }
        }
      }
    };
  }
});

// Custom Image with Markdown Input Rule
const CustomImage = Image.extend({
  addInputRules() {
    return [
      nodeInputRule({
        find: /!\[(.*?)\]\((.+?)\)$/,
        type: this.type,
        getAttributes: (match) => {
          const [, alt, src] = match;
          return { src, alt };
        }
      })
    ];
  }
});

// Custom Link with Markdown Input Rule
const CustomLink = Link.extend({
  addInputRules() {
    return [
      markInputRule({
        find: /(?<!!)\[(.*?)\]\((.+?)\)$/,
        type: this.type,
        getAttributes: (match) => {
          const [, , href] = match;
          return { href };
        }
      })
    ];
  }
});

/**
 * Factory to create a fully configured Tiptap Markdown editor instance
 */
export function createNotebookEditor({
  element,
  initialContent = "",
  onUpdate = () => {},
  onSelectionUpdate = () => {},
  onFocus = () => {},
  onBlur = () => {}
}) {
  const codeBlockExtension = CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: "javascript"
  });

  const extensions = [
    StarterKit.configure({
      codeBlock: false
    }),
    codeBlockExtension,
    CustomUnderline,
    CustomTextColor,
    CustomTextBg,
    CustomTextBadge,
    CustomImage,
    CustomLink.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: false
    }),
    Markdown
  ];

  return new Editor({
    element,
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: "markdown-preview",
        spellcheck: "true",
        "aria-label": "Trang ghi chú số"
      }
    },
    onUpdate({ editor }) {
      const markdown = editor.storage.markdown.getMarkdown();
      onUpdate(markdown, editor);
    },
    onSelectionUpdate({ editor }) {
      onSelectionUpdate(editor);
    },
    onFocus({ editor }) {
      onFocus(editor);
    },
    onBlur({ editor }) {
      onBlur(editor);
    }
  });
}
