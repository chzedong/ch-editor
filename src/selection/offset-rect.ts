import { getBlockContent } from "../block/block-dom";
import { assert } from "../utils/assert";
import { createRange } from "../utils/dom";
import { EditorBlockPosition } from "./block-position";

export function getTextBlockContentChildren(block: HTMLElement) {
  const content = getBlockContent(block);
  const children = Array.from(content.children);
  // 可以加断言验证
  return children;
}

export function getBlockRangeInfo(block: HTMLElement, blockOffset: number) {
  const children = getTextBlockContentChildren(block);
  let start = 0;

  const getChildRange = (child: Element, offset: number) => {
    return { child, container: child.firstChild, offset };
  };
  //
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    //
    const childLength = child.textContent?.length ?? 0;
    if (blockOffset === start) {
      return [getChildRange(child, 0)];
    }
    if (blockOffset <= start + childLength) {
      return [getChildRange(child, blockOffset - start)];
    }
    // 处理非折叠场景

    start += childLength;
  }

  assert(false, "failed");
}

export function getTextCaretRect(block: HTMLElement, pos: EditorBlockPosition) {
  const ranges = getBlockRangeInfo(block, pos.offset);
  let rangeInfo = ranges[0];

  if (rangeInfo.container instanceof HTMLBRElement) {
    const parent = rangeInfo.container.parentElement?.parentElement;
    assert(parent === getBlockContent(block), "invalid br parent");
    const rect = parent.getBoundingClientRect();
    return new DOMRect(rect.left, rect.top, 1, rect.height);
  }

  const range = createRange(rangeInfo.container!, rangeInfo.offset);
  const rects = range.getClientRects();
  return rects[0];
}

export function getNodeOffsetFromPoint(node: Text, x: number, y: number) {
  const range = document.createRange();
  for (let i = 0; i < node.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.left <= x &&
      rect.right >= x &&
      rect.top <= y &&
      rect.bottom >= y) {
      return i;
    }
  }

  return 0;
} 


