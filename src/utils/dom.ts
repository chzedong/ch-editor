import { assert } from './assert';

export function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, classNames: string[], parent: Element | DocumentFragment | null) {
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


export function createExpandedRange(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
  try {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch (err) {

    assert(false, `failed to create expanded range: ${startNode.childNodes.length}, ${startOffset}, ${endNode.childNodes.length}, ${endOffset}, ${(err as Error).message}`);
  }
}