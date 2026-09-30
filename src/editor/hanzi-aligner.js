/**
 * Hanzi & CJK Character Optical Alignment Engine
 *
 * Automatically detects CJK ideographs and applies `.hanzi-cjk`
 * wrapper with relative elevation (top: -4.5px) to achieve optical centering
 * inside notebook ruled lines while keeping Latin baselines touching the line.
 * Includes character-offset caret preservation for seamless typing.
 */

// Regex matching CJK Hanzi ideographs and standard Chinese punctuation marks
export const CJK_CHAR_REGEX = /([\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u2E80-\u2EFF\u3000-\u303F\uFF00-\uFFEF]+)/;

export function wrapHanziInHtml(html) {
  if (!html || typeof html !== 'string') return html;
  // Strip existing hanzi-cjk tags to avoid nesting
  html = html.replace(/<span class="hanzi-cjk">([\s\S]*?)<\/span>/gi, '$1');
  // Only wrap text outside of HTML tags
  return html.replace(/(<[^>]+>)|([\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u2E80-\u2EFF\u3000-\u303F\uFF00-\uFFEF]+)/g, (match, tag, cjk) => {
    if (tag) return tag;
    return `<span class="hanzi-cjk">${cjk}</span>`;
  });
}

export function getCaretCharacterOffsetWithin(element) {
  let caretOffset = 0;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

export function setCaretCharacterOffsetWithin(el, offset) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;
  let targetNode = null;
  let targetOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const len = node.nodeValue.length;
    if (currentOffset + len >= offset) {
      targetNode = node;
      targetOffset = offset - currentOffset;
      break;
    }
    currentOffset += len;
  }

  if (targetNode) {
    const range = document.createRange();
    range.setStart(targetNode, Math.min(targetOffset, targetNode.nodeValue.length));
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

export function wrapHanziInElement(container) {
  if (!container) return false;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !CJK_CHAR_REGEX.test(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement && node.parentElement.closest('.hanzi-cjk')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  if (textNodes.length === 0) return false;

  const hasFocus = document.activeElement === container || container.contains(document.activeElement);
  let savedOffset = hasFocus ? getCaretCharacterOffsetWithin(container) : null;

  for (const textNode of textNodes) {
    const parent = textNode.parentNode;
    if (!parent) continue;
    const parts = textNode.nodeValue.split(CJK_CHAR_REGEX);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (CJK_CHAR_REGEX.test(part)) {
        const span = document.createElement('span');
        span.className = 'hanzi-cjk';
        span.textContent = part;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    parent.replaceChild(frag, textNode);
  }

  if (hasFocus && savedOffset !== null) {
    setCaretCharacterOffsetWithin(container, savedOffset);
  }
  return true;
}
