import { createElement } from '../utils/dom';

import { BlockElement, TextBlockContentChild } from '../index.type';
import { getBlockContent } from '../block/block-dom';
import { isWidgetElement } from '../decorator/decorator-dom';
import { isBoxWrapper, assert } from '../main';

export function removeBackgrounds(block: BlockElement) {
  const bgElem = block.querySelector(':scope >div[data-type=block-background]');
  if (bgElem) {
    Array.from(bgElem.children).forEach(child => child.remove());
  }
}

export function createBackgroundChild(background: HTMLElement, rect: DOMRect) {
  const bkgChild = createElement('div', ['background'], background);
  bkgChild.style.top = `${rect.top}px`;
  bkgChild.style.left = `${rect.left}px`;
  bkgChild.style.width = `${rect.width}px`;
  bkgChild.style.height = `${rect.height}px`;
  return bkgChild;
}

export function getBlockBackground(block: BlockElement) {
  let bgElem = block.querySelector(':scope >div[data-type=block-background]');
  if (!bgElem) {
    bgElem = createElement('div', [], block);
    bgElem.setAttribute('data-type', 'block-background');
  }
  return bgElem as HTMLElement;
}

export function getTextBlockContentChildTextLength(child: TextBlockContentChild) {
  if (child.firstChild instanceof HTMLBRElement) {
    return 0;
  }

  if (isBoxWrapper(child)) {
    return 1;
  }

  if (isWidgetElement(child)) {
    return 0;
  }

  assert(typeof child.textContent === 'string', 'invalid text content');
  return child.textContent?.length || 0;
}

export function getTextBlockContentChildren(block: BlockElement): TextBlockContentChild[] {
  const content = getBlockContent(block);
  const children = Array.from(content.children) as HTMLSpanElement[];

  // TODO: 会不会耗性能呢
  assert(
    children.every((child) => child instanceof HTMLSpanElement),
    'invalid text block content child'
  );
  // 可以加断言验证
  return children;
}

/**
 * 获取文本块的总长度
 */
export function getTextBlockLength(block: BlockElement): number {
  const children = getTextBlockContentChildren(block);
  let count = 0;
  children.forEach((child) => {
    count += getTextBlockContentChildTextLength(child);
  });
  return count;
}

export function isEmptyTextBlock(block: BlockElement) {
  const children = getTextBlockContentChildren(block);
  let len = 0;
  children.forEach((child) => {
    len += getTextBlockContentChildTextLength(child);
  });
  return len === 0;
}

