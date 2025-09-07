import { createElement } from '../utils/dom';
import { BlockElement } from '../index.type';

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

