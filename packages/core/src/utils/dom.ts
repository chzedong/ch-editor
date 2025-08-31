import { assert } from './assert';

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  classNames: string[],
  parent: Element | DocumentFragment | null
) {
  const tag = document.createElement<K>(tagName);
  for (const className of classNames) {
    tag.classList.add(className);
  }
  parent?.appendChild(tag);
  return tag;
}

export function addClass(dom: Element, ...className: string[]) {
  if (dom && dom.nodeType === Node.ELEMENT_NODE) {
    dom.classList.add(...className);
  }
}

export function createRange(node: Node, offset: number) {
  try {
    const range = document.createRange();
    range.setStart(node, offset);
    return range;
  } catch (error) {
    assert(false, 'failed to create range');
  }
}

export function createExpandedRange(startNode: Node, startOffset: number, endNode: Node, endOffset: number, injectRange?: Range) {
  try {
    const range = injectRange || document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch (err) {
    assert(
      false,
      `failed to create expanded range: ${startNode.childNodes.length}, ${startOffset}, ${endNode.childNodes.length}, ${endOffset}, ${
        (err as Error).message
      }`
    );
  }
}

export function getParentScrollContainer(dom: Element) {
  let parent = dom.parentElement;
  while (parent) {
    const computedStyle = window.getComputedStyle(parent);
    const overflowY = computedStyle.overflowY;
    const overflowX = computedStyle.overflowX;

    // 检查是否设置了滚动相关的overflow属性
    const hasScrollableOverflow = overflowY === 'scroll' || overflowY === 'auto' || overflowX === 'scroll' || overflowX === 'auto';

    // 如果设置了滚动属性，或者当前已经有滚动内容，则认为是滚动容器
    if (hasScrollableOverflow || parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
      return parent;
    }

    parent = parent.parentElement;
  }
  return null;
}
